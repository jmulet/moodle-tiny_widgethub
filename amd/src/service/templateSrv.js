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

import { evalInContext, genID } from '../util';


/**
 * @param {string} text
 * @param {Object.<string, any>} ctx2
 * @returns {string}
 */
const defineVar = function (text, ctx2) {
    const pos = text.indexOf("=");
    const varname = text.substring(0, pos).trim();
    const varvalue = evalInContext(ctx2, text.substring(pos + 1).trim());
    ctx2[varname] = varvalue;
    return varname;
};

export default class TemplateSrv {
    /**
     *
     * @param {import('../container').DIContainer} container
     */
    constructor({ mustache, ejsLoader }) {
        this.mustache = mustache;
        this.ejsLoader = ejsLoader;
    }
    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {Object.<string, Object.<string, string>>=} translations
     * @returns {string} The interpolated template given a context and translations map
     */
    renderMustache(template, context, translations) {
        const ctx = { ...context };
        Object.keys(ctx).forEach(key => {
            if (ctx[key] === "$RND") {
                ctx[key] = genID();
            }
        });
        this.applyMustacheHelpers(ctx, translations ?? {});
        // @ts-ignore
        return this.mustache.render(template, ctx);
    }

    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {Object.<string, Object.<string, any>>} translations
     * @returns {Promise<string>} The interpolated template given a context and translations map
     */
    async rendererEJS(template, context, translations) {
        /** @type {Object.<string, any>} */
        const ctx = { ...context, I18n: {} };
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
        try {
            const ejsResolved = await this.ejsLoader();
            return ejsResolved.render(template, ctx);
        } catch (ex) {
            console.error(ex);
            return "";
        }
    }

    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {Object.<string, Object.<string, any>>} translations
     * @param {string=} engine - (ejs | mustache) optional
     * @returns {Promise<string>} - The interpolated template given a context and translations map
     */
    render(template, context, translations, engine) {
        if (!engine) {
            engine = template.includes("<%") ? "ejs" : "mustache";
        }
        if (engine === "ejs") {
            return this.rendererEJS(template, context, translations);
        }
        // Default to Mustache
        const tmpl = this.renderMustache(template, context, translations);
        return Promise.resolve(tmpl);
    }

    /**
     * Extends Mustache templates with some helpers
     * @param {Object.<string, any>} ctx
     * @param {Record<string, Record<string, string>>} translations
     */
    applyMustacheHelpers(ctx, translations) {
        ctx["if"] = () =>
            /**
             * @param {string} text
             * @param {Mustache.render} render
             */
            function (text, render) {
                const pos = text.indexOf("]");
                const condition = text.substring(0, pos).trim().substring(1);
                const show = evalInContext(ctx, condition);
                if (show) {
                    // @ts-ignore
                    return render(text.substring(pos + 1).trim());
                }
                return "";
            };
        ctx["var"] = () =>
            /**
             * @param {string} text
             */
            function (text) {
                defineVar(text, ctx);
            };
        ctx["eval"] = () =>
            /**
             * @param {string} text
             */
            function (text) {
                return evalInContext(ctx, text) + "";
            };
        ctx["I18n"] = () =>
            /**
             * @param {string} text
             * @param {Mustache.render} render
             */
            function (text, render) {
                // @ts-ignore
                const key = render(text).trim();
                const dict = translations[key] || {};
                return dict[ctx["LANG"]] || dict["en"] || dict["ca"] || key;
            };
        ctx["each"] = () =>
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
                    const dm = evalInContext(ctx, parts[1]);
                    total = total * dm;
                    maxValues[i] = dm;
                    ctx[cname] = 1;
                });
                let output = [];
                for (let _ei = 0; _ei < total; _ei++) {
                    // @ts-ignore
                    output.push(this.mustache.render(text.substring(pos + 1), ctx));
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
        ctx["for"] = () =>
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
                while (evalInContext(ctx, parts[1]) && maxIter < 1000) {
                    // @ts-ignore
                    output += this.mustache.render(text.substring(pos + 1), ctx);
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
}