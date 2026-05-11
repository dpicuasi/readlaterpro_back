module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js', '!src/config/**'],
  coverageDirectory: 'coverage',
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  setupFiles: ['<rootDir>/src/__tests__/helpers/setEnv.js'],
  testTimeout: 30000,
};
