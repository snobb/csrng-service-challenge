module.exports = {
    testEnvironment: 'node',
    bail: true,
    verbose: true,
    maxWorkers: 1,
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'html', 'text'],
    coverageProvider: 'v8',
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
    transform: { '^.+\\.(t|j)sx?$': '@swc/jest' },
    transformIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist'],
};
