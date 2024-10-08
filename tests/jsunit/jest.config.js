// jest.config.js

module.exports = {  
    transformIgnorePatterns: ['node_modules/(?!(sucrase)/)'],
    transform: {
      '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
    },
    "roots": [
      "src",
      "specs"
    ],
    rootDir: "./",
    collectCoverage: true,
    collectCoverageFrom: [
      "<rootDir>/src/*.{js,jsx,ts,tsx}",
      "<rootDir>/src/**/*.{js,jsx,ts,tsx}",
      "!<rootDir>/src/libs/*"
    ],
    testEnvironment: 'node',    
  }