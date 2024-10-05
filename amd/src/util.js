/* eslint-disable no-console */
/* eslint-disable no-eq-null */
/* eslint-disable no-bitwise */
/* eslint-disable no-new-func */
/* eslint-disable dot-notation */
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

import {get_strings as getStrings} from 'core/str';
import jQuery from 'jquery';


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
 * @returns {string} a randomID
 */
export function genID() {
    return 'g' + Math.random().toString(32).substring(2);
}

/**
 * @param {Object.<string, any>} ctx
 * @param {string} expr
 * @param {boolean=} keepFns - Keep or not the funcions in the ctx
 * @returns {any} The evaluated expression within the context ctx
 */
export function evalInContext(ctx, expr, keepFns) {
    const listArgs = [];
    const listVals = [];

    if (ctx) {
        Object.keys(ctx).forEach((key) => {
            // Remove functions from ctx
            if (keepFns || typeof ctx[key] !== "function") {
                listArgs.push(key);
                listVals.push(ctx[key]);
            }
        });
    }
    listArgs.push('expr');
    listArgs.push('return eval(expr)');
    listVals.push(expr);
    const evaluator = new Function(...listArgs);
    return evaluator(...listVals);
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
 * @typedef {Object} Widget
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
 */
/**
 * @class
 * @classdesc Wrapper for Widget definition
 */
export class WidgetWrapper {
    #widget;
    #instructionsParsed = false;

    /**
     * @param {Widget} widget
     * @param {Object.<string, any>=} partials
     */
    constructor(widget, partials) {
        partials = partials ?? {};
        this.#widget = widget;
        const parameters = widget.parameters;
        if (!parameters) {
            return;
        }
        // Do some fixes on parameters
        parameters.forEach((param, i) => {
            // Case of a partial
            if (param.partial) {
                if (!partials[param.partial]) {
                    console.error("Cannot find partial for ", param.partial, partials);
                    return;
                }
                parameters[i] = partials[param.partial];
            }
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
        });
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
        // These are administrators
        if (this.#widget.hidden === true) {
            return false;
        }
        let grantStr = (this.#widget.for || '').trim();
        if (grantStr === '' || grantStr === '*' || userId <= 2) {
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
        return regex.exec(scope) != null;
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

/**
 * @param {string} s - string to the hashed
 * @returns {number}
 */
export function hashCode(s) {
    s = s || "";
    let h = 0;
    const l = s.length;
    let i = 0;
    if (l > 0) {
        while (i < l) {
            h = (h << 6) + ((s.charCodeAt(i) - 65) | 0);
            i++;
        }
    }
    return Math.abs(h);
}

/**
 * @param {string} str1
 * @param {string} needle
 * @returns {boolean} Whether str1 contains needle or not
 */
export function searchComp(str1, needle) {
    str1 = (str1 || '').trim().toLowerCase();
    needle = (needle || '').trim().toLowerCase();
    str1 = str1.replace(/[àáâãäå]/, "a")
        .replace(/[èéêë]/, "e")
        .replace(/[ìíîï]/, "i")
        .replace(/[òóôö]/, "o")
        .replace(/[ùúüû]/, "u")
        .replace(/ç/, "c")
        .replace(/·/, "");
    needle = needle.replace(/[àáâãäå]/, "a")
        .replace(/[èéêë]/, "e")
        .replace(/[ìíîï]/, "i")
        .replace(/[òóôö]/, "o")
        .replace(/[ùúüû]/, "u")
        .replace(/ç/, "c")
        .replace(/·/, "");
    return str1.indexOf(needle) >= 0;
}

/** Default transformers */
const Transformers = {
    // @ts-ignore
    "toUpperCase": function(txt) {
        return (txt + "").toUpperCase();
    },
    // @ts-ignore
    "toLowerCase": function(txt) {
        return (txt + "").toLowerCase();
    },
    // @ts-ignore
    "trim": function(txt) {
        return (txt + "").trim();
    },
    // @ts-ignore
    "ytId": function(txt) {
        // Finds the youtubeId in a text
        const rx = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
        const r = (txt || '').match(rx);
        if (r?.length) {
            return r[1];
        }
        return txt;
    },
    // @ts-ignore
    "vimeoId": function(txt) {
        const regExp = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?(\d+)/;
        const match = (txt || "").match(regExp);
        if (match?.[5]) {
            return match[5];
        }
        return txt;
    },
    // @ts-ignore
    "serveGDrive": function(txt) {
        // Expecting https://drive.google.com/file/d/1DDUzcFrOlzWb3CBdFPJ1NCNXClvPbm5B/preview
        const res = (txt + "").match(/https:\/\/drive.google.com\/file\/d\/([a-zA-Z0-9_]+)\//);
        if (res?.length) {
            const driveId = res[1];
            return "https://docs.google.com/uc?export=open&id=" + driveId;
        }
        return txt;
    },
    // @ts-ignore
    "removeHTML": function(txt) {
        return (txt || '').replace(/<[^>]*>?/gm, '');
    },
    // @ts-ignore
    "escapeHTML": function(txt) {
        return (txt || '').replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    // @ts-ignore
    "encodeHTML": function(txt) {
        // @ts-ignore
        return this.encodeURIComponent(txt || "");
    },
    // @ts-ignore
    "escapeQuotes": function(txt) {
        return (txt || '').replace(/"/gm, "'");
    }
};


class Builder {
    transSeq;
    // @ts-ignore
    constructor(transformStr) {
        const parts = transformStr.split('|');
        this.transSeq = [];
        for (let j = 0, lenj = parts.length; j < lenj; j++) {
            const prts = parts[j].trim();
            // @ts-ignore
            const transfunc = Transformers[prts];
            if (transfunc != null) {
                this.transSeq.push(transfunc);
            } else {
                console.error("Cannot find transformer named " + prts);
            }
        }
    }

    // @ts-ignore
    reduce(text) {
        for (let j = 0, lenj = this.transSeq.length; j < lenj; j++) {
            const transfunc = this.transSeq[j];
            text = transfunc(text);
        }
        return text;
    }
}

/**
 * @param {string} transformStr
 * @returns {Builder} call reduce(text) function
 */
export function stream(transformStr) {
    return new Builder(transformStr);
}

/**
 * @param {string} name
 * @returns {string} Replaces $ apperences by _ to make the name compatible by data attributes
 */
export function cleanParameterName(name) {
    return name.replace(/\$/g, '_');
}

/**
 * Creates a filter funcion from filterCode
 * @param {string} filterCode
 * @returns {Function?}
 */
export function createFilterFunction(filterCode) {
    filterCode = filterCode.replace('<!--<widgetcode>', '').replace('</widgetcode>-->', '');
    let userWidgetFilter = null;
    try {
        userWidgetFilter = new Function('text', 'tiny', 'opts', filterCode);
    } catch (ex) {
        userWidgetFilter = null;
        console.error(ex);
    }
    return userWidgetFilter;
}
/**
 * @param {import('./plugin').TinyMCE} editor
 * @param {string} widgetTemplate
 * @param {boolean} silent
 * @param {object?} mergevars
 * @returns {Promise<boolean>} - True if the filter can be compiled
 */
export async function applyWidgetFilter(editor, widgetTemplate, silent, mergevars) {
    const translations = await getStrings([
        {key: 'filterres', component: 'tiny_widgethub'},
        {key: 'nochanges', component: 'tiny_widgethub'}
    ]);
    // Es tracta d'un filtre, no d'un widget i s'ha de tractar de forma diferent
    const userWidgetFilter = createFilterFunction(widgetTemplate);

    if (!userWidgetFilter) {
        editor.notificationManager.open({
            text: translations[0] + ": Invalid filter",
            type: 'danger',
            timeout: 4000
        });
        return false;
    }
    // @ts-ignore
    const handleFilterResult = function(res) {
        const out = res[0];
        let msg = res[1];
        if (out != null) {
            if (typeof out === "string") {
                editor.setContent(out);
                editor.notificationManager.open({
                    text: translations[0] + ": " + msg,
                    type: 'success',
                    timeout: 5000
                });
            } else if (out === true) {
                editor.notificationManager.open({
                    text: translations[0] + ": " + msg,
                    type: 'success',
                    timeout: 5000
                });
            } else if (out === false && !silent) {
                editor.notificationManager.open({
                    text: translations[1],
                    type: 'info',
                    timeout: 4000
                });
            }
        } else if (!silent) {
            editor.notificationManager.open({
                text: translations[1],
                type: 'info',
                timeout: 4000
            });
        }
    };

    const initialHTML = editor.getContent();
    const filteredResult = userWidgetFilter(initialHTML, editor.dom.window, mergevars);
    // Hi ha la possibilitat que el filtre retorni una promesa o un array
    const isPromise = filteredResult != null && typeof (filteredResult) === 'object' && ('then' in filteredResult);
    if (isPromise) {
        filteredResult.then(handleFilterResult);
    } else {
        handleFilterResult(filteredResult || [null, translations[1]]);
    }
    return true;
}

/**
 * Safe conversion of a string to integer by handling errors and NaN values
 * In this case, the def number passed is returned
 * @param {string | undefined | null | number} str
 * @param {number} def - default value
 * @returns {number}
 */
export function convertInt(str, def) {
    if (str && typeof str === 'number') {
        return Math.floor(str);
    }
    if (!str || !(str + "").trim() || !RegExp(/^\s*[+-]?\d+(\.\d*)?\s*$/).exec(str + "")) {
        return def;
    }
    try {
        const val = parseInt(str + "");
        if (!isNaN(val)) {
            return val;
        }
    } catch (ex) {
        // Pass
    }
    return def;
}

/**
 * Finds the parameter with a given name within the list of objects
 * @param {string} varname
 * @param {Param[]} listVars
 * @returns {Param | null}
 */
export function findVariableByName(varname, listVars) {
    if (!listVars) {
        return null;
    }
    let found = null;
    const len = listVars.length;
    let k = 0;
    while (k < len && !found) {
        if (listVars[k].name === varname) {
            found = listVars[k];
        }
        k++;
    }
    return found;
}

/**
 * Safely joins two parts of an url
 * @param {string} a
 * @param {string=} b
 * @returns {string}
 */
export function pathJoin(a, b) {
    a = (a || "").trim();
    b = (b || "").trim();
    if (!a.endsWith('/')) {
        a = a + '/';
    }
    if (b.startsWith('/')) {
        b = b.substring(1);
    }
    return a + b;
}

/**
 * Adds the baseurl if the passed url does not start with http or https
 * @param {string} base
 * @param {string=} url
 * @returns {string}
 */
export function addBaseToUrl(base, url) {
    url = (url || "").trim();
    if (url.toLowerCase().startsWith("http")) {
        return url;
    }
    // Afegir la base
    const out = pathJoin(base, url);
    return out;
}
/**
 * Creates a script tag and adds it to the head section. It handles loading and error cases
 * @param {string} url
 * @param {string} [id]
 * @param {() => void} [onSuccess]
 * @param {() => void} [onError]
 */
export function addScript(url, id, onSuccess, onError) {
    if (id && document.head.querySelector('script#' + id) != null) {
        // Check if already in head
        return;
    }
    const newScript = document.createElement('script');
    newScript.type = "text/javascript";
    newScript.src = url;
    if (id) {
        newScript.setAttribute("id", id);
    }
    newScript.onload = () => {
        if (onSuccess) {
            onSuccess();
        }
    };
    newScript.onerror = function() {
        console.error("Error loading ", url);
        if (onError) {
            onError();
        }
    };
    document.head.append(newScript);
}

// @ts-ignore
const performCasting = function(value, type) {
    switch (type) {
        case ("boolean"):
            if (value === 1 || value === "1" || value === true || value === "true") {
                value = true;
            } else {
                value = false;
            }
            break;
        case ("number"):
            try {
                value = parseInt(value);
            } catch (ex) {
                console.error("Error parsing number", ex);
            }
            break;
        case ("string"):
            value = value + "";
            break;
    }
    return value;
};

/**
 * @param {unknown} a
 * @param {unknown} b
 */
const xor = function(a, b) {
    return !a !== !b;
};

/**
 *
 * @param {JQuery<HTMLElement>} $e
 * @returns
 */
const bindingFactory = function($e) {
    /** @this {Record<string, Function>} */
    const methods = {
        /**
         * @param {string} className
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        "hasClass": (className, query, neg) => {
            /** @type {JQuery<HTMLElement>} */
            let elem = $e;
            if (query) {
                elem = $e.find(query);
            }
            return {
                // @ts-ignore
                getValue: () => {
                    const res = xor(neg, elem.hasClass(className));
                    return Boolean(res);
                },
                // @ts-ignore
                setValue: (bool) => {
                    if (xor(neg, bool)) {
                        elem.addClass(className);
                    } else {
                        elem.removeClass(className);
                    }
                }
            };
        },
        /**
         * @param {string} className
         * @param {string=} query
         * @returns {Binding}
         */
        notHasClass: (className, query) => {
            return methods['hasClass'](className, query, true);
        },
        /**
         * @param {string} classExpr
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        "classRegex": (classExpr, query, castTo) => {
            let elem = $e;
            if (query) {
                elem = $e.find(query);
            }
            return {
                getValue: () => {
                    let ret = "";
                    // @ts-ignore
                    const cl = elem.attr('class')?.split(/\s+/) ?? [];
                    cl.forEach(c => {
                        const match = c.match(classExpr);
                        if (match?.[1] && typeof (match[1]) === "string") {
                            ret = match[1];
                        }
                    });
                    return performCasting(ret, castTo);
                },
                // @ts-ignore
                setValue: (val) => {
                    const cl = elem.attr('class')?.split(/\s+/) ?? [];
                    // @ts-ignore
                    cl.forEach(c => {
                        if (c.match(classExpr)) {
                            elem.removeClass(c);
                        }
                    });
                    elem.addClass(classExpr.replace("(.*)", val + ""));
                }
            };
        },
        /**
         * @param {string} attrName
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        "attr": (attrName, query, castTo) => {
            let elem = $e;
            if (query) {
                elem = $e.find(query);
            }
            return {
                getValue: () => {
                    return performCasting(elem.attr(attrName), castTo);
                },
                // @ts-ignore
                setValue: (val) => {
                    if (typeof val === "boolean") {
                        val = val ? 1 : 0;
                    }
                    return elem.attr(attrName, val + "");
                }
            };
        },
        /**
         * @param {string} attr
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        "hasAttr": (attr, query, neg) => {
            let elem = $e;
            if (query) {
                elem = $e.find(query);
            }
            const parts = attr.split("=");
            const attrName = parts[0].trim();
            let attrValue = '';
            if (parts.length > 1) {
                attrValue = parts[1].replace(/["']/g, '').trim();
            }
            return {
                getValue: () => {
                    let found = elem.attr(attrName) != null;
                    if (attrValue) {
                        found = found && elem.attr(attrName) === attrValue;
                    }
                    return xor(neg, found);
                },
                // @ts-ignore
                setValue: (bool) => {
                    if (xor(neg, bool)) {
                        elem.attr(attrName, attrValue || '');
                    } else {
                        elem.removeAttr(attrName);
                    }
                }
            };
        },
         /**
          * @param {string} attr
          * @param {string=} query
          * @returns {Binding}
          */
        "notHasAttr": (attr, query) => {
            return methods['hasAttr'](attr, query, true);
        },
        /**
         * @param {string} attr - Regex of attr
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        "attrRegex": function(attr, query, castTo) {
            let elem = $e;
            if (query) {
                elem = $e.find(query);
            }
            const parts = attr.split("=");
            const attrName = parts[0].trim();
            let attrValue = '';
            if (parts.length > 1) {
                attrValue = parts[1].replace(/["']/g, '').trim();
            }
            return {
                getValue() {
                    let found = elem.attr(attrName) != null;
                    if (found) {
                        const match = elem.attr(attrName)?.match(attrValue);
                        if (match?.[1] && typeof (match[1]) === "string") {
                            return performCasting(match[1], castTo);
                        }
                        return '';
                    }
                    return null;
                },
                // @ts-ignore
                setValue(val) {
                    elem.attr(attrName, attrValue.replace("(.*)", val + ""));
                }
            };
        },
        /**
         * @param {string} sty
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        "hasStyle": function(sty, query, neg) {
            let elem = $e;
            if (query) {
                elem = $e.find(query);
            }
            const parts = sty.split(":");
            let styName = parts[0].trim();
            /** @type {string | undefined} */
            let styValue;
            if (parts.length > 1) {
                styValue = parts[1].replace(/["']/g, '').trim();
            }
            return {
                getValue() {
                    const st = elem.prop('style');
                    const pValue = st.getPropertyValue(styName);
                    const has = styValue === undefined ? pValue !== '' : pValue === styValue;
                    return xor(has, neg);
                },
                // @ts-ignore
                setValue(bool) {
                    if (xor(bool, neg)) {
                        elem.css(styName, styValue ?? '');
                    } else {
                        const st = elem.prop('style');
                        st.removeProperty(styName);
                    }
                }
            };
        },
         /**
          * @param {string} sty
          * @param {string=} query
          * @returns {Binding}
          */
        "notHasStyle": (sty, query) => {
            return methods['hasStyle'](sty, query, true);
        },
        /**
         * @param {string} attr - styName:styValue where styValue is a regex with (.*)
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        "styleRegex": function(attr, query, castTo) {
            let elem = $e;
            if (query) {
                elem = $e.find(query);
            }
            const parts = attr.split(":");
            const styName = parts[0].trim();
            let styValue = '';
            if (parts.length > 1) {
                styValue = parts[1].replace(/["']/g, '').trim();
            }
            return {
                getValue() {
                    const st = elem.prop('style');
                    const has = st.getPropertyValue(styName) != null;
                    if (has) {
                        if (styValue) {
                            const match = st.getPropertyValue(styName).match(styValue);
                            if (match?.[1] && (typeof match[1]) === "string") {
                                return performCasting(match[1], castTo);
                            }
                        } else {
                            const match = st.getPropertyValue(styName);
                            return performCasting(match, castTo);
                        }
                        return '';
                    }
                    return null;
                },
                // @ts-ignore
                setValue(val) {
                    if (styValue) {
                        elem.css(styName, styValue.replace("(.*)", val + ""));
                    } else {
                        // @ts-ignore
                        elem.css(styName, val);
                    }
                }
            };
        }
    };
    return methods;
};

/**
 * @typedef {Object} Binding
 * @property {() => unknown} getValue
 * @property {(value: unknown) => void} setValue
 */
/**
 * @param {string | {get: string, set: string}} definition
 * @param {JQuery<HTMLElement>} elem  - The root of widget
 * @param {string=} castTo  - The type that must be returned
 * @returns {Binding | null}
 */
export const createBinding = (definition, elem, castTo) => {
    /** @type {Binding | null} */
    let bindFn = null;
    if (typeof (definition) === 'string') {
        return evalInContext({...bindingFactory(elem)}, definition, true);
    } else {
        // The user provides the get and set functions
        bindFn = {
            getValue: () => {
                let v = evalInContext({elem}, `(${definition.get})(elem)`);
                if (castTo) {
                    v = performCasting(v, castTo);
                }
                return v;
            },
            setValue: (v) => evalInContext({elem, v}, `(${definition.set})(elem, v)`)
        };
    }
    return bindFn;
};

/**
 * Capitalizes the first letter of a string
 * @param {string | undefined | null} s
 * @returns {string}
 */
export const capitalize = s => (s && s[0].toUpperCase() + s.slice(1)) || "";

/**
 * When creating a clone of an element must update all its id's
 * @param {JQuery<HTMLElement>} $e - The element to be treated
 * @param {JQuery<HTMLElement>} $target - The root element being cloned
 * @param {JQuery<HTMLElement>} $root - The root element providing the context
 * @param {Record<string, string>} idMap - A dictionary to store assigned id's
 */
const treatElementIds = function($e, $target, $root, idMap) {
    const oldId = $e.prop('id');
    if (oldId) {
        let newId = idMap[oldId];
        if (!newId) {
            const ext = Math.random().toString(32).substring(2, 5);
            newId = oldId + ext;
            idMap[oldId] = newId;
        }
        $e.prop('id', newId);
    }
    // Does $e contain references to another elements in the $root which are not in $target?
    ['data-target', 'data-bs-target', 'href'].forEach((dataX) => {
        const attr = $e.attr(dataX);
        if (attr?.startsWith("#")) {
            $e.removeClass('active show');
            const rootRef = $root.find(attr);
            const targetRef = $target.find(attr);
            if (rootRef.length) {
                if (targetRef.length) {
                    // Simply rename property
                    const oldId = attr.substring(1);
                    let newId = idMap[oldId];
                    if (!newId) {
                        const ext = Math.random().toString(32).substring(2, 5);
                        newId = oldId + ext;
                        idMap[oldId] = newId;
                    }
                    $e.attr(dataX, "#" + newId);
                } else {
                    // (TODO: Deep cloning here?) Must clone the reference as well
                    const newId = 'd' + Math.random().toString(32).substring(2);
                    const clonedRef = rootRef.clone().prop("id", newId);
                    $e.prop(dataX, "#" + newId);
                    clonedRef.insertAfter(rootRef).removeClass("active show");
                }
            }
        }
    });
};

/**
 * @param {JQuery<HTMLElement>} $e - the element that must be cloned
 * @param {JQuery<HTMLElement>} $root - the root element (widget root)
 * @param {Record<string,string>} idMap - old vs new id map
 * @returns {JQuery<HTMLElement>} The cloned element with new id's
 */
export const smartClone = ($e, $root, idMap) => {
    const clone = $e.clone();
    treatElementIds(clone, $e, $root, idMap);
    clone.find('*').each((_, e) => {
        treatElementIds(jQuery(e), $e, $root, idMap);
    });
    return clone;
};

/**
 * @param {JQuery<HTMLElement>} $e - Look in $e and all its descendants if references any other element in $root
 * @param {JQuery<HTMLElement>} $root
 * @returns {JQuery<HTMLElement>[]} - A list of referenced elements in $e
 */
export function findReferences($e, $root) {
    const searchFor = '[data-target^="#"], [data-bs-target^="#"], [href^="#"]';
    /** @type {HTMLElement[]} */
    const found = [];
    if ($e.is(searchFor)) {
        let attr = $e.attr('data-target') ?? $e.attr('data-bs-target') ?? $e.attr('href');
        if (attr) {
            found.push(...$root.find(attr).toArray());
        }
    }
    if (!found.length) {
        // Look in descendants
        const $descendants = $e.find(searchFor);
        if ($descendants.length) {
            let attr = $descendants.attr('data-target') ?? $descendants.attr('data-bs-target') ?? $descendants.attr('href');
            if (attr) {
                found.push(...$root.find(attr).toArray());
            }
        }
    }
    return found.map(e => jQuery(e));
}

/**
 * @param {string} color
 * @returns {string} - The color in hex format
 */
export function toHexColor(color) {
    if (!color) {
        return "#000000";
    } else if (color.trim().startsWith("#")) {
        return color.trim();
    }
    // Assume rgb
    const a = color.replace(/[^\d,]/g, "").split(",");
    return "#" + ((1 << 24) + (+a[0] << 16) + (+a[1] << 8) + +a[2]).toString(16).slice(1);
  }