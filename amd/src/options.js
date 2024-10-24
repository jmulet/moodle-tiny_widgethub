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
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getPluginOptionName} from 'editor_tiny/options';
import Common from './common';
const pluginName = Common.pluginName;

const showPlugin = getPluginOptionName(pluginName, 'showplugin');
const userId = getPluginOptionName(pluginName, 'userid');
const courseId = getPluginOptionName(pluginName, 'courseid');
const widgetList = getPluginOptionName(pluginName, 'widgetlist');

const shareStyles = getPluginOptionName(pluginName, 'sharestyles');
const additionalCss = getPluginOptionName(pluginName, 'additionalcss');

/**
 * @param {import('./plugin').TinyMCE} editor
 */
export const register = (editor) => {
    const registerOption = editor.options.register;

    registerOption(showPlugin, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(userId, {
        processor: 'string',
        "default": "-1",
    });

    registerOption(courseId, {
        processor: 'string',
        "default": "-1",
    });

    registerOption(widgetList, {
        processor: 'array',
        "default": [],
    });

    registerOption(shareStyles, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(additionalCss, {
        processor: 'string',
        "default": "",
    });
};

/**
 * @param {import('./plugin').TinyMCE} editor
 * @returns {boolean} - are the plugin buttons visible?
 */
export const isPluginVisible = (editor) => editor.options.get(showPlugin);

/**
 * @param {import('./plugin').TinyMCE} editor
 * @returns {string} - additional css that must be included in a <style> tag in editor's iframe
 */
export const getAdditionalCss = (editor) => {
    return editor.options.get(additionalCss);
};

/**
 * Wrapper version of the snippet definitions shared among all editors in page
 * @type {Record<string, Widget> | undefined}
 * */
let _widgetDict;

/**
 * @param {import('./plugin').TinyMCE} editor
 * @returns {Record<string, Widget>} - The available list of widgets
 */
export const getWidgetDict = (editor) => {
    if (_widgetDict) {
        return _widgetDict;
    }
    /** @type {RawWidget[]} */
    let rawWidgets = editor.options.get(widgetList) ?? [];
    _widgetDict = {};
    // Partials is a special widget that is used to define common parameters shared by other widgets
    /** @type {RawWidget | undefined} */
    let partials = rawWidgets.filter(e => e.key === 'partials')[0];
    if (partials) {
        rawWidgets = rawWidgets.filter(e => e.key !== 'partials');
    }
    // Create a wrapper for the widget to handle operations
    const wrappedWidgets = rawWidgets
        .map(w => new Widget(w, partials || {}));

    // Remove those buttons that aren't usable for the current user
    const id = editor.options.get(userId);
    wrappedWidgets.filter(w => w.isFor(id)).forEach(w => {
        if (_widgetDict) {
            _widgetDict[w.key] = w;
        }
    });
    return _widgetDict;
};

export class EditorOptions {
    /**
     * @param {import('./plugin').TinyMCE} editor
     */
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * @returns {number} - an integer with the id of the current user
     */
    get userId() {
        return parseInt(this.editor.options.get(userId));
    }

    /**
     * @returns {number} - an integer with the id of the current course
     */
    get courseId() {
        return parseInt(this.editor.options.get(courseId));
    }

    /**
     * @returns {Object.<string, Widget>} - a dictionary of "usable" widgets for the current userId
     */
    get widgetDict() {
       return getWidgetDict(this.editor);
    }
}

/**
 * @typedef {object} Shared
 * @property {string} currentScope
 * @property {boolean} activatePopup
 * @property {object} globalConfig
 * @const
 */
let activatePopup = true;
export const Shared = {
    // In which type of activity the editor is being used
    currentScope: document.querySelector('body')?.id,
    // Whether to activate the contextual popup or not
    activatePopup: activatePopup,
    // Hold other global configuration
    globalConfig: {}
};

/**
 * Add missing properties in the param definition
 * that can be derived from existing data.
 * @param {Param} param
 */
export function fixMissingParamProperties(param) {
    if (!param.type) {
        if (param.options) {
            param.type = 'select';
        } else if (typeof param.value === "boolean") {
            // Infer type from value
            param.type = 'checkbox';
        } else if (typeof param.value === "number") {
            param.type = 'numeric';
        } else if (typeof param.value === "string") {
            param.type = param.options ? 'select' : 'textfield';
        }
    }
    if (!param.value) {
        switch (param.type) {
            case ('checkbox'):
                param.value = false; break;
            case ('numeric'):
                param.value = 0; break;
            case ('select'):
                param.value = param.options?.[0];
                if (typeof (param.value) === 'object') {
                    param.value = param.value.v;
                }
                break;
            case ('color'):
                param.value = '#ffffff'; break;
            default:
                param.value = '';
        }
    }
}

/**
 * @param {*} obj - The object to expand
 * @param {Record<string, *>} partials - The dictionary with partials
 * @returns {*} The modified object
 */
export function expandPartial(obj, partials) {
    if ((obj ?? null) === null) {
        return obj;
    }
    let partialKey;
    if (typeof obj === 'string' && obj.startsWith('__') && obj.endsWith('__')) {
        partialKey = obj;
        obj = {};
    } else if (typeof obj === 'object' && obj.partial) {
        partialKey = obj.partial;
        delete obj.partial;
    }
    if (partialKey) {
        partialKey = partialKey.replace(/__/g, '');
        if (!partials[partialKey]) {
            console.error(`Cannot find partial for ${partialKey}`);
        } else {
            // Override with passed properties.
            obj = {...partials[partialKey], ...obj};
        }
    }
    return obj;
}

/**
 * Partials are variables that start with @ which
 * can be expanded in different parts of the widget
 * definition.
 * @param {RawWidget} widget
 * @param {Record<string, *>} partials
 * @returns {void} The same widget with partials expanded
 */
export function applyPartials(widget, partials) {
    // Expand partials in template.
    const regex = /__([\w\d]+)__/g;
    widget.template = widget.template.replace(regex, (s0, s1) => {
        return partials[s1] ?? s0;
    });

    // Expand partials in parameters.
    const parameters = widget.parameters;
    if (parameters) {
        parameters.forEach((/** @type {*} */ param, i) => {
            param = expandPartial(param, partials);
            parameters[i] = param;
            // Treat inner partials
            let prop = expandPartial(param.bind, partials);
            if (prop) {
                param.bind = prop;
            }
            prop = expandPartial(param.transform, partials);
            if (prop) {
                param.transform = prop;
            }
            // Do some fixes on parameters.
            fixMissingParamProperties(param);
        });
    }
}

/**
 * @typedef {Object} ParamOption
 * @property {string} l
 * @property {string} v
 */
/**
 * @typedef {Object} Param
 * @property {string=} partial
 * @property {string} name
 * @property {string} title
 * @property {'textfield' | 'numeric' | 'checkbox' | 'select' | 'textarea' | 'image' | 'color'} [type]
 * @property {(ParamOption | string)[]} [options]
 * @property {any} value
 * @property {string=} tip
 * @property {string=} tooltip
 * @property {number=} min
 * @property {number=} max
 * @property {string=} transform
 * @property {string | {get: string, set: string} } [bind]
 * @property {string=} when
 * @property {boolean} [hidden]
 * @property {boolean} [editable]
 */
/**
 * @typedef {Object} Action
 * @property {string} predicate
 * @property {string} actions
 */
/**
 * @typedef {Object} RawWidget
 * @property {number} id
 * @property {string} key
 * @property {string} category
 * @property {string=} scope - Regex for idenfying allowed body ids
 * @property {string} name
 * @property {string=} instructions
 * @property {'mustache' | 'ejs'} [engine]
 * @property {string} template
 * @property {Param[]=} parameters
 * @property {Object.<string, Object<string, string>>} [I18n]
 * @property {string | string[]} [selectors]
 * @property {string=} insertquery
 * @property {string=} unwrap
 * @property {string=} for
 * @property {string} version
 * @property {string} author
 * @property {boolean=} hidden
 * @property {Action[]} [contextmenu]
 * @property {Action[]} [contexttoolbar]
 */
/**
 * @class
 * @classdesc Wrapper for Widget definition
 */
export class Widget {
    #widget;
    #instructionsParsed = false;

    /**
     * @param {RawWidget} widget
     * @param {Object.<string, any>=} partials
     */
    constructor(widget, partials) {
        partials = partials ?? {};
        applyPartials(widget, partials);
        this.#widget = widget;
    }
    /**
     * @returns {string}
     */
    get name() {
        return this.#widget.name;
    }
    /**
     * @returns {string}
     */
    get key() {
        return this.#widget.key;
    }
    /**
     * @returns {Record<string, Record<string, string>>}
     */
    get I18n() {
        return this.#widget.I18n || {};
    }
    /**
     * @returns {string}
     */
    get template() {
        return this.#widget.template;
    }
    /**
     * @returns {string}
     */
    get category() {
        return this.#widget.category ?? "MISC";
    }
    /**
     * @returns {string=}
     */
    get insertquery() {
        return this.#widget.insertquery;
    }
    /**
     * @returns {string | string[] =}
     */
    get selectors() {
        return this.#widget.selectors;
    }
    /**
     * @returns {string=}
     */
    get unwrap() {
        return this.#widget.unwrap;
    }
    /**
     * @returns {string}
     */
    get version() {
        return this.#widget.version || "1.0.0";
    }
    /**
     * @returns {string}
     */
    get instructions() {
        if (this.#widget.instructions && !this.#instructionsParsed) {
            this.#widget.instructions = decodeURIComponent(this.#widget.instructions);
            this.#instructionsParsed = true;
        }
        return this.#widget.instructions ?? '';
    }
    /**
     * @returns {Param[]}
     */
    get parameters() {
        return this.#widget.parameters ?? [];
    }
    /**
     * @returns {Object.<string, any>}
     */
    get defaults() {
        /** @type {Object.<string, any> } */
        const obj = {};
        this.parameters.forEach((param) => {
            obj[param.name] = param.value;
        });
        return obj;
    }
    /**
     * @param {number} userId
     * @returns {boolean}
     */
    isFor(userId) {
        if (this.#widget.hidden === true) {
            return false;
        }
        let grantStr = (this.#widget.for || '').trim();
        if (grantStr === '' || grantStr === '*') {
            return true;
        }
        let allowMode = true;
        if (grantStr.startsWith('-')) {
            allowMode = false;
        }
        grantStr = grantStr.replace(/[+\- ]/g, '');
        const grantList = grantStr.split(",");
        const isAllowed = (allowMode && grantList.indexOf(userId + "") >= 0) || (!allowMode && grantList.indexOf(userId + "") < 0);
        return isAllowed;
    }

    /**
     * @param {string=} scope
     * @returns {boolean}
     */
    isUsableInScope(scope) {
        scope = scope ?? Shared.currentScope ?? '';
        const widgetScopes = this.#widget.scope;
        if (!scope || !widgetScopes || widgetScopes === "*") {
            return true;
        }
        const regex = new RegExp(widgetScopes);
        return (regex.exec(scope) ?? null) !== null;
    }
    /**
     * @returns {boolean}
     */
    isFilter() {
        return this.category?.toLowerCase() === "filtres";
    }
    /**
     * @returns {boolean}
     */
    hasBindings() {
        return this.parameters.filter(param => param.bind !== undefined).length > 0;
    }
    /**
     * Recovers the property value named name of the original definition
     * @param {string} name
     * @returns {*}
     */
    prop(name) {
        // @ts-ignore
        return this.#widget[name];
    }
}


const editorOptionsInstances = new Map();
/**
 * @param {import('./plugin').TinyMCE} editor
 * @returns {EditorOptions}
 */
export function getEditorOptions(editor) {
    let instance = editorOptionsInstances.get(editor);
    if (!instance) {
        instance = new EditorOptions(editor);
        editorOptionsInstances.set(editor, instance);
    }
    return instance;
}