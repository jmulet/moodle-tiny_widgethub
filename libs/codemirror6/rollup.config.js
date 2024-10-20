import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
    {
        input: './codemirror6/cm6pro.mjs',
        output: {
            sourcemap: false,
            file: '../amd/src/libs/cm6pro-lazy.js',
            format: 'esm',
            name: 'cm6pro',
            plugins: []
        },
        plugins: [nodeResolve()]
    }
];