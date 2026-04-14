module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'srv/**/*.js',
    '!srv/**/*.test.js',
    '!node_modules/**'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
