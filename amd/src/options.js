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
const userInfoOpt = getPluginOptionName(pluginName, 'user');
const courseId = getPluginOptionName(pluginName, 'courseid');
const widgetList = getPluginOptionName(pluginName, 'widgetlist');

const shareStyles = getPluginOptionName(pluginName, 'sharestyles');
const additionalCss = getPluginOptionName(pluginName, 'additionalcss');
const globalConfig = getPluginOptionName(pluginName, 'cfg');

/**
 * @param {import('./plugin').TinyMCE} editor
 */
export const register = (editor) => {
    const registerOption = editor.options.register;

    registerOption(showPlugin, {
        processor: 'boolean',
        "default": true,
    });

    registerOption(userInfoOpt, {
        processor: 'object',
        "default": {
            id: 0,
            username: '',
            roles: []
        },
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

    registerOption(globalConfig, {
        processor: 'object',
        "default": {},
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
 * @param {import('./plugin').TinyMCE} editor
 * @param {string} key
 * @param {string} defaultValue
 * @returns {string} - An object with the key/value properties
 */
export const getGlobalConfig = (editor, key, defaultValue) => {
    const dict = editor.options.get(globalConfig) ?? {};
    return dict[key] ?? defaultValue;
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
    const userInfo = editor.options.get(userInfoOpt);
    wrappedWidgets.filter(w => w.isFor(userInfo)).forEach(w => {
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
     * @returns {{id: number, username: string, roles: string[]}} - an integer with the id of the current user
     */
    get userInfo() {
        return this.editor.options.get(userInfoOpt);
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
 */
export const Shared = {
    // In which type of activity the editor is being used
    currentScope: document.querySelector('body')?.id ?? '',
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
            case ('autocomplete'):
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
    if (widget.template) {
        widget.template = widget.template.replace(regex, (s0, s1) => {
            return partials[s1] ?? s0;
        });
    }

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
 * @property {{to: string, content: string}} [a]
 */
/**
 * @typedef {Object} Param
 * @property {string=} partial
 * @property {string} name
 * @property {string} title
 * @property {'textfield' | 'numeric' | 'checkbox' | 'select' | 'autocomplete' | 'textarea' | 'image' | 'color' | 'repeatable'} [type]
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
 * @property {string} [for]
 * @property {Param[]} [fields]
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
 * @property {string} name
 * @property {string} category
 * @property {string} [scope] - Regex for idenfying allowed body ids
 * @property {string} [instructions]
 * @property {'mustache' | 'ejs'} [engine]
 * @property {string} [template]
 * @property {string} [filter]
 * @property {Param[]} [parameters]
 * @property {Object.<string, Object<string, string>>} [I18n]
 * @property {string | string[]} [selectors]
 * @property {string} [insertquery]
 * @property {string} [unwrap]
 * @property {string} [for]
 * @property {string} [forids] - Equivalent to [for]
 * @property {string} [forusernames]
 * @property {string} [forroles]
 * @property {string} [formatch] - AND or OR, Defaults to AND (The rules must be satified if present)
 * @property {string} [autocomplete]
 * @property {string} version
 * @property {string} author
 * @property {string[]} [requires]
 * @property {boolean} [hidden]
 * @property {number} [stars]
 * @property {Action[]} [contextmenu]
 * @property {Action[]} [contexttoolbar]
 */
/**
 * @class
 * @classdesc Wrapper for Widget definition
 */
export class Widget {
    _widget;
    #instructionsParsed = false;
    /** @type {string | undefined} */
    _preview;

    /**
     * @param {RawWidget} widget
     * @param {Object.<string, any>=} partials
     */
    constructor(widget, partials) {
        partials = partials ?? {};
        applyPartials(widget, partials);
        this._widget = widget;
    }
    /**
     * @returns {number}
     */
     get id() {
        return this._widget.id;
    }
    /**
     * @returns {string}
     */
    get name() {
        return this._widget.name;
    }
    /**
     * @returns {string}
     */
    get key() {
        return this._widget.key;
    }
    /**
     * @returns {Record<string, Record<string, string>>}
     */
    get I18n() {
        return this._widget.I18n || {};
    }
    /**
     * @returns {string}
     */
    get template() {
        return this._widget.template ?? this._widget.filter ?? '';
    }
    /**
     * @returns {string}
     */
    get category() {
        return this._widget.category ?? "MISC";
    }
    /**
     * @returns {string=}
     */
    get insertquery() {
        return this._widget.insertquery;
    }
    /**
     * @returns {string | string[] =}
     */
    get selectors() {
        return this._widget.selectors;
    }
    /**
     * @returns {string=}
     */
    get unwrap() {
        return this._widget.unwrap;
    }
    /**
     * @returns {string}
     */
    get version() {
        return this._widget.version || "1.0.0";
    }
    /**
     * @returns {string}
     */
    get instructions() {
        if (this._widget.instructions && !this.#instructionsParsed) {
            this._widget.instructions = decodeURIComponent(this._widget.instructions);
            this.#instructionsParsed = true;
        }
        return this._widget.instructions ?? '';
    }
    /**
     * @returns {Param[]}
     */
    get parameters() {
        return this._widget.parameters ?? [];
    }
    /**
     * @returns {Object.<string, any>}
     */
    get defaults() {
        /** @type {Object.<string, any> } */
        const obj = {};
        (this._widget.parameters ?? []).forEach((param) => {
            obj[param.name] = param.value;
            // In repeatable must create an empty array (they are populated dynamically)
            if (param.type === 'repeatable') {
                obj[param.name] = [];
            }
        });
        return obj;
    }
    /**
     * @param {{id: number, username: string, roles: string[]}} userInfo
     * @returns {boolean}
     */
    isFor(userInfo) {
        if (this._widget.hidden === true) {
            return false;
        }

        const checkList = (/** @type {any} **/ value, /** @type {string} */ ruleStr) => {
            if (!ruleStr || ruleStr.trim() === '') {
                return null; // Null means "no rule set".
            } else if (ruleStr.trim() === '*') {
                return true;
            }

            let allowMode = ruleStr.trim().startsWith('+') || !ruleStr.trim().startsWith('-');
            const list = ruleStr.replace(/[+\-\s]/g, '').split(',');
            return allowMode ? list.includes(String(value)) : !list.includes(String(value));
        };

        const idRule = this._widget.for || this._widget.forids || '';
        const usernameRule = this._widget.forusernames || '';
        const roleRule = this._widget.forroles || '';

        const results = [];

        const idResult = checkList(userInfo.id, idRule);
        if (idResult !== null) {
            results.push(idResult);
        }

        const usernameResult = checkList(userInfo.username, usernameRule);
        if (usernameResult !== null) {
            results.push(usernameResult);
        }

        const roleResult = roleRule.trim() === '' ?
            null : userInfo.roles.some(role => checkList(role?.toLowerCase(), roleRule?.toLowerCase()));
        if (roleResult !== null) {
            results.push(roleResult);
        }

        const matchMode = (this._widget.formatch || 'AND').toUpperCase();

        // No rules at all? Allow by default
        if (results.length === 0) {
            return true;
        }

        const isAllowed = matchMode === 'OR' ? results.some(Boolean) : results.every(Boolean);

        if (!isAllowed) {
            console.warn(`Widget ${this._widget.key} not allowed for user ${userInfo.id}`);
        }

        return isAllowed;
    }

    /**
     * @returns {boolean}
     */
    isFilter() {
        return this._widget.template === undefined && this._widget.filter !== undefined;
    }

    /**
     * @param {string=} scope
     * @returns {boolean}
     */
    isUsableInScope(scope) {
        scope = scope ?? Shared.currentScope ?? '';
        const widgetScopes = this._widget.scope;
        if (!scope || !widgetScopes || widgetScopes === "*") {
            return true;
        }
        return new RegExp(widgetScopes).test(scope);
    }
    /**
     * @returns {boolean}
     */
    hasBindings() {
        const parameters = this._widget.parameters ?? [];
        const repeatable = parameters.filter(param => param.type === 'repeatable')
            .map(rep => (rep.fields || []).some(field => field.bind !== undefined));
        return parameters.some(param => param.bind !== undefined) ||
            repeatable.some(rep => rep);
    }
    /**
     * Recovers the property value named name of the original definition
     * @param {string} name
     * @returns {*}
     */
    prop(name) {
        // @ts-ignore
        return this._widget[name];
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
