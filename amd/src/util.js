/* eslint-disable no-console */
/* eslint-disable no-eq-null */
/* eslint-disable no-bitwise */
/* eslint-disable no-new-func */
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
import jQuery from 'jquery';

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
    /** @param {string} txt */
    toUpperCase: function(txt) {
        return (txt + "").toUpperCase();
    },
    /** @param {string} txt */
    toLowerCase: function(txt) {
        return (txt + "").toLowerCase();
    },
    /** @param {string} txt */
    trim: function(txt) {
        return (txt + "").trim();
    },
    /** @param {string} txt */
    ytId: function(txt) {
        // Finds the youtubeId in a text
        const rx = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
        const r = (txt || '').match(rx);
        if (r?.length) {
            return r[1];
        }
        return txt;
    },
    /** @param {string} txt */
    vimeoId: function(txt) {
        const regExp = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?(\d+)/;
        const match = new RegExp(regExp).exec(txt || "");
        if (match?.[5]) {
            return match[5];
        }
        return txt;
    },
    /** @param {string} txt */
    serveGDrive: function(txt) {
        // Expecting https://drive.google.com/file/d/1DDUzcFrOlzWb3CBdFPJ1NCNXClvPbm5B/preview
        const res = (txt + "").match(/https:\/\/drive.google.com\/file\/d\/([a-zA-Z0-9_]+)\//);
        if (res?.length) {
            const driveId = res[1];
            return "https://docs.google.com/uc?export=open&id=" + driveId;
        }
        return txt;
    },
    /** @param {string} txt */
    removeHTML: function(txt) {
        return (txt || '').replace(/<[^>]*>?/gm, '');
    },
    /** @param {string} txt */
    escapeHTML: function(txt) {
        return (txt || '').replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    /** @param {string} txt */
    encodeHTML: function(txt) {
        // @ts-ignore
        return encodeURIComponent(txt || "");
    },
    /** @param {string} txt */
    escapeQuotes: function(txt) {
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
    let userWidgetFilter = null;
    try {
        userWidgetFilter = new Function('text', 'editor', 'opts', filterCode);
    } catch (ex) {
        userWidgetFilter = null;
        console.error(ex);
    }
    return userWidgetFilter;
}

/**
 * @param {import('./plugin').TinyMCE} editor
 * @param {{get_strings: (keyComponent: any[]) => Promise<string[]>}} coreStr - dependency on core/str
 * @returns {*}
 */
export function applyWidgetFilterFactory(editor, coreStr) {
    /**
     * @param {string} widgetTemplate
     * @param {boolean} silent
     * @param {object?} mergevars
     * @returns {Promise<boolean>} - True if the filter can be compiled
     */
    return async(widgetTemplate, silent, mergevars) => {
        const translations = await coreStr.get_strings([
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
                        timeout: 5000
                    });
                }
            } else if (!silent) {
                editor.notificationManager.open({
                    text: translations[1],
                    type: 'info',
                    timeout: 5000
                });
            }
        };

        const initialHTML = editor.getContent();
        const filteredResult = userWidgetFilter(initialHTML, editor, mergevars);
        // Hi ha la possibilitat que el filtre retorni una promesa o un array
        const isPromise = filteredResult != null && typeof (filteredResult) === 'object' && ('then' in filteredResult);
        if (isPromise) {
            filteredResult.then(handleFilterResult).catch((/** @type {any} */ err) => console.error(err));
        } else {
            handleFilterResult(filteredResult || [null, translations[1]]);
        }
        return true;
    };
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
 * @param {import('./options').Param[]} listVars
 * @returns {import('./options').Param | null}
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
 * @param {*} value
 * @param {string | undefined} type
 * @returns {*}
 */
export const performCasting = function(value, type) {
    if (!type || typeof value === type) {
        return value;
    }
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
                let parsed;
                if ((value + '').indexOf(".") < 0) {
                    parsed = parseInt(value);
                } else {
                    parsed = parseFloat(value);
                }
                if (!isNaN(parsed)) {
                    value = parsed;
                } else {
                    value = 0;
                    console.error(`Error parsing number ${value}`);
                }
            } catch (ex) {
                value = 0;
                console.error(`Error parsing number ${value}`);
            }
            break;
        case ("string"):
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            } else {
                value = value + "";
            }
            break;
        default:
            console.error(`Fail to cast ${value} to ${type}`);
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
 * @param {string} str
 * @param {*} match
 * @param {string} replacement
 * @returns {string}
 */
const replaceStrPart = function(str, match, replacement) {
    if (!match.indices) {
        console.error("RegExp match does not include indices");
        return str;
    }
    const [a, b] = match.indices[1];
    return str.substring(0, a) + replacement + str.substring(b);
};

/**
 * Replaces the first capturing group in regexExpr by replacement,
 * The remaining capturing groups are removed.
 * @param {string} regexExpr
 * @param {string} replacement
 * @returns {string}
 */
const getValueFromRegex = function(regexExpr, replacement) {
    const reParser = /\((?!\?:).*?\)/g;
    let capturingGroupCount = 0;
    return regexExpr.replace(reParser, () => {
        capturingGroupCount++;
        if (capturingGroupCount === 1) {
            return replacement + '';
        }
        return ""; // Remove all other capturing groups
    });
};

/**
 * @param {Element} el - The target element
 * @returns
 */
const bindingFactory = function(el) {
    /** @this {Record<string, Function>} */
    const methods = {
        /**
         * @param {string} className
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        hasClass: (className, query, neg) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            return {
                // @ts-ignore
                getValue: () => {
                    const res = xor(neg, elem?.classList?.contains(className));
                    return Boolean(res);
                },
                // @ts-ignore
                setValue: (bool) => {
                    if (xor(neg, bool)) {
                        elem?.classList.add(className);
                    } else {
                        elem?.classList.remove(className);
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
            return methods.hasClass(className, query, true);
        },
        /**
         * @param {string} classExpr
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        classRegex: (classExpr, query, castTo) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            return {
                getValue: () => {
                    let ret = '';
                    const classes = Array.from(elem?.classList ?? []);
                    for (const clazz of classes) {
                        const match = new RegExp(classExpr).exec(clazz);
                        if (match?.[1] && typeof (match[1]) === "string") {
                            ret = match[1];
                            break;
                        }
                    }
                    return performCasting(ret, castTo);
                },
                setValue: (val) => {
                    const cl = Array.from(elem?.classList ?? []);
                    let found = false;
                    cl.forEach(c => {
                        const match = new RegExp(classExpr, 'd').exec(c);
                        if (match === null) {
                            return;
                        }
                        found = true;
                        elem?.classList.remove(c);
                        const newCls = replaceStrPart(c, match, val + '');
                        elem?.classList.add(newCls);
                    });
                    // If not found, then set the regExp replacing the
                    // first capturing group with val, and removing the remaining groups.
                    if (!found) {
                        const newCls = getValueFromRegex(classExpr, val + '');
                        elem?.classList.add(newCls);
                    }
                }
            };
        },
        /**
         * @param {string} attrName
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        attr: (attrName, query, castTo) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            return {
                getValue: () => {
                    let attrValue = elem?.getAttribute(attrName);
                    if (attrName.indexOf('-bs-') > 0) {
                        attrValue = attrValue ?? elem?.getAttribute(attrName.replace('-bs-', '-'));
                    }
                    return performCasting(attrValue, castTo);
                },
                // @ts-ignore
                setValue: (val) => {
                    if (typeof val === "boolean") {
                        val = val ? 1 : 0;
                    }
                    const attrVal = val + '';
                    elem?.setAttribute(attrName, attrVal);
                    if (attrName.indexOf('-bs-') > 0) {
                        // Save as old bs
                        elem?.setAttribute(attrName.replace('-bs-', '-'), attrVal);
                    }
                    if (attrName === 'href' || attrName === 'src') {
                        elem?.setAttribute('data-mce-' + attrName, attrVal);
                    }
                }
            };
        },
        /**
         * Adapted to take into account both data- and data-bs- for Boostrap 4 & 5 compatibility.
         * @param {string} attrName - Name without data- nor data-bs-
         * @param {string=} query
         * @param {string=} castTo
         * @param {number=} version - 4 or 5 depending the version of BS currently using
         * @returns {Binding}
         */
        attrBS: (attrName, query, castTo, version) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            return {
                getValue: () => {
                    // If version=4 it has preference BS4 over BS5, it will not remove BS4 prefix
                    let p1 = '';
                    let p2 = 'bs-';
                    if (version === 5) {
                        p1 = p2;
                        p2 = '';
                    }
                    let value = elem?.getAttribute('data-' + p1 + attrName);
                    if (value === undefined) {
                        value = elem?.getAttribute('data-' + p2 + attrName);
                    }
                    return performCasting(value || '', castTo);
                },
                // @ts-ignore
                setValue: (val) => {
                    if (typeof val === "boolean") {
                        val = val ? 1 : 0;
                    }
                    const attrVal = val + '';
                    elem?.setAttribute('data-bs-' + attrName, attrVal);
                    if (version === 5) {
                        elem?.removeAttribute('data-' + attrName);
                    } else {
                        elem?.setAttribute('data-' + attrName, attrVal);
                    }
                }
            };
        },
        /**
         * @param {string} attr
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        hasAttr: (attr, query, neg) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            const parts = attr.split("=");
            const attrName = parts[0].trim();
            let attrValue = '';
            if (parts.length > 1) {
                attrValue = parts[1].trim();
            }
            return {
                getValue: () => {
                    let found = elem?.getAttribute(attrName) != null;
                    if (attrValue) {
                        found = found && elem?.getAttribute(attrName) === attrValue;
                    }
                    return xor(neg, found);
                },
                // @ts-ignore
                setValue: (bool) => {
                    if (xor(neg, bool)) {
                        elem?.setAttribute(attrName, attrValue || '');
                        if (attrName === 'href' || attrName === 'src') {
                            elem?.setAttribute('data-mce-' + attrName, attrValue + '');
                        }
                    } else {
                        elem?.removeAttribute(attrName);
                        if (attrName === 'href' || attrName === 'src') {
                            elem?.removeAttribute('data-mce-' + attrName);
                        }
                    }
                }
            };
        },
        /**
         * Variant to check for compatibility between Bootstrap 4 and 5.
         * @param {string} attr - attr name without data- nor data-bs-
         * @param {string=} query
         * @param {boolean=} neg
         * @param {number=} version - 4 or 5
         * @returns {Binding}
         */
        hasAttrBS: (attr, query, neg, version) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            const parts = attr.split("=");
            const attrName = parts[0].trim();
            let attrValue = '';
            if (parts.length > 1) {
                attrValue = parts[1].trim();
            }
            const getValuePrefix = (/** @type{string} **/ prefix) => {
                let found = elem?.getAttribute(prefix + attrName) != null;
                if (attrValue) {
                    found = found && elem?.getAttribute(prefix + attrName) === attrValue;
                }
                return xor(neg, found);
            };
            return {
                getValue: () => {
                    let p1 = 'data-';
                    let p2 = 'data-bs-';
                    if (version === 5) {
                        p2 = p1;
                        p1 = 'data-bs-';
                    }
                    return getValuePrefix(p1) || getValuePrefix(p2);
                },
                // @ts-ignore
                setValue: (bool) => {
                    if (xor(neg, bool)) {
                        elem?.setAttribute('data-bs-' + attrName, attrValue || '');
                        if (version === 5) {
                            elem?.removeAttribute('data-' + attrName);
                        } else {
                            elem?.setAttribute('data-' + attrName, attrValue || '');
                        }
                    } else {
                        elem?.removeAttribute('data-' + attrName);
                        elem?.removeAttribute('data-bs-' + attrName);
                    }
                }
            };
        },
        /**
         * @param {string} attr
         * @param {string=} query
         * @returns {Binding}
         */
        notHasAttr: (attr, query) => {
            return methods.hasAttr(attr, query, true);
        },
        /**
         * @param {string} attr - Regex of attr
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        attrRegex: function(attr, query, castTo) {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            const parts = attr.split("=");
            const attrName = parts[0].trim();
            let attrValue = '';
            if (parts.length > 1) {
                attrValue = parts[1].trim();
            }
            return {
                getValue() {
                    const found = elem?.getAttribute(attrName) != null;
                    if (found) {
                        const match = elem?.getAttribute(attrName)?.match(attrValue);
                        if (match?.[1] && typeof (match[1]) === "string") {
                            return performCasting(match[1], castTo);
                        }
                        return '';
                    }
                    return null;
                },
                setValue(val) {
                    const oldValue = elem?.getAttribute(attrName) ?? '';
                    const match = new RegExp(attrValue, 'd').exec(oldValue);
                    let newValue;
                    if (match) {
                        newValue = replaceStrPart(oldValue, match, val + '');
                    } else {
                        newValue = getValueFromRegex(attrValue, val + '');
                    }
                    elem?.setAttribute(attrName, newValue);
                    if (attrName === 'href' || attrName === 'src') {
                        elem?.setAttribute('data-mce-' + attrName, newValue + '');
                    }
                }
            };
        },
        /**
         * @param {string} sty
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        hasStyle: function(sty, query, neg) {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            const parts = sty.split(":");
            let styName = parts[0].trim();
            /** @type {string | undefined} */
            let styValue;
            if (parts.length > 1) {
                styValue = parts[1].trim();
            }
            return {
                getValue() {
                    // @ts-ignore
                    const st = elem?.style;
                    const pValue = st.getPropertyValue(styName);
                    const has = styValue === undefined ? pValue !== '' : pValue === styValue;
                    return xor(has, neg);
                },
                // @ts-ignore
                setValue(bool) {
                    // @ts-ignore
                    const st = elem?.style;
                    if (xor(bool, neg)) {
                        st?.setProperty(styName, styValue ?? '');
                    } else {
                        st?.removeProperty(styName);
                    }
                    // TODO: better way to update data-mce-style
                    elem?.setAttribute('data-mce-style', st?.cssText ?? '');
                }
            };
        },
        /**
         * @param {string} sty
         * @param {string=} query
         * @returns {Binding}
         */
        notHasStyle: (sty, query) => {
            return methods.hasStyle(sty, query, true);
        },
        /**
         * @param {string} attr - styName:styValue where styValue is a regex with (.*)
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        styleRegex: function(attr, query, castTo) {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            const parts = attr.split(":");
            const styName = parts[0].trim();
            let styValue = '';
            if (parts.length > 1) {
                styValue = parts[1].trim();
            }
            return {
                /** @returns {string | null} */
                getValue() {
                    // @ts-ignore
                    const st = elem?.style;
                    const currentVal = st?.getPropertyValue(styName);
                    if (currentVal) {
                        if (styValue) {
                            const match = new RegExp(styValue).exec(currentVal);
                            if (match?.[1] && (typeof match[1]) === "string") {
                                return performCasting(match[1], castTo);
                            }
                        } else {
                            return performCasting(currentVal, castTo);
                        }
                    }
                    return performCasting('', castTo);
                },
                // @ts-ignore
                setValue(val) {
                    let newValue;
                    // @ts-ignore
                    const st = elem?.style;
                    if (styValue) {
                        // Case val <= 0 && styName contains width or height
                        if ((styName.includes("width") || styName.includes("height")) && (parseFloat(val + '') <= 0)) {
                            newValue = '';
                        } else {
                            const oldValue = st?.getPropertyValue(styName) ?? '';
                            if (oldValue) {
                                const match = new RegExp(styValue, 'd').exec(oldValue);
                                // @ts-ignore
                                newValue = replaceStrPart(oldValue, match, val + '');
                            } else {
                                newValue = styValue.replace('(.*)', val + '');
                            }
                        }
                    } else {
                        newValue = val + '';
                    }
                    st?.setProperty(styName, newValue);
                    // TODO: better way to update data-mce-style
                    elem?.setAttribute('data-mce-style', st?.cssText || '');
                }
            };
        }
    };
    return methods;
};

/**
 * @typedef {Object} Binding
 * @property {() => unknown} getValue
 * @property {(value: string | boolean | number) => void} setValue
 */
/**
 * @param {string | {get?: string, set?: string, getValue?: string, setValue?: string}} definition
 * @param {Element} elem  - The root of widget
 * @param {string=} castTo  - The type that must be returned
 * @returns {Binding | null}
 */
export const createBinding = (definition, elem, castTo) => {
    /** @type {Binding | null} */
    let bindFn = null;
    if (typeof (definition) === 'string') {
        return evalInContext({...bindingFactory(elem)}, definition, true);
    } else {
        // The user provides the get and set functions (for jQuery element) @deprecated
        // or getValue, setValue (for vanilla JS elements)
        bindFn = {
            getValue: () => {
                let v;
                if (definition.getValue) {
                    v = evalInContext({elem}, `(${definition.getValue})(elem)`);
                } else if (definition.get) {
                    // @Deprecated. It will be removed in the future.
                    v = evalInContext({elem: jQuery(elem)}, `(${definition.get})(elem)`);
                }
                if (castTo) {
                    v = performCasting(v, castTo);
                }
                return v;
            },
            setValue: (v) => {
                if (definition.setValue) {
                    evalInContext({elem, v}, `(${definition.setValue})(elem, v)`);
                } else if (definition.set) {
                    // @Deprecated. It will be removed in the future.
                    evalInContext({elem: jQuery(elem), v}, `(${definition.set})(elem, v)`);
                }
            }
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
 * @param {string | null | undefined} color - color in hex or rgb or rgba
 * @returns {[string, number]} - The color in hex format, alpha channel 0..1
 */
export function toHexAlphaColor(color) {
    color = (color || '#000000').trim().toLowerCase();
    let alpha = 1;
    if (color.startsWith("#") && color.length === 9) {
        // Already in hex & alpha
        alpha = parseInt('0x' + color.substring(7)) / 255.0;
        color = color.substring(0, 7);
    } else if (color.startsWith('rgb')) {
        // Assume rgb or rgba
        const sep = color.indexOf(",") > -1 ? "," : " ";
        const a = color.replace(/[^\d,]/g, "").split(sep);
        color = "#" + ((1 << 24) + (+a[0] << 16) + (+a[1] << 8) + (+a[2])).toString(16).slice(1);
        // Is rgba?
        if (a.length === 4) {
            alpha = +a[3];
            if (alpha > 1) {
                alpha = 0.01 * alpha;
            }
        }
    }
    return [color, alpha];
}

/**
 * @param {string | null | undefined} hex - color in hex
 * @param {number} alpha - 0..1 or 0..100
 * @returns {string} - The color in rgba syntax
 */
export function toRgba(hex, alpha) {
    hex = (hex || '#000000').trim().toLowerCase();
    /** @type {number | string} */
    let alpha2 = alpha ?? 1;
    if (alpha2 > 1) {
        alpha2 *= 0.01;
    }
    if (alpha2 !== 0 && alpha2 !== 1) {
        alpha2 = alpha2.toFixed(2);
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
    let r = 0,
        g = 0,
        b = 0;
    if (result) {
        r = parseInt(result[1], 16);
        g = parseInt(result[2], 16);
        b = parseInt(result[3], 16);
    }
    if (alpha === 1) {
        return `rgb(${r},${g},${b})`;
    }
    return `rgba(${r},${g},${b},${alpha2})`;
}

/**
 * Simple debounce function
 * @param {(evt?: any) => void} cb
 * @param {number} [delay]
 */
/**
 * Simple debounce function
 * @param {(...args: unknown[]) => void} cb
 * @param {number} [delay]
 * @returns {((...args: unknown[]) => void) & {clear: () => void}}
 */
export function debounce(cb, delay = 1000) {
    /** @type{number | null} */
    let timeoutId = null;
    const debounced = (/** @type {unknown[]} */ ...args) => {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(() => {
            cb(...args);
        }, delay);
    };
    debounced.clear = () => {
        if (!timeoutId) {
            return;
        }
        window.clearTimeout(timeoutId);
        timeoutId = null;
    };
    return debounced;
}

/**
 * @param {HTMLElement} elem
 * @param {...string} classNames
 */
export function toggleClass(elem, ...classNames) {
    const classList = elem.classList;
    classNames.forEach(name => {
        if (classList.contains(name)) {
            classList.remove(name);
        } else {
            classList.add(name);
        }
    });
}

/**
 * Normalize version string to [major, minor, patch]
 * @param {string} v
 * @returns {number[]}
 */
function parseVersion(v) {
    return v
        .split('.')
        .map(part => Number(part.trim()))
        .concat([0, 0])
        .slice(0, 3);
}

/**
 * Compares a version with a given condition.
 * @param {string} current - The current version to compare against condition in major.minor.revision format
 * @param {string | null | undefined} [condition] - The condition to meet. In <, <=, =, >=, major.minor.revision
 * @returns {boolean} True if current meets condition
 */
export function compareVersion(current, condition) {
    if (!condition) {
        return true;
    }

    // Parse condition string
    const match = condition.trim().match(/^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+){0,2})$/);
    if (!match) {
        console.error("Invalid version condition: " + condition);
        return true;
    }

    const operator = match[1] || "=";
    const targetVersion = parseVersion(match[2]);
    const currentVersion = parseVersion(current);

    // Compare versions
    let cmp = 0;
    for (let i = 0; i < 3; i++) {
        if (currentVersion[i] > targetVersion[i]) {
            cmp = 1;
            break;
        }
        if (currentVersion[i] < targetVersion[i]) {
            cmp = -1;
            break;
        }
    }

    // Evaluate based on operator
    switch (operator) {
        case ">": return cmp > 0;
        case ">=": return cmp >= 0;
        case "<": return cmp < 0;
        case "<=": return cmp <= 0;
        case "=": return cmp === 0;
        default:
            console.log("Unknown operator: " + operator);
            return true;
    }
}

/**
 * Parameters that are generated from $RND must never
 * be stored as recently used, nor used as new contexts
 * @param {Record<string, any>} ctx
 * @param {import('./options').Param[]} parameters
 * @returns {Record<string, any>}
 */
export function removeRndFromCtx(ctx, parameters) {
    return Object.fromEntries(
        Object.entries(ctx).filter(([k]) => {
            const val = parameters.find(p => p.name === k)?.value;
            return val !== '$RND';
        })
    );
}

/**
 * Helper to load scripts
 * @param {import('./plugin').TinyMCE} editor
 * @param {string} src
 * @returns {Promise<void>}
 */
export function loadScriptAsync(editor, src) {
    return new Promise((resolve, reject) => {
        const s = editor.dom.create('script', {src});
        s.onload = () => resolve();
        s.onerror = reject;
        const head = editor.getDoc().querySelector("head");
        head.appendChild(s);
    });
}

/**
 * Convert an HTML string into DOM element(s)
 * @param {string} html - HTML string
 * @returns {HTMLElement} - Returns a single element if one root, or a DocumentFragment if multiple
 */
export function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();

    if (template.content.childElementCount === 1) {
        // @ts-ignore
        return template.content.firstElementChild;
    } else {
        // If multiple root elements, return a fragment
        // @ts-ignore
        return template.content;
    }
}