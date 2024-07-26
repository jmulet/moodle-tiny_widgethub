/* eslint-disable no-console */
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
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {EditorView, basicSetup} from "codemirror";
import {autocompletion} from "@codemirror/autocomplete";
import {Compartment} from '@codemirror/state';
import {ensureSyntaxTree} from "@codemirror/language";
import {yaml} from "@codemirror/lang-yaml";

const completions = [
    {label: 'key', type: 'variable', info: 'The key of the snippet'},
    {label: 'name', type: 'variable', info: 'The name of the snippet'},
    {label: 'category', type: 'variable', info: 'The category of the snippet'},
    {label: 'engine', type: 'variable', info: 'Optional. Can be either mustache or ejs'},
    {label: 'template', type: 'variable', info: 'The template of the snippet'},
    {label: 'selectors', type: 'variable', info: 'Optional. The selectors of the snippet'},
    {label: 'parameters', type: 'variable', info: 'A list of parameters of the snippet'},
    {label: 'stars', type: 'variable', info: 'Optional. The stars of the snippet'},
    {label: 'requires', type: 'variable', info: 'Optional. The requires of the snippet'},
    {label: 'version', type: 'variable', info: 'Optional. The version of the snippet'},
    {label: 'author', type: 'variable', info: 'Optional. The author of the snippet'},
];

function myCompletions(context) {
    console.log("context", context);
    const tree = ensureSyntaxTree(context.state, context.state.doc.length, 1000);
    console.log("tree", tree);
    const parent = tree.parent;
    console.log("parent", parent);
    let before = context.matchBefore(/\w+/);
    // If completion wasn't explicitly started and there
    // is no word before the cursor, don't open completions.
    if (!context.explicit && !before) {
        return null;
    }
    return {
        from: before ? before.from : context.pos,
        options: completions,
        validFor: /^\w*$/
    };
}

export default class CodeProEditor {
    /**
     * @member {HTMLElement} _parentElement
     * @member {string | TinyMCE} _source
     * @member {CodeMirrorView} _editorView;
     */

    /**
     * @param {HTMLElement} parentElement
     */
    constructor(parentElement) {
        this._parentElement = parentElement;
        this._init();
    }

    _init() {
        this.themeConfig = new Compartment();
        this.linewrapConfig = new Compartment();
        const language = new Compartment();
        this._editorView = new EditorView({
            extensions: [
                basicSetup,
                language.of(yaml()),
                autocompletion({override: [myCompletions]}),
            ],
            parent: this._parentElement
        });
    }
    /**
     *
     * @param {string | TinyMCE} source
     */
    setValue(source) {
        this._source = source;
        let code = source || '';
        const view = this._editorView;
        view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: code}});
    }
    /**
     * @returns {string}
     */
    getValue() {
        return this._editorView.state.doc.toString();
    }
}

