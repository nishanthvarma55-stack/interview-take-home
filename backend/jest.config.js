module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000
};
