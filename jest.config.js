/** @type {import('jest').Config} */
export default {
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  coveragePathIgnorePatterns: ['<rootDir>/test/utils'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: true,
            dynamicImport: true,
          },
          target: 'es2015',
          transform: {
            useDefineForClassFields: true,
            legacyDecorator: false,
            decoratorMetadata: false,
            decoratorVersion: '2022-03',
          },
          keepClassNames: true,
        },
        module: {
          type: 'commonjs',
        },
        sourceMaps: true,
      },
    ],
  },
  maxWorkers: 1,
  clearMocks: true,
  verbose: true,
};