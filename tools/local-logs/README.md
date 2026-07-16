# Local Log Collection

Local Blockout services write diagnostics to stdout or stderr. The collector is the only local process that writes
`logs/blockout-local.log`, keeps the file Git-ignored, and compacts it back to the latest 10,000 records after a small
append buffer without creating archives.

Run the configured local stack:

```bash
npm run local:logs
```

Wrap one command when debugging a single surface:

```bash
npm run local:logs -- --service mobile -- npm exec nx run @blockout/mobile:start
```

The collector normalizes Spring Boot Logstash JSON and server-side Next.js JSON logs to JSONL records with `service`,
`timestamp`, `level`, `stream`, and correlation fields when present. Structured exception stack traces remain in one
JSONL record. Browser telemetry is intentionally not collected.

If backend services cannot resolve local reactor dependencies from `spring-boot:run`, install the backend artifacts once
first:

```bash
mvn -f apps/backend/pom.xml -DskipTests install
```
