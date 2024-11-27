import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
    {
        input: './codemirror6/ymleditor.mjs',
        output: {
            sourcemap: false,
            file: '../amd/src/libs/ymleditor-lazy.js',
            format: 'esm',
            name: 'ymleditor',
            plugins: []
        },
        plugins: [nodeResolve()]
    }
];