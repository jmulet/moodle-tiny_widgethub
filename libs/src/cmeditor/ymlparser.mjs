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
 * @module      tiny_widgethub/ymlparser
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { StateEffect, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import YAML from "yaml";

const DEBOUNCE_TIMEOUT = 1000;
// Effect to set the parsed YAML in state
/** @type {import("@codemirror/state").StateEffectType<YAML.Document | null>} */
export const setYamlAst = StateEffect.define();


/** @type {import("@codemirror/state").StateField<YAML.Document | null>} */
export const yamlAstField = StateField.define({
    /**
     * @returns {YAML.Document | null}
     */
    create() {
        return null;
    },
    /**
     * @param {YAML.Document | null} ast
     * @param {import("@codemirror/state").Transaction} tr
     * @returns {YAML.Document | null}
     */
    update(ast, tr) {
        for (let e of tr.effects) {
            if (e.is(setYamlAst)) {
                return e.value;
            }
        }
        return ast;
    }
});

/** @type {*} */
let parseTimeout;
// Listener to update the AST whenever doc changes
export const yamlAstUpdater = EditorView.updateListener.of(update => {
    if (update.docChanged) {
        if (parseTimeout) {
            clearTimeout(parseTimeout);
        }

        parseTimeout = setTimeout(() => {
            const text = update.state.doc.toString();
            let ast = null;
            try {
                ast = YAML.parseDocument(text);
            } catch {
                ast = null;
            }
            update.view.dispatch({ effects: setYamlAst.of(ast) });
        }, DEBOUNCE_TIMEOUT);
    }
});
