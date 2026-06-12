import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ESNext',
          module: 'commonjs',
          esModuleInterop: true,
          strict: true,
          lib: ['DOM', 'DOM.Iterable', 'ESNext'],
          jsx: 'react-jsx',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@esTypes/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
};

export default config;
