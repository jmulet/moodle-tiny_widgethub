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

import { basicSetup } from 'codemirror';
import { EditorView } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { linter, lintGutter, forEachDiagnostic, forceLinting } from "@codemirror/lint";
import { yaml as yamlLanguage } from "@codemirror/lang-yaml";
import { widgetSchema } from "./ymlschema.mjs";
import { createYamlZodLinter } from './ymllinter.mjs';
import { widgetCompletions } from "./ymlautocomplete.mjs";
import { parse, stringify } from 'yaml';
import { css as cssLanguage } from "@codemirror/lang-css";
import { html as htmlLanguage } from "@codemirror/lang-html";
import { fromJSON } from './yaml.mjs';

export class CmEditor {
    /**
     * @member {HTMLElement} _parentElement
     * @member {string | TinyMCE} _source
     * @member {CodeMirrorView} _editorView;
     */

    /**
     * @param {HTMLElement} parentElement
     * @param {string} lang - The language of the editor (yml, css, js)
     * @param {(lang: string, content: string) => void} onChangeListener - The listener to be called when the content changes
     */
    constructor(parentElement, lang, onChangeListener) {
        this._parentElement = parentElement;
        this._lang = lang;
        this._init(onChangeListener);
    }

    /**
     * @param {(lang: string, content: string) => void} onChangeListener - The listener to be called when the content changes
     */
    _init(onChangeListener) {
        this._timeout = null;
        const onChange = EditorView.updateListener.of(update => {
            if (update.docChanged && typeof onChangeListener === 'function') {
                if (this._timeout) {
                    clearTimeout(this._timeout);
                }
                // Debounce the onChangeListener
                this._timeout = setTimeout(() => onChangeListener(this._lang, update.state.doc.toString()), 1200);
            }
        });

        const extensions = [
            basicSetup,
            keymap.of([indentWithTab]),
            lintGutter(),
            onChange,
        ];

        if (this._lang === 'yml') {
            const schemaLinter = createYamlZodLinter(widgetSchema);
            extensions.push(
                yamlLanguage(),
                autocompletion({ override: [widgetCompletions] }),
                linter(schemaLinter, { delay: 1000 }),
            );
        } else if (this._lang === 'css') {
            extensions.push(cssLanguage());
        } else if (this._lang === 'html') {
            extensions.push(htmlLanguage());
        }

        this._editorView = new EditorView({
            extensions,
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
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
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
    fromJSON,
    stringify,
};
