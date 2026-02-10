/* eslint-disable max-len */
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import stringImport from 'rollup-plugin-string-import';
import commonjs from '@rollup/plugin-commonjs';
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
    // First precompile workers into tmp folder
    {
        input: './src/sandbox/workers/eval_worker.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, './src/sandbox/tmp/eval_worker.inline.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true, legalComments: 'none' }),
        ]
    },
    {
        input: './src/sandbox/workers/ejs_worker.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, './src/sandbox/tmp/ejs_worker.inline.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true, legalComments: 'none' }),
        ]
    },
    {
        input: './src/sandbox/workers/liquid_worker.js',
        context: 'self',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, './src/sandbox/tmp/liquid_worker.inline.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true, legalComments: 'none' }),
        ]
    },
    {
        input: './src/sandbox/workers/mustache_worker.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, './src/sandbox/tmp/mustache_worker.inline.js'),
            format: 'iife',
            plugins: [],
            banner
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            esbuild({ target: 'es2017', minify: true, legalComments: 'none' }),
        ]
    },
    // Then compile the main bundle and include all _worker.min.js files as strings.
    {
        input: './src/sandbox/render_sandbox.js',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../js/render_sandbox.min.js'),
            format: 'iife',
            plugins: [
            ],
            banner
        },
        plugins: [
            stringImport({
                include: './src/sandbox/tmp/*_worker.inline.js',
                exclude: 'node_modules/**',
            }),
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
            banner,
        },
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            // @ts-ignore
            commonjs(),
            esbuild({ target: 'es2017', minify: true }),
        ]
    },
];