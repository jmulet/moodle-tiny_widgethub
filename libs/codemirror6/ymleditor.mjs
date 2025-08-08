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
import {keymap} from "@codemirror/view";
import {indentWithTab} from "@codemirror/commands";
import {linter, lintGutter, forEachDiagnostic, forceLinting} from "@codemirror/lint";
import {yaml as yamlLanguage} from "@codemirror/lang-yaml";
import {widgetSchema} from "./ymlschema.mjs";
import {createYamlZodLinter} from './ymllinter.mjs';
import {widgetCompletions} from "./ymlautocomplete.mjs";
import {parse, stringify, Scalar} from 'yaml';

export class YmlEditor {
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
        const schemaLinter = createYamlZodLinter(widgetSchema);
        this._editorView = new EditorView({
            extensions: [
                basicSetup,
                keymap.of([indentWithTab]),
                yamlLanguage(),
                autocompletion({override: [widgetCompletions]}),
                linter(schemaLinter, {delay: 1000}),
                lintGutter(),
            ],
            parent: this._parentElement
        });
    }
    /**
     * Sets the yaml text
     * @param {string} source
     */
    setValue(source) {
        this._source = source;
        let code = source || '';
        const view = this._editorView;
        if (view) {
            view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: code}});
            forceLinting(view);
        }
    }
    /**
     * Returns the yaml text
     * @returns {string}
     */
    getValue() {
        return this._editorView?.state?.doc?.toString() ?? '';
    }
    /**
     * Returns true if the linter contains any messages of severity error.
     * @returns {boolean}
    */
    hasLintErrors() {
        const state = this._editorView?.state;
        if (!state) {
            return false;
        }
        let errorCount = 0;
        forEachDiagnostic(state, d => {
            if (d.severity === "error") {
                errorCount++;
            }
        });
        return errorCount > 0;
    }
}


export const YAML = {
    parse,
    stringify,
    Scalar,
};
