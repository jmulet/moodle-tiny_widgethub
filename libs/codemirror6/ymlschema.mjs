/* eslint-disable camelcase */
/* eslint-disable complexity */
/* eslint-disable max-len */
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
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import z from 'zod';

// --- 1. Define the Zod Schema ---
// Instead of a JSON object, we define the schema programmatically.
// Schema for the ParamOption type (Unchanged)
// JSDoc type definitions

/**
 * @typedef {Object} ParamOption
 * @property {string} l
 * @property {string} v
 * @property {{to: string, content: string}} [a]
 */

/**
 * @typedef {Object} Param
 * @property {string} [partial]
 * @property {string} name
 * @property {string} title
 * @property {'textfield' | 'numeric' | 'checkbox' | 'select' | 'autocomplete' | 'textarea' | 'image' | 'color' | 'repeatable'} [type]
 * @property {(ParamOption | string)[]} [options]
 * @property {any} value
 * @property {string} [tip]
 * @property {string} [tooltip]
 * @property {number} [min]
 * @property {number} [max]
 * @property {string} [transform]
 * @property {string | {get: string, set: string}} [bind]
 * @property {string} [when]
 * @property {boolean} [hidden]
 * @property {boolean} [editable]
 * @property {string} [for]
 * @property {Param[]} [fields]
 */

/**
 * @typedef {Object} Action
 * @property {string} predicate
 * @property {string} actions
 */


// Schema for linting


// Schema for the ParamOption type
const ParamOptionSchema = z.object({
    l: z.string().optional().describe('The option label'),
    v: z.string().optional().describe('The option value'),
    a: z.object({
        to: z.string(),
        content: z.string(),
    }).optional().describe('An option defined as label and value'),
}).superRefine((data, ctx) => {
    if (data.l === undefined) {
        ctx.addIssue({code: 'custom', message: "Property 'l' in ParamOption is required.", path: ['l']});
    }
    if (data.v === undefined) {
        ctx.addIssue({code: 'custom', message: "Property 'v' in ParamOption is required.", path: ['v']});
    }
});

// Schema for the 'bind' object, ensuring both get and set are present.
const BindObjectSchema = z.object({
    get: z.string().optional().describe('How to get the variable value from jQuery<HTMLElement> e. E.g., get: function(e){return "···";}'),
    set: z.string().optional().describe('How to set the variable value v to jQuery<HTMLElement> e. E.g., set: function(e, value){···}')
}).superRefine((data, ctx) => {
    if (data.get === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'bind' object must have a 'get' property.", path: ['get']});
    }
    if (data.set === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'bind' object must have a 'set' property.", path: ['set']});
    }
});

const commonParamSchema = {
    partial: z.string().optional(),
    name: z.string().optional().describe("*The name of the parameter that will be used in the template."),
    title: z.string().optional().describe("*The title that will appear in the label near the user input."),
    options: z.array(z.union([ParamOptionSchema, z.string()])).optional()
        .describe("A list of options for type=select. Can be a list of strings or objects like {l: 'label', v: 'value'}"),
    value: z.union([z.string(), z.number(), z.boolean()]).optional()
        .describe("*The default value for the option. E.g. 11, true, 'someValue'"),
    tooltip: z.string().optional().describe("Optional. Information shown to the user as a popover near the input control"),
    tip: z.string().optional().describe("Optional. Shortcut for tooltip"),
    min: z.number().optional().describe("Optional. Minimum allowed value for type=numeric"),
    max: z.number().optional().describe("Optional. Maximum allowed value for type=numeric"),
    bind: z.union([z.string(), BindObjectSchema]).optional()
        .describe("hasClass('cls'), notHasClass('cls'), classRegex('reg'), attr('attrName'), hasAttr('attrName=value'), notHasAttr('attrName=value'), attrRegex('attrName=regex'), hasStyle('styName:value'), notHasStyle('styName:value'), styleRegex(hasStyle('styName:regex'). Second parameter is a css query from widget root."),
    transform: z.string().optional().describe("Optional. Stream of transformers applied to the getter of this parameter. String separated by |. Available: toUpperCase | toLowerCase | trim | ytId | vimeoId | serveGDrive | removeHTML | escapeHTML | encodeHTML | escapeQuotes"),
    hidden: z.boolean().optional().describe("Optional. When set to true, the control will be hidden"),
    editable: z.boolean().optional().describe("Optional. When set to false, the control cannot be modified"),
    when: z.string().optional().describe("Optional. JS expression to determine when to dynamically display the control. E.g. _lang==='es'"),
    'for': z.string().optional().describe("Optional. Tell for which user ids (comma separated) this control will be visible"),
};

// This is an internal schema for fields inside a 'repeatable' type.
const NonRepeatableParamSchema = z.object({
        ...commonParamSchema,
        'type': z.enum(['textfield', 'numeric', 'checkbox', 'select', 'autocomplete', 'textarea', 'image', 'color']).optional(),
    }).superRefine((data, ctx) => {
    // Manually check for required fields
    if (data.name === undefined) {
        ctx.addIssue({code: 'custom', message: "The parameter 'name' is required.", path: ['name']});
    }
    if (data.title === undefined) {
        ctx.addIssue({code: 'custom', message: "The parameter 'title' is required.", path: ['title']});
    }
    if (data.value === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'value' property is required for each parameter.", path: ['value']});
    }

    // Conditional validation logic
    const hasOptions = data.options !== undefined && data.options.length > 0;
    const type = data.type;
    if (type === 'select' && typeof data.value !== 'boolean') {
        ctx.addIssue({code: 'custom', message: "For type 'select', the value must be a boolean.", path: ['value']});
    }
    if (type === 'autocomplete' && !hasOptions) {
        ctx.addIssue({code: 'custom', message: "Options are required when type is 'autocomplete'.", path: ['options']});
    }
    if (hasOptions && type !== undefined && !['select', 'autocomplete'].includes(type)) {
        ctx.addIssue({code: 'custom', message: "Options are only allowed when type is 'select' or 'autocomplete'.", path: ['options']});
    }
    if (type !== 'numeric' && (data.min !== undefined || data.max !== undefined)) {
        ctx.addIssue({code: 'custom', message: "Min/Max are only allowed when type is 'numeric'", path: ['min']});
    }
    if (type === 'numeric' && data.value !== undefined && typeof (data.value) !== 'number') {
           ctx.addIssue({code: 'custom', message: "The value of type 'numeric' must be a number", path: ['value']});
    }
    if (type === 'checkbox' && data.value !== undefined && typeof (data.value) !== 'boolean') {
        ctx.addIssue({code: 'custom', message: "The value of type 'checkbox' must be true or false", path: ['value']});
    }
});


// This is the main ParamSchema which can be 'repeatable'
const ParamSchema = z.object({
    ...commonParamSchema,
    'type': z.enum(['textfield', 'numeric', 'checkbox', 'select', 'autocomplete', 'textarea', 'image', 'color', 'repeatable']).optional(),
    item_selector: z.string().optional().describe('A css query that provides the DOM elements; one per item'),
    fields: z.array(z.lazy(() => NonRepeatableParamSchema)).optional().describe('A list of parameters that define the repeatable object'),
}).superRefine((data, ctx) => {
    // Manually check for required fields
    if (data.name === undefined) {
        ctx.addIssue({code: 'custom', message: "The parameter 'name' is required.", path: ['name']});
    }
    if (data.title === undefined) {
        ctx.addIssue({code: 'custom', message: "The parameter 'title' is required.", path: ['title']});
    }
    if (data.type !== 'repeatable' && data.value === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'value' property is required for each parameter.", path: ['value']});
    }

    // Conditional validation logic
    const hasOptions = data.options !== undefined && data.options.length > 0;
    const type = data.type;
    if (type === 'select' && typeof data.value !== 'boolean') {
        ctx.addIssue({code: 'custom', message: "For type 'select', the value must be a boolean.", path: ['value']});
    }
    if (type === 'autocomplete' && !hasOptions) {
        ctx.addIssue({code: 'custom', message: "Options are required when type is 'autocomplete'.", path: ['options']});
    }
    if (hasOptions && type !== undefined && !['select', 'autocomplete'].includes(type)) {
        ctx.addIssue({code: 'custom', message: "Options are only allowed when type is 'select' or 'autocomplete'.", path: ['options']});
    }
    if (data.type && !['numeric', 'repeatable'].includes(data.type) && (data.min !== undefined || data.max !== undefined)) {
        ctx.addIssue({code: 'custom', message: "Min/Max are only allowed when type is 'numeric' or 'repeatable'", path: ['min']});
    }
    if (data.type !== 'repeatable' && data.fields !== undefined) {
        ctx.addIssue({code: 'custom', message: "Fields are only allowed when type is 'repeatable'", path: ['fields']});
    }
    if (data.type === 'repeatable' && data.fields === undefined) {
        ctx.addIssue({code: 'custom', message: "Fields are required when type is 'repeatable'", path: ['type']});
    }
    if (type === 'numeric' && data.value !== undefined && typeof (data.value) !== 'number') {
           ctx.addIssue({code: 'custom', message: "The value of type 'numeric' must be a number", path: ['value']});
    }
    if (type === 'checkbox' && data.value !== undefined && typeof (data.value) !== 'boolean') {
        ctx.addIssue({code: 'custom', message: "The value of type 'checkbox' must be true or false", path: ['value']});
    }
    // Repeatable parameter with bindings in field, require a bind parameter that specifies a query for getting the items
    if (type === 'repeatable' && data.fields?.some(f => f.bind !== 'undefined')) {
        if (typeof data.item_selector !== 'string' && typeof data.bind !== 'object') {
            ctx.addIssue({code: 'custom',
                message: "Repeatable parameters that include fields with bindings, require `bind` or `item_selector`",
                path: ['bind']});
        }
    }
    if (type === 'repeatable' && data.bind && data.item_selector) {
        ctx.addIssue({code: 'custom',
            message: "Repeatable parameters can only use either `bind` or `item_selector` at the same time.",
            path: ['bind']});
    }
    if (type === 'repeatable' && data.bind !== undefined && typeof data.bind !== 'object') {
        ctx.addIssue({code: 'custom',
            message: "Repeatable parameters can only use object {get, set} for `bind`.",
            path: ['bind']});
    }
});


// Schema for the Action type
const ActionSchema = z.object({
    predicate: z.string().optional(),
    actions: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.predicate === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'predicate' property is required for each action.", path: ['predicate']});
    }
    if (data.actions === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'actions' property is required for each action.", path: ['actions']});
    }
});

const partialSchema = z.string().regex(/^__([A-Z0-9_]+)__$/).describe('A parameter name defined in the partials file');

// Schema for the main RawWidget type
export const widgetSchema = z.object({
    plugin_release: z.string().regex(/^(?:>=|>|=)?\d+\.\d+(?:\.\d+)?$/, {message: "Minimum plugin version required must follow the [ >, >=, =, ] xx.yy.zz pattern (e.g., >=1.4)."})
        .optional().describe("Minimum plugin version required, '>=1.4' or '>1.4'."),
    key: z.string().optional().describe("*The key of the snippet"),
    name: z.string().optional().describe("*The name of the snippet"),
    category: z.string().optional().describe("Optional. The category of the snippet (defaults to MISC)"),
    version: z.string()
        .regex(/^\d+\.\d+\.\d+$/, {message: "Version must follow the xx.yy.zz pattern (e.g., 1.0.0)."})
        .optional()
        .describe("*The version of the snippet"),
    author: z.string().optional().describe("*The author of the snippet"),
    scope: z.string().optional().describe("Regex for identifying allowed body ids"),
    instructions: z.string().optional().describe("Optional. Instructions to the end user"),
    engine: z.enum(['mustache', 'ejs']).optional().describe("Optional. It can either be mustache or ejs. Defaults to mustache."),
    template: z.string().optional().describe("*The template of the snippet. Cannot be used with filter."),
    filter: z.string().optional().describe("*The template of the filter. Cannot be used with template."),
    selectors: z.union([z.string(), z.array(z.string())]).optional().describe("Optional. CSS selectors to identify the widget."),
    insertquery: z.string().optional().describe("Optional. CSS selector where to insert content in SELECTION mode"),
    unwrap: z.string().optional().describe("Optional. CSS selectors of template content to extract on unwrap."),
    parameters: z.array(z.union([ParamSchema, partialSchema])).optional().describe("Optional. A list of parameters of the snippet"),
    requires: z.array(z.string()).optional().describe("Optional. JS dependencies of the widget."),
    I18n: z.record(z.string(), z.record(z.string(), z.string())).optional().describe("Optional. Translation map."),
    'for': z.string().optional().describe("Optional. A list of user ids allowed to use this widget"),
    hidden: z.boolean().optional().describe("Optional. Set to true to hide this widget"),
    autocomplete: z.string().optional().describe("Optional. Name of a select parameter providing widget variations."),
    contextmenu: z.array(ActionSchema).optional().describe("Optional. Context menu configuration."),
    contexttoolbar: z.array(ActionSchema).optional().describe("Optional. Context toolbar configuration."),
}).superRefine((data, ctx) => {
    // Manually check for required fields
    if (data.key === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'key' property is required.", path: ['key']});
    }
    if (data.name === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'name' property is required.", path: ['name']});
    }
    if (data.version === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'version' property is required.", path: ['version']});
    }
    if (data.author === undefined) {
        ctx.addIssue({code: 'custom', message: "The 'author' property is required.", path: ['author']});
    }

    // Cross-field validation
    if (data.template && data.filter) {
        ctx.addIssue({
            code: 'custom',
            message: "Only one of 'template' or 'filter' can be present",
            path: ["filter"],
        });
    }

    // Cross-field validation for bind/selectors
    const hasBindParameter = data.parameters?.some(p => typeof p === 'object' && (p.bind !== undefined || p.item_selector !== undefined));
    if (hasBindParameter) {
        const hasSelectors = data.selectors && ((Array.isArray(data.selectors) && data.selectors.length > 0) || (typeof data.selectors === 'string' && data.selectors.trim() !== ''));
        if (!hasSelectors) {
            ctx.addIssue({
                code: 'custom',
                message: "The 'selectors' property is required at the root when any parameter has bindings.",
                path: ['selectors']
            });
        }
    }
});

// Options for autocompletion
// Generated from zod schema

/**
 * Convert a Zod object schema into an autocomplete options array.
 * @param {import('zod').ZodObject<any>} schema
 * @returns {{label: string, type: string, info: string}[]}
 */
function schemaToAutocomplete(schema) {
    return Object.entries(schema.shape).map(([key, value]) => ({
        label: key,
        type: 'variable',
        info: value.description || ''
    }));
}

export const widgetAutocompletions = {
    ROOT_OPTIONS: schemaToAutocomplete(widgetSchema),
    PARAMETERS_OPTIONS: schemaToAutocomplete(ParamSchema),
    OPTIONS_OPTIONS: schemaToAutocomplete(ParamOptionSchema),
    BIND_OPTIONS: schemaToAutocomplete(BindObjectSchema),
};
