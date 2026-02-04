/* eslint-disable no-console */
/* eslint-disable no-bitwise */
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
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

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
 * @param {string} val
 * @returns {any}
 */
const castValue = (val) => {
    val = val.trim();
    if (val === '') {
        return undefined;
    }
    if (val === 'true') {
        return true;
    }
    if (val === 'false') {
        return false;
    }
    if (val === 'null') {
        return null;
    }
    if (val === 'undefined') {
        return undefined;
    }
    // Regex Support: /pattern/flags
    if (val.startsWith('/')) {
        const lastSlashIndex = val.lastIndexOf('/');
        if (lastSlashIndex > 0) {
            const pattern = val.slice(1, lastSlashIndex);
            const flags = val.slice(lastSlashIndex + 1);
            return new RegExp(pattern, flags);
        }
    }
    const num = Number(val);
    if (!isNaN(num)) {
        return num;
    }
    throw new Error(`Invalid argument type: ${val}`);
};

/**
 * Parses a function call like fnname(true, null, 'arg2\'etc', ...)
 * into an object {name: 'fnname', args: [true, null, "arg2'etc", ...]}
 * Supported argument types are string, boolean, number, null, undefined and regexp.
 * It uses a FSA with memory to parse the expression.
 * It throws an error if the expression is not valid.
 * @param {string} expr - The function call to parse
 * @throws {Error} If the expression is not valid
 * @returns {{name: string, args: any[]}} An object with the function name and arguments
 */
export function fnCallParser(expr) {
    /** @type {{name: string, args: any[]}} **/
    const result = { name: '', args: [] };

    // Numerical State Constants
    const S_NAME = 0; // Reading function name
    const S_BEFORE = 1; // Between name and '('
    const S_ARG = 2; // Reading non-string argument
    const S_STRING = 3; // Inside a string literal
    const S_REGEX = 4; // Inside a regex literal
    const S_END = 5; // After ')'

    let state = S_NAME;
    let currentArg = '';
    let quoteChar = '';
    let pendingToken = false;
    let i = 0;

    while (i < expr.length) {
        const char = expr[i];

        switch (state) {
            case S_NAME:
                if (/[a-zA-Z_$]/.test(char)) {
                    result.name += char;
                }
                else if (/[0-9]/.test(char)) {
                    if (result.name.length === 0) {
                        throw new Error("Name cannot start with number");
                    }
                    result.name += char;
                } else if (char === '(') {
                    state = S_ARG;
                } else if (/\s/.test(char) && result.name.length > 0) {
                    state = S_BEFORE;
                } else if (!/\s/.test(char)) {
                    throw new Error("Illegal character in name: " + char);
                }
                break;

            case S_BEFORE:
                if (char === '(') {
                    state = S_ARG;
                }
                else if (!/\s/.test(char)) {
                    throw new Error("Expected (");
                }
                break;

            case S_ARG:
                if (result.name.trim() === '') {
                    throw new Error("Expected name");
                }
                if (char === "'" || char === '"') {
                    // If we just finished a string/regex and see another quote without a comma
                    if (pendingToken) {
                        throw new Error("Expected delimiter");
                    }
                    quoteChar = char;
                    state = S_STRING;
                    currentArg = '';
                } else if (char === '/' && (currentArg.trim() === '')) {
                    // Enter Regex state if we see a / at the start of an arg
                    state = S_REGEX;
                    currentArg = char;
                } else if (char === ',') {
                    if (!pendingToken) {
                        result.args.push(castValue(currentArg));
                    }
                    currentArg = '';
                    pendingToken = false;
                } else if (char === ')') {
                    if (!pendingToken) {
                        const trimmed = currentArg.trim();
                        if (trimmed !== '' || result.args.length > 0) {
                            result.args.push(castValue(currentArg));
                        }
                    }
                    state = S_END;
                } else {
                    if (!pendingToken) {
                        currentArg += char;
                    } else if (!/\s/.test(char)) {
                        throw new Error("Expected delimiter");
                    }
                }
                break;

            case S_STRING:
                if (char === '\\' && i + 1 < expr.length && expr[i + 1] === quoteChar) {
                    currentArg += quoteChar;
                    i++;
                } else if (char === quoteChar) {
                    result.args.push(currentArg);
                    currentArg = '';
                    pendingToken = true;
                    state = S_ARG;
                } else {
                    currentArg += char;
                }
                break;

            case S_REGEX:
                currentArg += char;
                // Check for closing slash (not escaped)
                if (char === '/' && expr[i - 1] !== '\\') {
                    // Regex isn't finished yet! We need to capture flags (gim...)
                    // We'll peek ahead in the next iterations of S_ARG via castValue
                    // or stay here to grab letters? Let's stay to grab flags.
                    let j = i + 1;
                    while (j < expr.length && /[a-z]/.test(expr[j])) {
                        currentArg += expr[j];
                        j++;
                    }
                    i = j - 1; // Advance main pointer
                    result.args.push(castValue(currentArg));
                    currentArg = '';
                    pendingToken = true;
                    state = S_ARG;
                }
                break;

            case S_END:
                if (!/\s/.test(char)) {
                    throw new Error("Trailing data");
                }
                break;
        }
        i++;
    }

    if (state !== S_END) {
        throw new Error("Incomplete call");
    }
    return result;
}


/**
 * Simple fast string hash (djb2 variant)
 * @param {string} s - string to be hashed
 * @returns {number} non-negative 32-bit integer
 */
export function hashCode(s) {
    let hash = 5381; // magic initial prime
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) + hash) + s.charCodeAt(i); // hash * 33 + c
        hash |= 0; // force 32-bit integer
    }
    return hash >>> 0; // convert to non-negative
}

/**
 * @param {string} str1
 * @param {string} needle
 * @returns {boolean} Whether str1 contains needle or not
 */
export function searchComp(str1, needle) {
    /** @param {string} str */
    const normalize = (str) => {
        return (str || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    return normalize(str1).includes(normalize(needle));
}

/** Default transformers */
const Transformers = Object.freeze(
    Object.assign(Object.create(null), {
        /** @param {string} txt */
        toUpperCase: function (txt) {
            return (txt + "").toUpperCase();
        },
        /** @param {string} txt */
        toLowerCase: function (txt) {
            return (txt + "").toLowerCase();
        },
        /** @param {string} txt */
        trim: function (txt) {
            return (txt + "").trim();
        },
        /** @param {string} txt */
        ytId: function (txt) {
            // Finds the youtubeId in a text
            const rx = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
            const r = (txt || '').match(rx);
            if (r?.length) {
                return r[1];
            }
            return txt;
        },
        /** @param {string} txt */
        vimeoId: function (txt) {
            const regExp = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?(\d+)/;
            const match = new RegExp(regExp).exec(txt || "");
            if (match?.[5]) {
                return match[5];
            }
            return txt;
        },
        /** @param {string} txt */
        serveGDrive: function (txt) {
            // Expecting https://drive.google.com/file/d/1DDUzcFrOlzWb3CBdFPJ1NCNXClvPbm5B/preview
            const res = (txt + "").match(/https:\/\/drive.google.com\/file\/d\/([a-zA-Z0-9_]+)\//);
            if (res?.length) {
                const driveId = res[1];
                return "https://docs.google.com/uc?export=open&id=" + driveId;
            }
            return txt;
        },
        /** @param {string} txt */
        removeHTML: function (txt) {
            return (txt || '').replace(/<[^>]*>?/gm, '');
        },
        /** @param {string} txt */
        escapeHTML: function (txt) {
            return (txt || '').replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },
        /** @param {string} txt */
        encodeHTML: function (txt) {
            // @ts-ignore
            return encodeURIComponent(txt || "");
        },
        /** @param {string} txt */
        escapeQuotes: function (txt) {
            return (txt || '').replace(/"/gm, "'");
        }
    }));


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
            if (transfunc !== undefined) {
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
    if (alpha2 === 1) {
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
    const result = Object.create(null);
    Object.entries(ctx).forEach(([k, v]) => {
        const val = parameters.find(p => p.name === k)?.value;
        if (val !== undefined && val !== '$RND') {
            result[k] = v;
        }
    });
    return result;
}

/**
 * Helper to load scripts
 * @param {import('./plugin').TinyMCE} editor
 * @param {string} src
 * @param {string} [integrity]
 * @returns {Promise<void>}
 */
export function loadScriptAsync(editor, src, integrity) {
    return new Promise((resolve, reject) => {
        const s = editor.dom.create('script', { src });
        s.onload = () => resolve();
        s.referrerPolicy = 'no-referrer';
        if (integrity) {
            s.crossOrigin = 'anonymous';
            s.integrity = integrity;
        }
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

/**
 * @param {Element} target
 * @param {string} propName
 * @param {string} propValue
 */
export function setAttributeMCE(target, propName, propValue) {
    target.setAttribute(propName, propValue);
    if (propName === 'href' || propName === 'src') {
        target.setAttribute(`data-mce-${propName}`, propValue);
    }
}

/**
 * Any menu item, different from |, is prefixed by componentName_ and ended with _item.
 * @param {string[]} items
 * @param {string} prefix
 * @param {string[]} [skipItems]
 * @param {string} [separator]
 * @returns {string[]}
 */
export function prefixItemsWith(items, prefix, skipItems = [], separator = '_') {
    return items.map(e => skipItems.includes(e) ? e : `${prefix}${separator}${e}`);
}

/**
 * Simple SVG Sanitizer
 * @param {string} svgString
 * @returns {string} Clean SVG
 */
export function sanitizeSvg(svgString) {
    const isDataUrl = svgString.startsWith('data:image/svg+xml;base64,');
    if (isDataUrl) {
        svgString = atob(svgString.replace('data:image/svg+xml;base64,', ''));
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
        return '';
    }

    // Whitelist of safe tags
    const allowedTags = ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
        'g', 'defs', 'lineargradient', 'stop'];
    // Whitelist of safe attributes
    const allowedAttrs = ['viewbox', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height',
        'fill', 'stroke', 'stroke-width', 'points', 'transform', 'class', 'id', 'opacity'];

    /**
     * @param {Element} el
     */
    const cleanElement = (el) => {
        // 1. Remove script/event tags
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
            el.remove();
            return;
        }

        // 2. Remove non-whitelisted attributes (including on*)
        Array.from(el.attributes).forEach(attr => {
            const name = attr.name.toLowerCase();
            if (!allowedAttrs.includes(name)) {
                el.removeAttribute(attr.name);
            }
        });

        // 3. Recurse
        Array.from(el.children).forEach(cleanElement);
    };

    cleanElement(svg);
    const cleanSvg = svg.outerHTML;
    if (isDataUrl) {
        return 'data:image/svg+xml;base64,' + btoa(cleanSvg);
    }
    return cleanSvg;
}

/**
 * Creates an object with null prototype.
 * @param {object} obj
 * @returns {object}
 */
export function nullProtofy(obj) {
    return Object.assign(Object.create(null), obj);
}