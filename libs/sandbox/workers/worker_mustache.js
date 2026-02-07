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

import { disableWorkerAPIs, evalInContext, protoNullify } from "./worker_common.js";
import Mustache from 'mustache';

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/workercommon
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const _postMessage = self.postMessage;
disableWorkerAPIs();

/**
 * 
 * @param {*} text 
 * @param {*} ctx2 
 * @returns 
 */
function defineVar(text, ctx2) {
    const pos = text.indexOf("=");
    const varname = text.substring(0, pos).trim();
    const varvalue = evalInContext(ctx2, text.substring(pos + 1).trim(), false);
    ctx2[varname] = varvalue;
    return varname;
}

/**
 * 
 * @param {*} ctx 
 * @param {*} translations 
 */
function applyMustacheHelpers(ctx, translations) {
    translations = translations || protoNullify({});
    ctx.if = () =>
        /**
         * @param {string} text
         * @param {Mustache.render} render
         */
        function (text, render) {
            const pos = text.indexOf("]");
            const condition = text.substring(0, pos).trim().substring(1);
            const show = evalInContext(ctx, condition, false);
            if (show) {
                // @ts-ignore
                return render(text.substring(pos + 1).trim());
            }
            return "";
        };

    ctx.var = () =>
        /**
         * @param {string} text
         */
        function (text) {
            defineVar(text, ctx);
        };

    ctx.I18n = () =>
        /**
         * @param {string} text
         * @param {Mustache.render} render
         */
        function (text, render) {
            // @ts-ignore
            const key = render(text).trim();
            const dict = translations[key] || {};
            return dict[ctx._lang] || dict.en || dict.ca || key;
        };

    ctx.each = () =>
        /**
         * @param {string} text
         */
        function (text) {
            const pos = text.indexOf("]");
            const cond = text.substring(0, pos).trim().substring(1);
            const components = cond.split(",");
            const dim = components.length;
            const maxValues = new Array(dim);
            const loopVars = new Array(dim);
            let total = 1;
            const cc = 'i'.charCodeAt(0);
            components.forEach((def, i) => {
                const parts = def.split("=");
                if (parts.length === 1) {
                    parts.unshift(String.fromCharCode(cc + i));
                }
                const cname = parts[0].trim();
                loopVars[i] = cname;
                const dm = evalInContext(ctx, parts[1], false);
                total = total * dm;
                maxValues[i] = dm;
                ctx[cname] = 1;
            });
            const output = [];
            for (let _ei = 0; _ei < total; _ei++) {
                // @ts-ignore
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

    ctx.for = () =>
        /**
         * @param {string} text
         */
        function (text) {
            const pos = text.indexOf("]");
            const condition = text.substring(0, pos).trim().substring(1);
            const parts = condition.split(";");
            const loopvar = defineVar(parts[0], ctx);
            let output = "";
            let maxIter = 0; // Prevent infinite loop imposing a limit of 1000
            while (evalInContext(ctx, parts[1], false) && maxIter < 1000) {
                output += self.Mustache.render(text.substring(pos + 1), ctx);
                if (parts.length === 3 && parts[2].trim()) {
                    defineVar(loopvar + "=" + parts[2], ctx);
                } else {
                    ctx[loopvar] = ctx[loopvar] + 1;
                }
                maxIter++;
            }
            return output;
        };
}

self.onmessage = function (e) {
    const data = e.data;
    const payload = data.payload || protoNullify({});
    // Add lambda functions to context
    const context = protoNullify(payload.ctx);
    applyMustacheHelpers(context, payload.translations);
    try {
        const result = Mustache.render(payload.template, context);
        _postMessage(protoNullify({
            requestId: data.requestId,
            result: result
        }));
    } catch (e) {
        console.error('Failed to render template: ' + e);
        _postMessage(protoNullify({
            requestId: data.requestId,
            error: 'Failed to render template: ' + e
        }));
    }
};

_postMessage(protoNullify({
    type: 'worker_ready',
}));
