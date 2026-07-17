module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*Contract.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: ['babel-preset-expo'],
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
