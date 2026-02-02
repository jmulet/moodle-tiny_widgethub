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

import mustache from 'core/mustache';
import { genID } from '../util';
import { Sandbox } from './sandbox';

/**
 * Template service
 */
export class TemplateSrv {
    /**
     * @param {*} mustache
     */
    constructor(mustache) {
        this.mustache = mustache;
    }
    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @returns {string} The interpolated template given a context and translations map
     */
    renderMustache(template, context) {
        const ctx = { ...context };
        Object.keys(ctx).forEach(key => {
            if (ctx[key] === "$RND") {
                ctx[key] = genID();
            }
        });
        // @ts-ignore
        return this.mustache.render(template, ctx);
    }

    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {Object.<string, Object.<string, any>>} translations
     * @param {string} [engine] - (ejs | mustache) optional
     * @returns {Promise<string>} - The interpolated template given a context and translations map
     */
    async render(template, context, translations, engine) {
        if (!engine) {
            engine = template.includes("<%") ? "ejs" : "mustache";
        }
        engine = engine.toLowerCase();
        /** @type {Object.<string, any>} */
        const ctx = { ...context, I18n: {} };
        Object.keys(ctx).forEach(key => {
            if (ctx[key] === "$RND") {
                ctx[key] = genID();
            }
        });
        const lang = ctx._lang;
        for (let wordKey in translations) {
            const dict = translations[wordKey];
            ctx.I18n[wordKey] = dict[lang] || dict.en || dict.es || wordKey;
        }

        try {
            const sandbox = await Sandbox.getInstance();
            return await sandbox.execute(engine, { template, ctx, translations });
        } catch (ex) {
            return `<div class="alert alert-danger">
            <p>Render ${engine} template</p>
            <pre>${ex}</pre>
            </div>`;
        }
    }
}

/** @type {TemplateSrv | undefined} */
let instanceSrv;
/**
 * @returns {TemplateSrv}
 */
export function getTemplateSrv() {
    if (!instanceSrv) {
        instanceSrv = new TemplateSrv(mustache);
    }
    return instanceSrv;
}

/**
 * Creates default value for a given parameter.
 * @param {import('../options').Param} param
 * @param {boolean | undefined} [populateRepeatable]
 * @returns {any}
 */
export function createDefaultsForParam(param, populateRepeatable) {
    if (param.type !== 'repeatable') {
        return param.value ?? '';
    }
    const lst = [];
    if (populateRepeatable) {
        // In repeatable fields, create objects in lst up to min value.
        const nitems = param.min || 0;
        for (let i = 1; i <= nitems; i++) {
            /** @type {Record<string, *>} */
            const obj = {};
            param.fields?.forEach(field => {
                let val = field.value ?? '';
                if (typeof (val) === 'string' && val.indexOf("{{i}}") >= 0) {
                    val = getTemplateSrv().renderMustache(val, { i });
                }
                obj[field.name] = val;
            });
            lst.push(obj);
        }
    }
    return lst;
}