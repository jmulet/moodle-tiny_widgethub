/* eslint-disable max-len */
import replace from '@rollup/plugin-replace';
import {nodeResolve} from '@rollup/plugin-node-resolve';
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
        input: './codemirror6/ymleditor.mjs',
        output: {
            sourcemap: false,
            file: path.resolve(__dirname, '../../amd/src/libs/ymleditor-lazy.js'),
            format: 'esm',
            name: 'ymleditor',
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
];