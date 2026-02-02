/* eslint-disable max-len */
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const banner = `
// @ts-nocheck
/** @ts-ignore */
/* eslint-disable */
`;

export default [
    {
        input: './codemirror6/cmeditor.mjs',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../amd/src/libs/cmeditor-lazy.js'),
            format: 'esm',
            name: 'cmeditor',
            plugins: [],
            banner
        },
        plugins: [
            // @ts-ignore
            replace({
                preventAssignment: true,
                values: {
                    "const defaultHighlightStyle = /*@__PURE__*/HighlightStyle.define([":
                        "const HighlightStyleDefs = HighlightStyle.define;\nconst defaultHighlightStyle = /*@__PURE__*/HighlightStyleDefs(["
                },
                delimiters: ['', '']
            }),
            nodeResolve()
        ]
    },
    {
        input: './codemirror6/yaml.mjs',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../amd/src/libs/yaml-lazy.js'),
            format: 'esm',
            name: 'yaml',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve()
        ]
    },
    {
        input: './sandbox/remoterender.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, './js/remoterender.js'),
            format: 'iife',
            name: 'remoterender',
            plugins: [],
        },
        plugins: [
            nodeResolve(),
            esbuild({ target: 'es2017', minify: true }),
        ]
    },

    {
        input: './sandbox/remotedom.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, './js/remotedom.js'),
            format: 'iife',
            name: 'remotedom',
            plugins: [],
        },
        plugins: [
            nodeResolve(),
            esbuild({ target: 'es2017', minify: true }),
        ]
    }
];