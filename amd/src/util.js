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
import Common from './common';
const {component} = Common;

/**
 * @param {string} [prefix]
 * @returns {string} a randomID
 */
export function genID(prefix = 'g') {
    const timePart = Date.now().toString(32);
    const randPart = Math.floor(Math.random() * 1e6).toString(32);
    return `${prefix}-${timePart}${randPart}`;
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
            {key: 'filterres', component},
            {key: 'nochanges', component}
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
 * @param {Document} doc - The page document
 * @param {string} html - HTML string
 * @returns {HTMLElement} - Returns a single element if one root, or a DocumentFragment if multiple
 */
export function htmlToElement(doc, html) {
    const template = doc.createElement('template');
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

/**
 * @deprecated Use native editor.dom.setStyle instead.
 * @param {HTMLElement} target
 * @param {string} propName
 * @param {string} propValue
 */
export function setStyleMCE(target, propName, propValue) {
    target.style.setProperty(propName, propValue);
    // Sync data-mce-style
    target.setAttribute('data-mce-style', target.getAttribute('style') ?? '');
}

/**
 * @param {HTMLElement} target
 * @param {string} propName
 */
export function removeStyleMCE(target, propName) {
    target.style.removeProperty(propName);
    // Sync data-mce-style
    target.setAttribute('data-mce-style', target.getAttribute('style') ?? '');
}