/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  maxWorkers: 1,
  clearMocks: true,
  verbose: true,
};
