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
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { fnCallParser, safeAwait } from './util';
import { RemoteDom } from './service/sandbox';

/**
 * @param {*} value
 * @param {string | undefined} type
 * @returns {*}
 */
export const performCasting = function (value, type) {
    if (!type || typeof value === type) {
        return value;
    }
    switch (type) {
        case ("boolean"):
            value = value === 1 || value === "1" || value === true || value === "true";
            break;
        case ("number"):
            try {
                const parsed = parseFloat(value);
                if (!isNaN(parsed)) {
                    value = parsed;
                } else {
                    console.error(`Error parsing number ${value}`);
                    value = 0;
                }
            } catch (ex) {
                console.error(`Error parsing number ${value}`);
                value = 0;
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
const xor = function (a, b) {
    return !a !== !b;
};

/**
 * @param {string} str
 * @param {*} match
 * @param {string} replacement
 * @returns {string}
 */
const replaceStrPart = function (str, match, replacement) {
    if (!match?.indices) {
        console.error("RegExp match does not include indices");
        return str;
    }
    const [a, b] = match.indices[1];
    return str.substring(0, a) + replacement + str.substring(b);
};

/**
 * Replaces the first capturing group in regexExpr by replacement,
 * The remaining capturing groups are removed.
 * @param {string|RegExp} regexExpr
 * @param {string} replacement
 * @returns {string}
 */
const getValueFromRegex = function (regexExpr, replacement) {
    if (regexExpr instanceof RegExp) {
        regexExpr = regexExpr.source;
    }
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
 * @typedef {{getValue: () => any, setValue: (value: any) => void}} Binding
 */
/**
 * Predefined bindings
 * @type {Record<string, (el: Element, ...args: any[]) => Binding>}
 */
export const bindingsFactoryAPI = Object.freeze(
    Object.assign(Object.create(null), {
        /**
         * @param {Element} el
         * @param {string} className
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        hasClass: (el, className, query, neg) => {
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
         * @param {Element} el
         * @param {string} className
         * @param {string=} query
         * @returns {Binding}
         */
        notHasClass: (el, className, query) => {
            return bindingsFactoryAPI.hasClass(el, className, query, true);
        },
        /**
         * @param {Element} el
         * @param {string|RegExp} classExpr
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        classRegex: (el, classExpr, query, castTo) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            if (typeof classExpr === 'string') {
                classExpr = classExpr.replace(/\\\\/g, '\\');
            }
            return {
                getValue: () => {
                    let ret = '';
                    const classes = Array.from(elem?.classList ?? []);
                    let classExpr2 = classExpr;
                    if (typeof classExpr2 === 'string') {
                        classExpr2 = new RegExp(classExpr2);
                    }
                    for (const clazz of classes) {
                        const match = classExpr2.exec(clazz);
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
                    let classExpr2 = classExpr;
                    if (typeof classExpr2 === 'string') {
                        classExpr2 = new RegExp(classExpr2, 'd');
                    }
                    cl.forEach(c => {
                        const match = classExpr2.exec(c);
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
         * @param {Element} el
         * @param {string} attrName
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        attr: (el, attrName, query, castTo) => {
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
         * @param {Element} el
         * @param {string} attrName - Name without data- nor data-bs-
         * @param {string=} query
         * @param {string=} castTo
         * @param {number=} version - 4 or 5 depending the version of BS currently using
         * @returns {Binding}
         */
        attrBS: (el, attrName, query, castTo, version) => {
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
         * @param {Element} el
         * @param {string} attr
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        hasAttr: (el, attr, query, neg) => {
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
         * @param {Element} el
         * @param {string} attr - attr name without data- nor data-bs-
         * @param {string=} query
         * @param {boolean=} neg
         * @param {number=} version - 4 or 5
         * @returns {Binding}
         */
        hasAttrBS: (el, attr, query, neg, version) => {
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
         * @param {Element} el
         * @param {string} attr
         * @param {string=} query
         * @returns {Binding}
         */
        notHasAttr: (el, attr, query) => {
            return bindingsFactoryAPI.hasAttr(el, attr, query, true);
        },
        /**
         * @param {Element} el
         * @param {string} attr - Regex of attr
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        attrRegex: (el, attr, query, castTo) => {
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
                if (typeof attrValue === 'string') {
                    attrValue = attrValue.replace(/\\\\/g, '\\');
                }
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
         * @param {Element} el
         * @param {string} sty
         * @param {string=} query
         * @param {boolean=} neg
         * @returns {Binding}
         */
        hasStyle: (el, sty, query, neg) => {
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
         * @param {Element} el
         * @param {string} sty
         * @param {string=} query
         * @returns {Binding}
         */
        notHasStyle: (el, sty, query) => {
            return bindingsFactoryAPI.hasStyle(el, sty, query, true);
        },
        /**
         * @param {Element} el
         * @param {string} attr - styName:styValue where styValue is a regex with (.*)
         * @param {string=} query
         * @param {string=} castTo
         * @returns {Binding}
         */
        styleRegex: (el, attr, query, castTo) => {
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
                if (typeof styValue === 'string') {
                    styValue = styValue.replace(/\\\\/g, '\\');
                }
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
                    elem?.setAttribute('data-mce-style', st?.cssText ?? '');
                }
            };
        },
        /**
         * @param {Element} el
         * @param {string=} query
         * @returns {Binding}
         */
        text: (el, query) => {
            /** @type {Element | null} */
            let elem = el;
            if (query) {
                elem = el.querySelector(query);
            }
            return {
                getValue() {
                    return elem?.textContent ?? '';
                },
                setValue(val) {
                    if (elem) {
                        elem.textContent = val + '';
                    }
                }
            };
        }
    }));

/**
 * Adapter to get and set values from/to the DOM
 * according to widget parameter bindings.
 * Local bindings are based on the BindingFactoryAPI.
 * Remote bindings are used when binding contains user code and
 * it requires DomSandbox.
 *  @class BindingsAdapter
 */
export class BindingsAdapter {
    /**
     * @param {Element} root
     * @param {import('./options').Widget} widget
     */
    constructor(root, widget) {
        this.root = root;
        this.widget = widget;

        // Parameters that contain bindings.
        /** @type {import('./options').Param[]} */
        this.parametersWithBindings = widget.parameters.filter(param => {
            return param.bind !== undefined || BindingsAdapter.hasFieldBindings(param);
            // Repeatable parameters with field object bindings are not supported.
        });

        this.hasLocalBindings = this.parametersWithBindings.some(param => (typeof param.bind === 'string') ||
            BindingsAdapter.hasFieldBindings(param)
        );
        this.hasRemoteBindings = this.parametersWithBindings.some(param => typeof param.bind === 'object');

        /**
         * @type {Map<string, Binding>}
         */
        this.localBindings = new Map();

        /**
         * @type {Map<string, Object.<string, { bindingFactory: Function, args: any[]}>>}
         */
        this.localRepetableBindings = new Map();
    }

    /**
     * @param {import('./options').Param} param
     * @returns {boolean}
     */
    static hasFieldBindings(param) {
        return param.type === 'repeatable' &&
            !!param.item_selector &&
            !!(param.fields?.some(field => typeof field.bind === 'string'));
    }

    async _initRemoteDom() {
        if (!this.hasRemoteBindings || this.vdomId !== undefined) {
            return;
        }
        // Create a Virtual Dom for the widget root element
        if (!this.remoteDom) {
            this.remoteDom = new RemoteDom('dom_sandbox');
            await this.remoteDom._createSandboxedIframe();
        }
        this.vdomId = await this.remoteDom.createRemoteDom(this.root);
    }

    /**
     * Gets values from local DOM
     * @returns {Object<string, {name: string, value: any, param: import('./options').Param}>}
     */
    _getLocalValues() {
        /** @type {Object<string, {name: string, value: any, param: import('./options').Param}>} */
        const extractedValues = Object.create(null);

        for (const param of this.parametersWithBindings) {
            /** @type {string | {name: string, args: Array<any>}} */
            if (typeof param.bind === 'string') {
                // Retrieve the value of this parameter from the Local Dom
                const { name, args } = fnCallParser(param.bind);
                const bindingFactory = bindingsFactoryAPI[name];
                if (!bindingFactory) {
                    console.error("Binding function not found: ", name);
                    continue;
                }
                const binder = bindingFactory(this.root, ...args);
                this.localBindings.set(param.name, binder);
                const value = binder.getValue();
                extractedValues[param.name] = { name: param.name, value, param };
            } else if (BindingsAdapter.hasFieldBindings(param)) {
                // Local dom retrieval only.
                /** @type {any[]} */
                const valuesArray = [];
                // Parse string bindings once
                const parsedBindings = Object.fromEntries(
                    (param.fields ?? [])
                        .filter(field => typeof field.bind === 'string')
                        .map(field => {
                            // @ts-ignore
                            const { name, args } = fnCallParser(field.bind);
                            const bindingFactory = bindingsFactoryAPI[name];
                            if (!bindingFactory) {
                                console.error("Binding function not found: ", name);
                            }
                            return [field.name, { bindingFactory, args }];
                        }));
                this.localRepetableBindings.set(param.name, parsedBindings);
                // Find all items
                const itemElems = this.root.querySelectorAll(param.item_selector || '');
                itemElems.forEach(item => {
                    const valueObject = Object.create(null);
                    param.fields?.forEach(field => {
                        if (typeof field.bind !== 'string') {
                            return;
                        }
                        const bindingInfo = parsedBindings[field.name];
                        if (!bindingInfo) {
                            return;
                        }
                        const { bindingFactory, args } = bindingInfo;
                        const binder = bindingFactory(item, ...args);
                        const value = binder.getValue();
                        valueObject[field.name] = value;
                    });
                    valuesArray.push(valueObject);
                });
                extractedValues[param.name] = { name: param.name, value: valuesArray, param };
            }
        }
        return extractedValues;
    }

    /**
     * Gets values from Remote Dom
     * @returns {Promise<Object.<string, {name: string, value: any, param: import('./options').Param}>>}
     */
    async _getRemoteValues() {
        await this._initRemoteDom();
        if (!this.remoteDom || !this.vdomId) {
            return Object.create(null);
        }
        /** @type {Object.<string, {name: string, value: any, param: import('./options').Param}>} */
        const extractedValues = Object.create(null);

        for (const param of this.parametersWithBindings) {
            const paramValueType = typeof (param.value);
            if (typeof param.bind !== 'object' || this.remoteDom === null || this.vdomId === null) {
                continue;
            }
            const instructions = param.bind.getValue || param.bind.get || '';
            const useJQuery = param.bind.get !== undefined;
            const [err, response] = await safeAwait(this.remoteDom.queryOnRemoteDom({
                vid: this.vdomId,
                rvnid: this.root.getAttribute('data-rvn-id') ?? '',
                name: param.name,
                type: paramValueType,
                instructions,
                useJQuery
            }));
            if (err) {
                console.error("Error retrieving value from remote DOM", err);
                continue;
            }
            const value = response?.value;
            if (param?.name !== undefined && value !== undefined) {
                extractedValues[param.name] = { name: param.name, value, param };
            }
        }
        return extractedValues;
    }

    /**
     * Gets all values
     * @param {Object.<string, any>} newValues
     * @returns {void}
     */
    _setLocalValues(newValues) {
        // Patch local bindings first
        this.localBindings.forEach((binder, name) => {
            if (!this.valuesFromDom) {
                return;
            }
            const val = newValues[name];
            const oldValue = this.valuesFromDom[name]?.value;
            if (val !== undefined && val !== oldValue && val !== oldValue) {
                binder.setValue(val);
            }
        });

        // Patch local repeatable parameters (if any)
        this.parametersWithBindings.filter(param => BindingsAdapter.hasFieldBindings(param)).forEach(param => {
            if (!this.valuesFromDom) {
                return;
            }
            // Local dom patching only.
            const val = newValues[param.name];
            const oldValue = this.valuesFromDom[param.name]?.value;
            if (val === undefined || !Array.isArray(val) || val.length === 0) {
                return;
            }

            // Parse string bindings once
            const parsedBindings = this.localRepetableBindings.get(param.name);
            if (typeof parsedBindings !== 'object') {
                return;
            }
            // Find all items
            const itemElems = this.root.querySelectorAll(param.item_selector || '');
            itemElems.forEach((item, i) => {
                const valForItem = val[i];
                const oldValueForItem = oldValue[i];
                if (valForItem === undefined || valForItem === oldValueForItem) {
                    return;
                }
                param.fields?.forEach(field => {
                    if (typeof field.bind !== 'string') {
                        return;
                    }
                    const bindingInfo = parsedBindings[field.name];
                    if (!bindingInfo) {
                        return;
                    }
                    const { bindingFactory, args } = bindingInfo;
                    const binder = bindingFactory(item, ...args);
                    const valForItemAndField = valForItem[field.name];
                    const oldValueForItemAndField = oldValueForItem[field.name];
                    if (valForItemAndField === undefined || valForItemAndField === oldValueForItemAndField) {
                        return;
                    }
                    binder.setValue(valForItemAndField);
                });
            });
        });
    }

    /**
     * Gets all values
     * @param {Object.<string, any>} newValues
     * @returns {Promise<void>}
     */
    async _setRemoteValues(newValues) {
        await this._initRemoteDom();
        if (!this.remoteDom || !this.vdomId || !this.valuesFromDom) {
            return;
        }
        // Update parameter values to remote DOM.
        const paramsWithObjectBindings = this.parametersWithBindings.filter(param => typeof param.bind === 'object');
        for (let param of paramsWithObjectBindings) {
            const oldValue = this.valuesFromDom[param.name]?.value;
            const val = newValues[param.name];
            if (val === undefined || val === oldValue || typeof param.bind !== 'object') {
                continue;
            }
            /** @type {string | {name: string, args: Array<any>}} */
            const instructions = param.bind.setValue || param.bind.set || '';
            const useJQuery = param.bind.set !== undefined;
            const [err] = await safeAwait(this.remoteDom.updateRemoteDomValue({
                vid: this.vdomId,
                rvnid: this.root.getAttribute('data-rvn-id') ?? '',
                name: param.name,
                value: val,
                instructions,
                useJQuery
            }));
            if (err) {
                console.error(err);
            }
        }

        // Retrieve and apply the patches from remote to local DOM.
        await this.remoteDom.applyPatches(this.vdomId);

    }

    /**
     * Gets all values
     * Extract param values from DOM (indexed by name)
     * @returns {Promise<Object.<string, {name: string, value: any, param: import('./options').Param}>>}
     */
    async getValues() {
        let values = this._getLocalValues();
        if (this.hasRemoteBindings) {
            const remoteValues = await this._getRemoteValues();
            values = Object.assign(Object.create(null), values, remoteValues);
        }
        /** @type {Object.<string, {name: string, value: any, param: import('./options').Param}>} */
        this.valuesFromDom = values;
        return values;
    }

    /**
     * Sets all values
     * @param {Object.<string, any>} newValues
     * @returns {Promise<void>}
     */
    async setValues(newValues) {
        if (!this.valuesFromDom) {
            await this.getValues();
        }
        this._setLocalValues(newValues);
        if (this.hasRemoteBindings) {
            if (this.hasLocalBindings && this.remoteDom && this.vdomId !== undefined) {
                // Should recreate vdom again with local changes applied
                await this.remoteDom.destroyRemoteDom(this.vdomId);
                this.vdomId = await this.remoteDom.createRemoteDom(this.root);
            }
            await this._setRemoteValues(newValues);
        }
    }

    /**
     * Destroys the bindings
     */
    async destroy() {
        if (this.remoteDom) {
            if (this.vdomId !== undefined) {
                await this.remoteDom.destroyRemoteDom(this.vdomId);
            }
            this.remoteDom = null;
            this.vdomId = undefined;
        }
    }

}
