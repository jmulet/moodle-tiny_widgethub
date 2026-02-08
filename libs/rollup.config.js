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
        input: './src/cmeditor/cmeditor.mjs',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../../amd/src/libs/cmeditor-lazy.js'),
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
        input: './src/cmeditor/yaml.mjs',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../../amd/src/libs/yaml-lazy.js'),
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
        input: './src/sandbox/render_sandbox.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../js/render_sandbox.min.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true }),
        ]
    },
    {
        input: './src/sandbox/dom_sandbox.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../js/dom_sandbox.min.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true }),
        ]
    },
    {
        input: './src/sandbox/workers/eval_worker.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../js/eval_worker.min.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true }),
        ]
    },
    {
        input: './src/sandbox/workers/ejs_worker.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../js/ejs_worker.min.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true }),
        ]
    },
    {
        input: './src/sandbox/workers/liquid_worker.js',
        context: 'self',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../js/liquid_worker.min.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true }),
        ]
    },
    {
        input: './src/sandbox/workers/mustache_worker.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../js/mustache_worker.min.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true }),
        ]
    }
];