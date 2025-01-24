/* eslint-disable max-len */
import replace from '@rollup/plugin-replace';
import {nodeResolve} from '@rollup/plugin-node-resolve';

const banner = `
/** @ts-ignore */
/* eslint-disable */
`;

export default [
    {
        input: './codemirror6/ymleditor.mjs',
        output: {
            sourcemap: false,
            file: '../../amd/src/ymleditor-lazy.js',
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
];