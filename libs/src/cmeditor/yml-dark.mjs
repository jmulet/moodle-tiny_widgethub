// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/yml-dark
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * CodePro Dark theme tuned for YAML.
 *
 * Works with @codemirror/lang-yaml (Lezer grammar). Tags for the legacy
 * StreamLanguage yaml mode are covered at the bottom as a fallback.
 *
 * Usage:
 *   import { yaml } from '@codemirror/lang-yaml';
 *   import { yamlDark } from './yaml-dark';
 *   extensions: [yaml(), yamlDark]
 */
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const text = '#cccccc',
    background = '#1f1f1f',
    darkBackground = '#1a1a1a',
    highlightBackground = '#2e2e2e',
    selection = '#3d3d3d',
    cursor = '#4d4d4d',
    gutterText = '#808080',
    key = '#569cd6', // mapping keys
    string = '#d1a008', // quoted strings
    number = '#d33682',
    anchor = '#d33682', // &anchor and *alias
    tag = '#cb4b16', // !!str, !custom
    punct = '#7e83e6', // : - , ?
    bracket = '#d33682', // [ ] { }
    directive = '#a7bf06', // %YAML
    meta = '#dc322f', // --- and ...
    comment = '#638e50';

const yamlDarkTheme = EditorView.theme({
    '&': { color: text, backgroundColor: background },
    '.cm-content': { caretColor: cursor },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: cursor },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: selection
    },
    '.cm-panels': { backgroundColor: darkBackground, color: cursor },
    '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
    '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },
    '.cm-searchMatch': { backgroundColor: '#72a1ff59', outline: '1px solid #457dff' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#6199ff2f' },
    '.cm-activeLine': { backgroundColor: highlightBackground },
    '.cm-selectionMatch': { backgroundColor: '#aafe661a' },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        outline: '1px solid #eee8d5'
    },
    '.cm-gutters': { backgroundColor: darkBackground, color: gutterText, border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: highlightBackground },
    '.cm-foldPlaceholder': { backgroundColor: 'transparent', border: 'none', color: '#ddd' },
    '.cm-tooltip': { border: 'none', backgroundColor: darkBackground },
    '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent'
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: darkBackground,
        borderBottomColor: darkBackground
    },
    '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': { backgroundColor: highlightBackground, color: cursor }
    }
}, { dark: true });

// Moodle/RequireJS workaround kept from the original theme.
const HighlightStyleDef = HighlightStyle.define;

const yamlDarkHighlightStyle = HighlightStyleDef([
    // --- lang-yaml (Lezer) ---------------------------------------------
    // Key/Literal and Key/QuotedLiteral
    { tag: t.definition(t.propertyName), color: key },
    // Plain scalar values (Literal, BlockLiteralContent)
    { tag: t.content, color: text },
    // Quoted values "..." and '...'
    { tag: t.string, color: string },
    // Block scalar headers: | > |- >+
    { tag: t.special(t.string), color: number },
    // Anchors (&a) and aliases (*a)
    { tag: t.labelName, color: anchor },
    // Tags (!!str, !custom)
    { tag: t.typeName, color: tag },
    // Directives (%YAML 1.2) and their arguments
    { tag: t.keyword, color: directive },
    { tag: t.attributeValue, color: string },
    // Document markers --- and ...
    { tag: t.meta, color: meta },
    // : , - separators and ? complex key marker
    { tag: [t.separator, t.punctuation], color: punct },
    // Flow collections
    { tag: [t.squareBracket, t.brace], color: bracket },
    // Comments
    { tag: [t.comment, t.lineComment], color: comment, fontStyle: 'italic' },

    // --- legacy StreamLanguage yaml fallback ---------------------------
    { tag: [t.atom, t.bool], color: number },
    { tag: t.number, color: number },
    { tag: t.modifier, color: anchor },

    { tag: t.invalid, color: meta, borderBottom: `1px dotted ${meta}` }
]);

const yamlDark = [yamlDarkTheme, syntaxHighlighting(yamlDarkHighlightStyle)];

export { yamlDark, yamlDarkHighlightStyle, yamlDarkTheme };