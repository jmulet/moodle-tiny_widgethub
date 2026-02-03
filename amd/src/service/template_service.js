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
import { getTinyMCE } from 'editor_tiny/loader';

/**
 * Sanitizes the given HTML using the editor's schema.
 * @param {string} html The HTML to sanitize.
 * @param {any} tinymce
 * @param {any} [schema]
 * @returns {string} The sanitized HTML.
 */
export function sanitize(html, tinymce, schema) {
    schema = schema ?? tinymce.html.Schema({});
    const parser = tinymce.html.DomParser({
        validate: true,
        schema: schema,
        allow_script_urls: false
    });
    const doc = parser.parse(html);
    return tinymce.html.Serializer({}, schema).serialize(doc);
}

/**
 * Template service
 */
export class TemplateSrv {
    /**
     * @param {*} mustache
     * @param {import('../plugin').TinyMCE} [editor]
     */
    constructor(mustache, editor) {
        this.editor = editor;
        this.mustache = mustache;
    }
    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {boolean} [removeUnsafe=false] - Remove unsafe characters from the template
     * @returns {string} The interpolated template given a context and translations map
     */
    renderMustache(template, context, removeUnsafe = false) {
        const ctx = { ...context };
        Object.keys(ctx).forEach(key => {
            if (ctx[key] === "$RND") {
                ctx[key] = genID();
            }
        });
        if (removeUnsafe) {
            template = template
                .replace(/\{{3,}/g, '{{')
                .replace(/\}{3,}/g, '}}')
                .replace(/{{&/g, '{{');
        }
        // Trusted plugin templates. No need to sanitize.
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
            const dirtyHtml = await sandbox.execute(engine, { template, ctx, translations });
            const tinyMCE = await getTinyMCE();
            return sanitize(dirtyHtml, tinyMCE, this.editor?.schema);
        } catch (/** @type {any} */ ex) {
            return `<div class="alert alert-danger">
            <p>Render ${engine} template</p>
            <pre>${ex.message || ex}</pre>
            </div>`;
        }
    }
}

/** @type {Map<import('../plugin').TinyMCE, TemplateSrv>} */
let templateSrvInstances = new Map();
/**
 * @param {import('../plugin').TinyMCE} editor
 * @returns {TemplateSrv}
 */
export function getTemplateSrv(editor) {
    let instance = templateSrvInstances.get(editor);
    if (!instance) {
        instance = new TemplateSrv(mustache, editor);
        templateSrvInstances.set(editor, instance);
    }
    return instance;
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
        const templateSrv = new TemplateSrv(mustache);
        // In repeatable fields, create objects in lst up to min value.
        const nitems = param.min || 0;
        for (let i = 1; i <= nitems; i++) {
            /** @type {Record<string, *>} */
            const obj = {};
            param.fields?.forEach(field => {
                let val = field.value ?? '';
                if (typeof (val) === 'string' && val.indexOf("{{i}}") >= 0) {
                    val = templateSrv.renderMustache(val, { i }, true);
                }
                obj[field.name] = val;
            });
            lst.push(obj);
        }
    }
    return lst;
}