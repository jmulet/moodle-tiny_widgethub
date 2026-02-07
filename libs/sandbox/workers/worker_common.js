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
 * @module      tiny_widgethub/workercommon
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * Disables worker APIs to prevent workers from accessing the main thread.
 */
export function disableWorkerAPIs() {
    const dangerous = ['close', 'fetch', 'XMLHttpRequest', 'importScripts'];
    dangerous.forEach(api => {
        // @ts-ignore
        if (self[api]) {
            Object.defineProperty(self, api, {
                value: () => { throw new Error('Security Error: worker api is disabled.'); },
                configurable: false,
                writable: false
            });
        }
    });
}

/**
 * Creates a new object with the same properties as the given object, but with null as the prototype.
 * @param {Object} obj - The object to nullify.
 * @returns {Object} - The nullified object.
 */
export function protoNullify(obj) {
    return Object.assign(Object.create(null), obj);
}

/**
 * List of blacklisted globals.
 */
export const blacklist = ['self', 'globalThis', 'Worker', 'SharedWorker', 'postMessage', 'onmessage',
    'indexedDB', 'location', 'navigator', 'origin', 'console', 'setTimeout', 'setInterval'];

/**
 * Evaluates an expression in a given context.
 * @param {Record<string, any>} ctx - The context to evaluate the expression in.
 * @param {string} expr - The expression to evaluate.
 * @param {boolean} keepFns - Whether to keep functions in the context.
 * @returns {*} - The result of the evaluation.
 */
export function evalInContext(ctx, expr, keepFns) {
    if (
        expr.includes('Function(') ||
        expr.includes('eval(') ||
        expr.includes('.constructor')
    ) {
        throw new Error('Function or eval or constructor is not allowed');
    }

    /** @type {string[]} */
    const listArgs = [];
    /** @type {any[]} */
    const listVals = [];

    ctx = protoNullify(ctx || {});

    Object.keys(ctx).forEach((key) => {
        if (keepFns || typeof ctx[key] !== "function") {
            listArgs.push(key);
            listVals.push(ctx[key]);
        }
    });

    // Shadow blacklisted globals.
    blacklist.forEach((key) => {
        if (ctx[key] === undefined) {
            listArgs.push(key);
            listVals.push(null);
        }
    });

    const evaluator = new Function(
        ...listArgs,
        '"use strict"; return (' + expr + ');'
    );

    return evaluator(...listVals);
}