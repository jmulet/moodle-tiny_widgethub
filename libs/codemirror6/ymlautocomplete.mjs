
/* eslint-disable max-len */
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
import {ensureSyntaxTree} from "@codemirror/language";
import {widgetAutocompletions} from "./ymlschema.mjs";

/**
 * @param {*} node
 * @param {*} context
 * @param {string[]} keys
 */
function getKeysUpNode(node, context, keys) {
    if (!node.buffer && node.type?.name === 'Key') {
        keys.push(context.state.sliceDoc(node.from, node.to));
    } else if (!node.buffer && node.type?.name === '-') {
        keys.push('-');
    }
    // Termination condition
    if (node.type?.name === 'Document') {
        return;
    }
    const prev = node.prevSibling;
    const parent = node.parent;
    if (!prev && !parent) {
        return;
    }
    if (!prev) {
        keys.push('^');
        getKeysUpNode(parent, context, keys);
        return;
    }
    getKeysUpNode(prev, context, keys);
}

/**
 * @param {string[]} flatTree
 * @returns {Array<*> | null}
 */
function getOptionsFor(flatTree) {
    if (flatTree.length === 0 || (flatTree.length === 1 && flatTree[0] === '^')) {
        return widgetAutocompletions.ROOT_OPTIONS;
    } else if (flatTree.filter(e => e !== '^' && e !== '-')[0] === 'parameters') {
        return widgetAutocompletions.PARAMETERS_OPTIONS;
    } else if (flatTree.filter(e => e !== '^' && e !== '-')[0] === 'options') {
        return widgetAutocompletions.OPTIONS_OPTIONS;
    } else if (flatTree.filter(e => e !== '^' && e !== '-')[0] === 'bind') {
        return widgetAutocompletions.BIND_OPTIONS;
    }
    return null;
}

/**
 * Defines the autocompletion extension.
 * @param {import("@codemirror/autocomplete").CompletionContext} context
 * @returns { {from: number, options: any[], validFor: RegExp} | null }
 */
export function widgetCompletions(context) {
    const tree = ensureSyntaxTree(context.state, context.state.doc.length, 1000);
    if (!tree) {
        return null;
    }
    const nodeBefore = tree.resolveInner(context.pos, 0);
    // Constructs a flat tree from the syntax tree
    /** @type {string[]} */
    const flatTree = [];
    getKeysUpNode(nodeBefore, context, flatTree);

    let before = context.matchBefore(/\w+/);
    // If completion wasn't explicitly started and there
    // is no word before the cursor, don't open completions.
    const options = getOptionsFor(flatTree);
    if ((!context.explicit && !before) || !options?.length) {
        return null;
    }
    return {
        from: before ? before.from : context.pos,
        options,
        validFor: /^\w*$/
    };
}
