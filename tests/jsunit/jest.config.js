// jest.config.js
module.exports = {  
    silent: true,
    transformIgnorePatterns: ['node_modules/(?!(sucrase)/)'],
    transform: {
      '^.+\\.(js|jsx|ts|tsx|mjs)$': ['babel-jest',
      { configFile: './babel.config.js' }]
    },
    rootDir: "./",
    roots: ["<rootDir>/src", "<rootDir>/specs"],
    resolver: "<rootDir>/resolver.js",
    coverageProvider: "v8",
    collectCoverage: true,
    collectCoverageFrom: [
      "<rootDir>/src/*.{js,jsx,ts,tsx}",
      "<rootDir>/src/**/*.{js,jsx,ts,tsx}",
      "!<rootDir>/src/libs/*",
      "!<rootDir>/src/plugin.js",
      "!<rootDir>/src/commands.js"
    ],
    testEnvironment: 'node',    
  }