// jest.config.js

module.exports = {  
    transformIgnorePatterns: ['node_modules/(?!(sucrase)/)'],
    transform: {
      '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
    },
    rootDir: "./",
    collectCoverageFrom: [
      "<rootDir>/src/*.js"
    ],
    testEnvironment: 'node',    
  }