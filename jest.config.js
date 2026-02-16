module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/message-router/**/*.ts',
    'app/api/webhooks/**/*.ts',
    '!*.d.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
