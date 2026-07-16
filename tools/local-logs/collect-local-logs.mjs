#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const DEFAULT_CONFIG_FILE = 'tools/local-logs/local-log-collector.config.json';
const DEFAULT_LOG_FILE = 'logs/blockout-local.log';
const DEFAULT_MAX_LINES = 10000;

const workspaceRoot = process.cwd();
const cli = parseCli(process.argv.slice(2));

if (cli.help) {
  printUsage();
  process.exit(0);
}

try {
  const runtimeConfig = cli.command
    ? fromWrappedCommand(cli)
    : await fromConfigFile(cli);
  await run(runtimeConfig);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

async function run(runtimeConfig) {
  const logFile = resolveWorkspacePath(runtimeConfig.logFile);
  const maxLines = runtimeConfig.maxLines;
  const compactionBufferLines = Math.min(
    1000,
    Math.max(1, Math.ceil(maxLines * 0.1)),
  );
  const services = runtimeConfig.services.filter(
    (service) => service.enabled !== false,
  );

  if (services.length === 0) {
    throw new Error('No local services are configured for log collection.');
  }

  const logLines = await readExistingLines(logFile, maxLines);
  await persistLogLines(logFile, logLines);

  let writeQueue = Promise.resolve();
  let shuttingDown = false;
  let exitCode = 0;

  const appendRecord = (record) => {
    const line = JSON.stringify(sanitizeRecord(record));

    writeQueue = writeQueue.then(async () => {
      logLines.push(line);
      await appendLogLine(logFile, line);

      if (logLines.length >= maxLines + compactionBufferLines) {
        logLines.splice(0, logLines.length - maxLines);
        await persistLogLines(logFile, logLines);
      }
    });

    writeQueue = writeQueue.catch((error) => {
      process.stderr.write(
        `Failed to write local log file: ${error.message}\n`,
      );
    });
  };

  const childProcesses = services.map((service) =>
    startService(service, runtimeConfig.quiet, appendRecord, (code) => {
      if (code !== 0) {
        exitCode = code ?? 1;
      }
    }),
  );

  const stopChildren = (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    for (const childProcess of childProcesses) {
      if (!childProcess.killed) {
        childProcess.kill(signal);
      }
    }
  };

  process.once('SIGINT', () => stopChildren('SIGINT'));
  process.once('SIGTERM', () => stopChildren('SIGTERM'));

  await Promise.all(childProcesses.map((childProcess) => childProcess.closed));
  await writeQueue;
  process.exitCode = exitCode;
}

function startService(service, quiet, appendRecord, onExit) {
  const childProcess = spawn(service.command, service.args ?? [], {
    cwd: service.cwd ? resolveWorkspacePath(service.cwd) : workspaceRoot,
    env: {
      ...process.env,
      ...(service.env ?? {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdoutHandler = createLineHandler(
    service.name,
    'stdout',
    quiet,
    appendRecord,
  );
  const stderrHandler = createLineHandler(
    service.name,
    'stderr',
    quiet,
    appendRecord,
  );

  childProcess.stdout?.on('data', stdoutHandler.write);
  childProcess.stderr?.on('data', stderrHandler.write);

  const closed = new Promise((resolveClosed) => {
    childProcess.once('error', (error) => {
      appendRecord({
        timestamp: new Date().toISOString(),
        service: service.name,
        level: 'error',
        event: 'local_service_start_failed',
        message: error.message,
        stream: 'stderr',
      });
      onExit(1);
      resolveClosed();
    });

    childProcess.once('close', (code, signal) => {
      stdoutHandler.flush();
      stderrHandler.flush();
      appendRecord({
        timestamp: new Date().toISOString(),
        service: service.name,
        level: code === 0 ? 'info' : 'error',
        event: 'local_service_exited',
        exitCode: code,
        signal,
      });
      onExit(code);
      resolveClosed();
    });
  });

  return Object.assign(childProcess, { closed });
}

function createLineHandler(serviceName, stream, quiet, appendRecord) {
  let pending = '';

  return {
    write(chunk) {
      pending += chunk.toString('utf8');
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? '';

      for (const line of lines) {
        handleLine(serviceName, stream, line, quiet, appendRecord);
      }
    },
    flush() {
      if (pending.length > 0) {
        handleLine(serviceName, stream, pending, quiet, appendRecord);
        pending = '';
      }
    },
  };
}

function handleLine(serviceName, stream, line, quiet, appendRecord) {
  const trimmedLine = line.trimEnd();

  if (trimmedLine.length === 0) {
    return;
  }

  if (!quiet) {
    const destination = stream === 'stderr' ? process.stderr : process.stdout;
    destination.write(`[${serviceName}] ${trimmedLine}\n`);
  }

  appendRecord(normalizeLogLine(serviceName, stream, trimmedLine));
}

function normalizeLogLine(serviceName, stream, line) {
  const parsedJson = parseJsonObject(line);

  if (parsedJson) {
    const timestamp = stringOrDefault(
      parsedJson.timestamp,
      stringOrDefault(parsedJson['@timestamp'], new Date().toISOString()),
    );
    const logger = stringOrDefault(
      parsedJson.logger,
      stringOrDefault(parsedJson.logger_name, undefined),
    );

    return {
      timestamp,
      service: stringOrDefault(parsedJson.service, serviceName),
      level: normalizeLevel(parsedJson.level, stream),
      stream,
      ...optionalField('logger', logger),
      ...safeExtraFields(
        parsedJson,
        new Set([
          '@timestamp',
          'timestamp',
          'service',
          'level',
          'stream',
          'logger',
          'logger_name',
        ]),
      ),
    };
  }

  return {
    timestamp: new Date().toISOString(),
    service: serviceName,
    level: stream === 'stderr' ? 'error' : 'info',
    stream,
    message: line,
  };
}

function parseCli(args) {
  const separatorIndex = args.indexOf('--');
  const optionArgs =
    separatorIndex === -1 ? args : args.slice(0, separatorIndex);
  const commandArgs =
    separatorIndex === -1 ? [] : args.slice(separatorIndex + 1);
  const options = {
    config: DEFAULT_CONFIG_FILE,
    logFile: undefined,
    maxLines: undefined,
    serviceName: undefined,
    quiet: false,
    help: false,
    command: undefined,
    commandArgs: [],
  };

  for (let index = 0; index < optionArgs.length; index += 1) {
    const option = optionArgs[index];

    switch (option) {
      case '--config':
        options.config = requiredValue(option, optionArgs, ++index);
        break;
      case '--log-file':
        options.logFile = requiredValue(option, optionArgs, ++index);
        break;
      case '--max-lines':
        options.maxLines = parseMaxLines(
          requiredValue(option, optionArgs, ++index),
        );
        break;
      case '--service':
        options.serviceName = requiredValue(option, optionArgs, ++index);
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${option}`);
    }
  }

  if (commandArgs.length > 0) {
    if (!options.serviceName) {
      throw new Error('Wrapped command mode requires --service <name>.');
    }

    options.command = commandArgs[0];
    options.commandArgs = commandArgs.slice(1);
  }

  return options;
}

function requiredValue(option, args, index) {
  const value = args[index];

  if (!value) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

async function fromConfigFile(cliOptions) {
  const configPath = resolveWorkspacePath(cliOptions.config);
  const config = JSON.parse(await readFile(configPath, 'utf8'));

  return {
    logFile: cliOptions.logFile ?? config.logFile ?? DEFAULT_LOG_FILE,
    maxLines:
      cliOptions.maxLines ??
      parseMaxLines(config.maxLines ?? DEFAULT_MAX_LINES),
    quiet: cliOptions.quiet || config.quiet === true,
    services: validateServices(config.services ?? []),
  };
}

function fromWrappedCommand(cliOptions) {
  return {
    logFile: cliOptions.logFile ?? DEFAULT_LOG_FILE,
    maxLines: cliOptions.maxLines ?? DEFAULT_MAX_LINES,
    quiet: cliOptions.quiet,
    services: validateServices([
      {
        name: cliOptions.serviceName,
        command: cliOptions.command,
        args: cliOptions.commandArgs,
      },
    ]),
  };
}

function validateServices(services) {
  return services.map((service, index) => {
    if (!service.name || typeof service.name !== 'string') {
      throw new Error(`Service at index ${index} must define a string name.`);
    }

    if (!service.command || typeof service.command !== 'string') {
      throw new Error(
        `Service "${service.name}" must define a string command.`,
      );
    }

    if (service.args !== undefined && !Array.isArray(service.args)) {
      throw new Error(`Service "${service.name}" args must be an array.`);
    }

    return {
      name: service.name,
      command: service.command,
      args: service.args ?? [],
      cwd: service.cwd,
      env: service.env,
      enabled: service.enabled,
    };
  });
}

async function readExistingLines(logFile, maxLines) {
  try {
    const content = await readFile(logFile, 'utf8');
    return content.split(/\r?\n/).filter(Boolean).slice(-maxLines);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function persistLogLines(logFile, lines) {
  await mkdir(dirname(logFile), { recursive: true });
  await writeFile(
    logFile,
    lines.length > 0 ? `${lines.join('\n')}\n` : '',
    'utf8',
  );
}

async function appendLogLine(logFile, line) {
  await appendFile(logFile, `${line}\n`, 'utf8');
}

function parseJsonObject(line) {
  if (!line.startsWith('{')) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function safeExtraFields(record, reservedFields) {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([key, value]) => !reservedFields.has(key) && isSafeFieldValue(value),
    ),
  );
}

function sanitizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter((entry) => isSafeFieldValue(entry[1])),
  );
}

function isSafeFieldValue(value) {
  return (
    value === null || ['boolean', 'number', 'string'].includes(typeof value)
  );
}

function stringOrDefault(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function normalizeLevel(level, stream) {
  return typeof level === 'string' && level.length > 0
    ? level.toLowerCase()
    : stream === 'stderr'
      ? 'error'
      : 'info';
}

function optionalField(key, value) {
  return value ? { [key]: value } : {};
}

function parseMaxLines(value) {
  const maxLines = Number.parseInt(String(value), 10);

  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    throw new Error('maxLines must be a positive integer.');
  }

  return maxLines;
}

function resolveWorkspacePath(path) {
  return resolve(workspaceRoot, path);
}

function printUsage() {
  process.stdout.write(`Usage:
  node tools/local-logs/collect-local-logs.mjs [--config <file>] [--log-file <file>] [--max-lines <n>]
  node tools/local-logs/collect-local-logs.mjs --service <name> [--log-file <file>] [--max-lines <n>] -- <command> [...args]

Examples:
  npm run local:logs
  npm run local:logs -- --service mobile -- npm exec nx run @blockout/mobile:start
`);
}
