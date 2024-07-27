/* eslint-disable no-console */
/* eslint-disable max-len */
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
 * @copyright   2024 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Mustache from 'core/mustache';

import {get_strings as getStrings} from 'core/str';

// Load on demand the template engines
let Ejs;
/**
 * @returns {Promise<EJS>}
 */
function getEJS() {
    if (Ejs) {
        return Promise.resolve(Ejs);
    }
    return new Promise((resolve, reject) => {
        require(['tiny_widgethub/ejs-lazy'], (ejsModule) => {
            Ejs = ejsModule;
            resolve(Ejs);
        }, reject);
    });
}

/**
 * @typedef {object} Shared
 * @property {string} currentScope
 * @property {string} SNPT_MODE
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
 * @param {object} ctx
 * @param {string} expr
 * @returns {any} The evaluated expression within the context ctx
 */
export function scopedEval(ctx, expr) {
    const listArgs = [];
    const listVals = [];
    // Remove functions from ctx
    if (ctx) {
        Object.keys(ctx).forEach((key) => {
            if (typeof ctx[key] !== "function") {
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

const defineVar = function(text, ctx2) {
    const pos = text.indexOf("=");
    const varname = text.substring(0, pos).trim();
    const varvalue = scopedEval(ctx2, text.substring(pos + 1).trim());
    ctx2[varname] = varvalue;
    return varname;
};

/**
 * Extends Mustache templates with some helpers
 * @param {object} ctx
 * @param {object} translations
 */
const applyMustacheHelpers = function(ctx, translations) {
    ctx["if"] = () => function(text, render) {
        const pos = text.indexOf("]");
        const condition = text.substring(0, pos).trim().substring(1);
        const show = scopedEval(ctx, condition);
        if (show) {
            return render(text.substring(pos + 1).trim());
        }
        return "";
    };
    ctx["var"] = () => function(text) {
        defineVar(text, ctx);
    };
    ctx["eval"] = () => function(text) {
        return scopedEval(ctx, text) + "";
    };
    ctx["I18n"] = () => function(text, render) {
        const key = render(text).trim();
        const dict = translations[key] || {};
        return dict[ctx["LANG"]] || dict["en"] || dict["ca"] || key;
    };
    ctx["each"] = () => function(text) {
        const pos = text.indexOf("]");
        const cond = text.substring(0, pos).trim().substring(1);
        const components = cond.split(",");
        const dim = components.length;
        const maxValues = new Array(dim);
        const loopVars = new Array(dim);
        let total = 1;
        const cc = 'i'.charCodeAt();
        components.forEach((def, i) => {
            const parts = def.split("=");
            if (parts.length === 1) {
                parts.unshift(String.fromCharCode(cc + i));
            }
            const cname = parts[0].trim();
            loopVars[i] = cname;
            const dm = scopedEval(ctx, parts[1]);
            total = total * dm;
            maxValues[i] = dm;
            ctx[cname] = 1;
        });
        let output = [];
        for (let _ei = 0; _ei < total; _ei++) {
            output.push(Mustache.render(text.substring(pos + 1), ctx));
            let currentDim = dim - 1;
            let incrUp;
            do {
                const oldValue = ctx[loopVars[currentDim]] - 1;
                const newValue = (oldValue + 1) % maxValues[currentDim] + 1;
                ctx[loopVars[currentDim]] = newValue;
                incrUp = newValue < oldValue;
                currentDim--;
            } while (currentDim >= 0 && incrUp);
        }
        return output.join('');
    };
    ctx["for"] = () => function(text) {
        const pos = text.indexOf("]");
        const condition = text.substring(0, pos).trim().substring(1);
        const parts = condition.split(";");
        const loopvar = defineVar(parts[0], ctx);
        let output = "";
        let maxIter = 0; // Prevent infinite loop imposing a limit of 1000
        while (scopedEval(ctx, parts[1]) && maxIter < 1000) {
            output += Mustache.render(text.substring(pos + 1), ctx);
            if (parts.length === 3 && parts[2].trim()) {
                defineVar(loopvar + "=" + parts[2]);
            } else {
                ctx[loopvar] = ctx[loopvar] + 1;
            }
            maxIter++;
        }
        return output;
    };
};

/**
 * @param {string} template
 * @param {object} context
 * @param {object | undefined} translations
 * @returns {string} The interpolated template given a context and translations map
 */
export function templateRendererMustache(template, context, translations) {
    const ctx = {...context};
    Object.keys(ctx).forEach(key => {
        if (ctx[key] === "$RND") {
            ctx[key] = genID();
        }
    });
    applyMustacheHelpers(ctx, translations || {});
    return Mustache.render(template, ctx);
}


/**
 * @param {string} template
 * @param {object} context
 * @param {object} translations
 * @returns {Promise<string>} The interpolated template given a context and translations map
 */
async function templateRendererEJS(template, context, translations) {
    const ctx = {...context, I18n: {}};
    Object.keys(ctx).forEach(key => {
        if (ctx[key] === "$RND") {
            ctx[key] = genID();
        }
    });
    const lang = ctx["LANG"];
    for (let wordKey in translations) {
        const dict = translations[wordKey];
        ctx["I18n"][wordKey] = dict[lang] || dict["en"] || dict["es"] || wordKey;
    }
    const _ejs = await getEJS();
    return _ejs.render(template, ctx);
}

/**
 * @param {string} template
 * @param {object} context
 * @param {object} translations
 * @param {string} engine (ejs | mustache) optional
 * @returns {Promise<string>} The interpolated template given a context and translations map
 */
export function templateRenderer(template, context, translations, engine) {
    if (!engine) {
        engine = template.includes("<%") ? "ejs" : "mustache";
    }
    if (engine === "ejs") {
        return templateRendererEJS(template, context, translations);
    }
    // Default to Mustache
    const tmpl = templateRendererMustache(template, context, translations);
    return Promise.resolve(tmpl);
}

/**
 * Wrapper for Widget definition
 */
export class WidgetWrapper {
    #widget;
    #instructionsParsed = false;

    /**
     * @param {WidgetWrapper} snpt
     * @param {Object} partials
     */
    constructor(snpt, partials) {
        // Do some fixes on parameters
        snpt.parameters?.forEach((param, i) => {
            // Case of a partial
            if (param.partial) {
                if (!partials[param.partial]) {
                    console.error("Cannot find partial for ", param.partial, partials);
                    return;
                }
                snpt.parameters[i] = partials[param.partial];
            }
            if (!param.type) {
                if (typeof param.value === "boolean") {
                    param.type = 'checkbox';
                } else if (typeof param.value === "number") {
                    param.type = 'numeric';
                } else if (typeof param.value === "string") {
                    param.type = param.options ? 'select' : 'textfield';
                }
            }
        });
        this.#widget = snpt;
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
     * @returns {Object}
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
        return this.#widget.category || "MISC";
    }
    get insertquery() {
        return this.#widget.insertquery;
    }
    /**
     * @returns {string}
     */
    get selectors() {
        return this.#widget.selectors;
    }
    /**
     * @returns {string}
     */
    get unwrap() {
        return this.#widget.uwrap;
    }
    get version() {
        return this.#widget.version || "1.0.0";
    }
    /**
     * @returns {string}
     */
    get instructions() {
        if (!this.#instructionsParsed) {
            this.#widget.instructions = decodeURIComponent(this.#widget.instructions);
            this.#instructionsParsed = true;
        }
        return this.#widget.instructions;
    }
    /**
     * @returns {object[]}
     */
    get parameters() {
        return this.#widget.parameters || [];
    }
    /**
     * @returns {object}
     */
    get defaults() {
        const obj = {};
        this.parameters.forEach((param) => {
            obj[param.name] = param.value;
        });
        return obj;
    }
    /**
     * @param {object} ctx
     * @returns {Promise<string>} The rendered template
     */
    render(ctx) {
        const defaultsCopy = {...this.defaults};
        const toInterpolate = Object.assign(defaultsCopy, ctx || {});
        // Decide which template engine to use
        let engine = this.#widget.engine;
        return templateRenderer(this.template ?? "", toInterpolate,
            this.#widget.I18n ?? {}, engine);
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
     * @param {string} scope
     * @returns {boolean}
     */
    isUsableInScope(scope) {
        scope = scope || Shared.currentScope;
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
     * @param {*} name
     * @returns {any}
     */
    prop(name) {
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
 * Defines local and session storage classes for a given
 * context (user & course)
 */
export class UserStorage {
    static _instances = {};
    _userId = 0;
    _courseId = 0;
    _localStore;
    _sessionStore;
    STORE_KEY;
    /**
     * @param {number} userId
     * @param {number} courseId
     * @static
     * @returns {UserStorage} - The instance
     */
    static getInstance(userId, courseId) {
        const key = userId + "_" + courseId;
        if (!UserStorage._instances[key]) {
            UserStorage._instances[key] = new UserStorage(userId, courseId);
        }
        return UserStorage._instances[key];
    }
    // Private constructor
    constructor(userId, courseId) {
        this._userId = userId;
        this._courseId = courseId;
        this.STORE_KEY = "iedib-widgets_" + userId;
        this._localStore = {valors: {}};
        this._sessionStore = {searchtext: ''};
        this.loadStore();
    }
    /**
     * @returns {void}
     */
    loadStore() {
        if (typeof window.localStorage !== 'undefined') {
            const txt = window.localStorage.getItem(this.STORE_KEY);
            if (txt) {
                try {
                    this._localStore = JSON.parse(txt);
                } catch (ex) {
                    console.error(ex);
                }
            }
        }
        // Added storage for this _course
        if (!this._localStore["_" + this._courseId]) {
            this._localStore["_" + this._courseId] = {};
        }
        if (typeof window.sessionStorage !== 'undefined') {
            const txt2 = window.sessionStorage.getItem(this.STORE_KEY);
            if (txt2) {
                try {
                    this._sessionStore = JSON.parse(txt2);
                } catch (ex) {
                    console.error(ex);
                }
            }
        }
    }
    /**
     * @template T
     * @param {string} key
     * @param {T} defaultValue
     * @returns {T}
     */
    getFromLocal(key, defaultValue) {
        if (!this._localStore) {
            return defaultValue;
        }
        const MLSC = this._localStore["_" + this._courseId]; // Almost everything goes here
        const MLS = this._localStore; // Only configuration params
        if (MLSC) {
            return MLSC[key] || MLS[key] || defaultValue;
        } else if (MLS) {
            return MLS[key] || defaultValue;
        }
        return defaultValue;
    }
    /**
     * @template T
     * @param {string} key
     * @param {T} defaultValue
     * @returns {T}
     */
    getFromSession(key, defaultValue) {
        return (this._sessionStore[key] != null ? this._sessionStore[key] : defaultValue);
    }
    /**
     * @param {'local' | 'session' | undefined} type
     */
    saveStore(type) {
        if (type === 'local' && typeof window.localStorage !== 'undefined') {
            window.localStorage.setItem(this.STORE_KEY, JSON.stringify(this._localStore));
        } else if (type === 'session' && typeof window.sessionStorage !== 'undefined') {
            window.sessionStorage.setItem(this.STORE_KEY, JSON.stringify(this._sessionStore));
        } else if (type == null) {
            if (typeof window.localStorage !== 'undefined') {
                window.localStorage.setItem(this.STORE_KEY, JSON.stringify(this._localStore));
            }
            if (typeof window.sessionStorage !== 'undefined') {
                window.sessionStorage.setItem(this.STORE_KEY, JSON.stringify(this._sessionStore));
            }
        }
    }
    /**
     * @template T
     * @param {string} key
     * @param {T} value
     * @param {boolean} persist
     * @returns {void}
     */
    setToLocal(key, value, persist) {
        if (this._localStore == null) {
            return;
        }
        const MLSC = this._localStore["_" + this._courseId]; // Almost everything goes here
        const MLS = this._localStore; // Only configuration params

        if (typeof (theValueMap) === 'object') {
            if (MLSC && key === 'saveall_data' || key === 'valors') {
                MLSC[key] = MLSC[key] || {};
            } else {
                MLS[key] = MLS[key] || {};
            }
            const keys = Object.keys(value);
            for (let i = 0, len = keys.length; i < len; i++) {
                const theKey = keys[i];
                const val = value[theKey];
                if (MLSC && key === 'saveall_data' || key === 'valors') {
                    MLSC[key][theKey] = val;
                } else {
                    MLS[key][theKey] = val;
                }
            }
        } else {
            MLS[key] = value;
        }
        if (persist) {
            this.saveStore("local");
        }
    }
    /**
     * @template T
     * @param {string} key
     * @param {T} value
     * @param {boolean} persist
     * @returns {void}
     */
    setToSession(key, value, persist) {
        if (typeof (value) === 'object') {
            this._sessionStore[key] = this._sessionStore[key] || {};
            const keys = Object.keys(value);
            for (let i = 0, len = keys.length; i < len; i++) {
                const theKey = keys[i];
                const val = value[theKey];
                this._sessionStore[key][theKey] = val;
            }
        } else {
            this._sessionStore[key] = value;
        }
        if (persist) {
            this.saveStore("session");
        }
    }

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
    "toUpperCase": function(txt) {
        return (txt + "").toUpperCase();
    },
    "toLowerCase": function(txt) {
        return (txt + "").toLowerCase();
    },
    "trim": function(txt) {
        return (txt + "").trim();
    },
    "ytId": function(txt) {
        // Finds the youtubeId in a text
        const rx = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
        const r = (txt || '').match(rx);
        if (r?.length) {
            return r[1];
        }
        return txt;
    },
    "vimeoId": function(txt) {
        const regExp = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?(\d+)/;
        const match = (txt || "").match(regExp);
        if (match?.[5]) {
            return match[5];
        }
        return txt;
    },
    "serveGDrive": function(txt) {
        // Expecting https://drive.google.com/file/d/1DDUzcFrOlzWb3CBdFPJ1NCNXClvPbm5B/preview
        const res = (txt + "").match(/https:\/\/drive.google.com\/file\/d\/([a-zA-Z0-9_]+)\//);
        if (res?.length) {
            const driveId = res[1];
            return "https://docs.google.com/uc?export=open&id=" + driveId;
        }
        return txt;
    },
    "removeHTML": function(txt) {
        return (txt || '').replace(/<[^>]*>?/gm, '');
    },
    "escapeHTML": function(txt) {
        return (txt || '').replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    "encodeHTML": function(txt) {
        return this.encodeURIComponent(txt || "");
    },
    "escapeQuotes": function(txt) {
        return (txt || '').replace(/"/gm, "'");
    }
};


class Builder {
    transSeq;
    constructor(transformStr) {
        const parts = transformStr.split('|');
        this.transSeq = [];
        for (let j = 0, lenj = parts.length; j < lenj; j++) {
            const prts = parts[j].trim();
            const transfunc = Transformers[prts];
            if (transfunc != null) {
                this.transSeq.push(transfunc);
            } else {
                console.error("Cannot find transformer named " + prts);
            }
        }
    }

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
 * @param {tinyMCE} editor
 * @param {string} widgetTemplate
 * @param {boolean} silent
 * @param {object?} mergevars
 * @returns {boolean} - True if the filter can be compiled
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
        handleFilterResult(filteredResult || [null, "El filter no ha produït canvis"]);
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
    if (!str || !(str + "").trim() || !(str + "").match(/^\s*[+-]?\d+(\.\d*)?\s*$/)) {
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
 * @param {WidgetParameter[]} listVars
 * @returns {WidgetParameter | null}
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
 * @param {string?} b
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
 * @param {string?} url
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
 * @param {string | undefined} id
 * @param {function() | undefined} onSuccess
 * @param {function() | undefined} onError
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
        console.info("Loaded ", url);
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

const BindingFactory = {
    "hasClass": class {
        constructor(elem, className, castTo, neg) {
            this.elem = elem;
            this.castTo = castTo;
            this.neg = neg;
            this.className = className;
        }
        getValue() {
            // ^ XOR gate
            const res = this.neg ^ this.elem.classList.contains(this.className);
            return this.castTo === 'boolean' ? Boolean(res) : res;
        }
        setValue(bool) {
            if (this.neg ^ bool) {
                this.elem.classList.add(this.className);
            } else {
                this.elem.classList.remove(this.className);
            }
        }
    },
    "classRegex": class {
        constructor(elem, classExpr, castTo) {
            this.elem = elem;
            this.castTo = castTo;
            this.classExpr = classExpr;
        }
        getValue() {
            let ret = "";
            this.elem.classList.forEach(c => {
                const match = c.match(this.classExpr);
                if (match?.[1] && typeof (match[1]) === "string") {
                    ret = match[1];
                }
            });
            return performCasting(ret, this.castTo);
        }
        setValue(val) {
            const cl = this.elem.classList;
            cl.forEach(c => {
                if (c.match(this.classExpr)) {
                    cl.remove(c);
                }
            });
            cl.add(this.classExpr.replace("(.*)", val + ""));
        }
    },
    "attr": class {
        constructor(elem, attrName, castTo) {
            this.elem = elem;
            this.castTo = castTo;
            this.attrName = attrName;
        }
        getValue() {
            return performCasting(this.elem.getAttribute(this.attrName), this.castTo);
        }
        setValue(val) {
            if (typeof val === "boolean") {
                val = val ? 1 : 0;
            }
            return this.elem.setAttribute(this.attrName, val + "");
        }
    },
    "hasAttr": class {
        constructor(elem, attr, castTo, neg) {
            this.elem = elem;
            this.castTo = castTo;
            this.neg = neg;
            const parts = attr.split("=");
            this.attrName = parts[0].trim();
            if (parts.length > 1) {
                this.attrValue = parts[1].replace(/["']/g, '').trim();
            }
        }
        getValue() {
            let found = this.elem.getAttribute(this.attrName) != null;
            if (this.attrValue) {
                found = found && this.elem.getAttribute(this.attrName) === this.attrValue;
            }
            const res = this.neg ^ found;
            if (this.castTo === "boolean") {
                return Boolean(res);
            } else {
                return res;
            }
        }
        setValue(bool) {
            if (this.neg ^ bool) {
                this.elem.setAttribute(this.attrName, this.attrValue || '');
            } else {
                this.elem.removeAttribute(this.attrName);
            }
        }
    },
    "attrRegex": class {
        constructor(elem, attr, castTo) {
            this.elem = elem;
            this.castTo = castTo;
            const parts = attr.split("=");
            this.attrName = parts[0].trim();
            if (parts.length > 1) {
                this.attrValue = parts[1].replace(/["']/g, '').trim();
            }
        }
        getValue() {
            let found = this.elem.getAttribute(this.attrName) != null;
            if (found) {
                const match = this.elem.getAttribute(this.attrName).match(this.attrValue);
                if (match?.[1] && typeof (match[1]) === "string") {
                    return performCasting(match[1], this.castTo);
                }
                return '';
            }
            return null;
        }
        setValue(val) {
            this.elem.setAttribute(this.attrName, this.attrValue.replace("(.*)", val + ""));
        }
    },
    "hasStyle": class {
        constructor(elem, attr, castTo, neg) {
            this.elem = elem;
            this.castTo = castTo;
            this.neg = neg;
            const parts = attr.split(":");
            this.styName = parts[0].trim();
            if (parts.length > 1) {
                this.styValue = parts[1].replace(/["']/g, '').trim();
            }
        }
        getValue() {
            const st = this.elem.style;
            const has = st.getPropertyValue(this.styName) === this.styValue;
            const res = has ^ this.neg;
            if (this.castTo === "boolean") {
                return Boolean(res);
            } else {
                return res;
            }
        }
        setValue(bool) {
            if (bool ^ this.neg) {
                this.elem.style.setProperty(this.styName, this.styValue);
            } else {
                this.elem.style.removeProperty(this.styName);
            }
        }
    },
    "styleRegex": class {
        constructor(elem, attr, castTo) {
            this.elem = elem;
            this.castTo = castTo;
            const parts = attr.split(":");
            this.styName = parts[0].trim();
            if (parts.length > 1) {
                this.styValue = parts[1].replace(/["']/g, '').trim();
            }
        }
        getValue() {
            const st = this.elem.style;
            const has = st.getPropertyValue(this.styName) != null;
            if (has) {
                const match = st.getPropertyValue(this.styName).match(this.styValue);
                if (match?.[1] && (typeof match[1]) === "string") {
                    return performCasting(match[1], this.castTo);
                }
                return '';
            }
            return null;
        }
        setValue(val) {
            this.elem.style.setProperty(this.styName, this.styValue.replace("(.*)", val + ""));
        }
    }
};

/**
 * @param {string} definition
 * @param {HTMLElement} elem  - The root of widget
 * @param {string} castTo  - The type that must be returned
 * @returns {BindingFactory}
 */
export const parseBinding = (definition, elem, castTo) => {
    if (!definition || !elem) {
        return null;
    }
    const regex = /^\s*(?:<([^<>]+)>)?\s*(not\s+)?(classRegex|hasClass|styleRegex|hasStyle|attr|attrRegex|hasAttr)\s+<([^<>]+)>\s*$/g;
    const m = regex.exec(definition);
    if (m) {
        if (m[1]) {
            // Rule applied to a child of the main widget node
            elem = elem.querySelector(m[1]);
        }
        const neg = m[2] !== undefined;
        const type = m[3];
        const params = m[4];
        return new BindingFactory[type](elem, params, castTo, neg);
    }
    return null;
};

/**
 * Capitalizes the first letter of a string
 * @param {string | undefined | null} s
 * @returns {string}
 */
export const capitalize = s => (s && s[0].toUpperCase() + s.slice(1)) || "";