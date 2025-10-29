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
import jQuery from 'jquery';
import {evalInContext} from './util';

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
                    let found = elem?.getAttribute(attrName) !== null;
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
                let found = elem?.getAttribute(prefix + attrName) !== null;
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
                    const found = elem?.getAttribute(attrName) !== null;
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
