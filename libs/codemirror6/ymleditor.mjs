/* eslint-disable max-len */
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

import {EditorView, minimalSetup} from "codemirror";
import {autocompletion} from "@codemirror/autocomplete";
import {ensureSyntaxTree} from "@codemirror/language";
import {yaml} from "@codemirror/lang-yaml";

const ROOT_OPTIONS = [
    {label: 'key', type: 'variable', info: '*The key of the snippet'},
    {label: 'name', type: 'variable', info: '*The name of the snippet'},
    {label: 'category', type: 'variable', info: 'Optional. The category of the snippet (defaults to MISC)'},
    {label: 'instructions', type: 'variable', info: 'Optional. Instructions to the end user'},
    {label: 'engine', type: 'variable', info: 'Optional. It can either be mustache or ejs. Autodetects by default'},
    {label: 'template', type: 'variable', info: '*The template of the snippet. Cannot be used with filter.'},
    {label: 'filter', type: 'variable', info: '*The template of the filter. Cannot be used with template.'},
    {label: 'selectors', type: 'variable', info: 'Optional. The css selector/s to identify the widget. Required for context actions. String or String[]'},
    {label: 'insertquery', type: 'variable', info: 'Optional. The css selector in the template to tell where to insert content in SELECTION mode'},
    {label: 'unwrap', type: 'variable', info: 'Optional. The css selector/s of the content of the template that will be extracted when the context action unwrap is called'},
    {label: 'parameters', type: 'variable', info: 'Optional. A list of parameters of the snippet'},
    {label: 'requires', type: 'variable', info: 'Optional. The requires js dependencies of the widget. E.g. /sd/zoom.min.js'},
    {label: 'I18n', type: 'variable', info: 'Optional. A map of maps to support translations. Language key must be a parameter named _lang'},
    {label: 'scope', type: 'variable', info: 'Optional. Regex to dected body ids which are suitable for this widget. E.g. $mod-book-(.+)^'},
    {label: 'stars', type: 'variable', info: 'Optional. The recommedation stars of the snippet (deprecated)'},
    {label: 'for', type: 'variable', info: 'Optional. A list of user ids (comma separated) that will be allowed to use this widget'},
    {label: 'hidden', type: 'variable', info: 'Optional. Set to true to hide this widget for everybody'},
    {label: 'autocomplete', type: 'variable', info: 'Optional. A name of a select parameter that provides variations of a given widget. These variations will appear in the autocomplete popup'},
    {label: 'contextmenu', type: 'variable', info: 'Optional. Configure the context menu for this widget. It requires the keys selectors set.'},
    {label: 'contexttoolbar', type: 'variable', info: 'Optional. Configure the context toolbar for this widget. It requires the keys selectors set.'},
    {label: 'version', type: 'variable', info: '*The version of the snippet'},
    {label: 'author', type: 'variable', info: '*The author of the snippet'},
];

const PARAMETERS_OPTIONS = [
    {label: 'name', type: 'variable', info: '*The name of the parameter that will be used in the template.'},
    {label: 'title', type: 'variable', info: '*The title that will appear in the label near the user input.'},
    {label: 'type', type: 'variable', info: "'textfield' | 'numeric' | 'checkbox' | 'select' | 'textarea' | 'image' | 'color'"},
    {label: 'options', type: 'variable', info: "A list of options for type=select. Can be a list of strings or objects like {l: 'label', v: 'value'}"},
    {label: 'value', type: 'variable', info: "*The default value for the option. E.g. 11, true, 'someValue'"},
    {label: 'tooltip', type: 'variable', info: 'Optional. Information shown to the user as a popover near the input control'},
    {label: 'tip', type: 'variable', info: 'Optional. Shortcut for tooltip'},
    {label: 'min', type: 'variable', info: 'Optional. Minimum allowed value for type=numeric'},
    {label: 'max', type: 'variable', info: 'Optional. Maximum allowed value for type=numeric'},
    {label: 'bind', type: 'variable', info: "hasClass('cls'), notHasClass('cls'), classRegex('reg'), attr('attrName'), hasAttr('attrName=value'), notHasAttr('attrName=value'), attrRegex('attrName=regex'), hasStyle('styName:value'), notHasStyle('styName:value'), styleRegex(hasStyle('styName:regex'). Second parameter is a css query from widget root."},
    {label: 'transform', type: 'variable', info: 'Optional. Stream of transformers applied to the getter of this parameter. String separated by |. Available: toUpperCase | toLowerCase | trim | ytId | vimeoId | serveGDrive | removeHTML | escapeHTML | encodeHTML | escapeQuotes'},
    {label: 'hidden', type: 'variable', info: 'Optional. When set to true, the control will be hidden'},
    {label: 'editable', type: 'variable', info: 'Optional. When set to false, the control cannot be modified'},
    {label: 'when', type: 'variable', info: "Optional. JS expression to determine when to dynamically display the control. E.g. _lang==='es'"},
    {label: 'for', type: 'variable', info: 'Optional. Tell for which user ids (comma separated) this control will be visible'},
];

const OPTIONS_OPTIONS = [
    {label: "{l: 'label', v: 'value'}", type: 'variable', info: 'An option defined as label and value'},
];

const BIND_OPTIONS = [
    {label: "get: function(e){return 'whatever';} ", type: 'variable', info: 'How to get the variable value from jQuery<HTMLElement> e'},
    {label: "set: function(e, value){} ", type: 'variable', info: 'How to set the variable value to jQuery<HTMLElement> e'},
];

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
    if (flatTree.length === 1 && flatTree[0] === '^') {
        return ROOT_OPTIONS;
    } else if (flatTree.filter(e => e !== '^' && e !== '-')[0] === 'parameters') {
        return PARAMETERS_OPTIONS;
    } else if (flatTree.filter(e => e !== '^' && e !== '-')[0] === 'options') {
        return OPTIONS_OPTIONS;
    } else if (flatTree.filter(e => e !== '^' && e !== '-')[0] === 'bind') {
        return BIND_OPTIONS;
    }
    return null;
}

function myCompletions(/** @type {*} */ context) {
    console.log("context", context);
    const tree = ensureSyntaxTree(context.state, context.state.doc.length, 1000);
    if (!tree) {
        return null;
    }
    const nodeBefore = tree.resolveInner(context.pos, 0);
    console.log("nodeBefore", nodeBefore);
    /** @type {string[]} */
    const flatTree = [];
    getKeysUpNode(nodeBefore, context, flatTree);
    console.log("KEYS", flatTree);

    let before = context.matchBefore(/\w+/);
    // If completion wasn't explicitly started and there
    // is no word before the cursor, don't open completions.
    const options = getOptionsFor(flatTree);
    if ((!context.explicit && !before) || !options) {
        return null;
    }
    return {
        from: before ? before.from : context.pos,
        options,
        validFor: /^\w*$/
    };
}

export default class YmlEditor {
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
        this._editorView = new EditorView({
            extensions: [
                minimalSetup,
                yaml(),
                autocompletion({override: [myCompletions]}),
            ],
            parent: this._parentElement
        });
    }
    /**
     *
     * @param {string} source
     */
    setValue(source) {
        this._source = source;
        let code = source || '';
        const view = this._editorView;
        view?.dispatch({changes: {from: 0, to: view.state.doc.length, insert: code}});
    }
    /**
     * @returns {string}
     */
    getValue() {
        return this._editorView?.state?.doc?.toString() ?? '';
    }
}
