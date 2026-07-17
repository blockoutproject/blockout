import { defineConfig } from 'orval';

const generatedRoot = 'src/api/generated/mobile-gateway';
const contract =
  '../../../libs/shared/contracts/generated/specs/mobile-gateway.json';

export default defineConfig({
  mobileGateway: {
    input: contract,
    output: {
      target: `${generatedRoot}/endpoints/mobile-gateway.ts`,
      schemas: `${generatedRoot}/models`,
      client: 'react-query',
      httpClient: 'axios',
      mode: 'tags-split',
      clean: true,
      formatter: 'prettier',
      override: {
        mutator: {
          path: './src/api/core/orvalAxios.ts',
          name: 'orvalAxios',
        },
        query: {
          signal: true,
          version: 5,
        },
      },
    },
  },
  mobileGatewayWireSchemas: {
    input: contract,
    output: {
      target: `${generatedRoot}/schemas/mobile-gateway.zod.ts`,
      client: 'zod',
      mode: 'tags-split',
      clean: true,
      formatter: 'prettier',
      fileExtension: '.zod.ts',
      override: {
        zod: {
          version: 4,
        },
      },
    },
  },
});
