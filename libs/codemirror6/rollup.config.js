import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
    {
        input: 'cm6pro.mjs',
        output: {
            sourcemap: false,
            file: '../../amd/src/cm6pro-lazy.js',
            format: 'esm',
            name: 'cm6pro',
            plugins: []
        },
        plugins: [nodeResolve()]
    }
];