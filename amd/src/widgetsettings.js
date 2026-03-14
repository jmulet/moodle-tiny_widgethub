/* eslint-disable max-len */
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
 * Local WidgetHub plugin.
 *
 * @module      tiny_widgethub/widgetsettings
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { CmEditor, YAML } from './libs/cmeditor-lazy';
// eslint-disable-next-line camelcase
import { get_string } from 'core/str';
import { getTemplateSrv, createDefaultsForParam } from './service/template_service';
import { applyPartials } from './options';
import common from './common';
import { compareVersion, sanitizeSvg } from './util';
import { getInstanceForElementId } from 'editor_tiny/editor';

/**
 * Toggles a button to a non loading state.
 * @param {HTMLButtonElement} btn
 * @param {string} toogleclass
 */
function unspinButton(btn, toogleclass) {
    const icon = btn.querySelector('fa');
    icon?.classList?.remove('fa-spin', 'fa-spinner');
    icon?.classList?.add(toogleclass);
}

/**
 * Toggles a button to a loading state.
 * @param {HTMLButtonElement} btn
 * @param {string} toogleclass
 */
function spinButton(btn, toogleclass) {
    const icon = btn.querySelector('fa');
    icon?.classList?.add('fa-spin', 'fa-spinner');
    icon?.classList?.remove(toogleclass);
}

const { component } = common;
const randomKey = Math.random().toString(36).substring(2, 8);
const DEFAULT_DOC =
    `key: username_sample-${randomKey}
name: Minimal sample widget
category: Examples
icon: fa fa-cube
template: |
  <p><br></p>
  <p>Write your template {{greeting}}</p>
  <p><br></p>
parameters:
  - name: greeting
    title: Greeting message
    value: Hello world!
author: Your name <email@site.com>
version: 1.0.0`;

/**
 * Checks whether HTML tags are balanced, ignoring EJS blocks like <% %>.
 * @param {string} input The HTML+EJS string.
 * @returns {string[]} Stack of tags not closing.
 */
function unbalancedHTMLWithEJS(input) {
    // Remove EJS tags.
    const withoutEJS = input.replace(/<%[\s\S]*?%>/g, '');

    // HTML self-closing tags.
    const selfClosing = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
        'input', 'link', 'meta', 'source', 'track', 'wbr'
    ]);

    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    const stack = [];
    let match;

    while ((match = tagRegex.exec(withoutEJS)) !== null) {
        const fullTag = match[0];
        const tagName = match[1].toLowerCase();
        const isClosing = fullTag.startsWith('</');

        // Skip self-closing
        if (selfClosing.has(tagName) || fullTag.endsWith('/>')) {
            continue;
        }

        if (!isClosing) {
            stack.push(tagName);
        } else {
            if (stack.length === 0 || stack.pop() !== tagName) {
                if (stack.length === 0) {
                    stack.push(tagName);
                }
                return stack;
            }
        }
    }
    return stack;
}

/**
 * Replaces placeholders "@i" from 1 to n in the str
 * @param {string} str
 * @param  {...string} placeholders
 * @returns {string}
 */
function replacePlaceholders(str, ...placeholders) {
    return str.replace(/@(\d+)/g, (match, index) => {
        const i = parseInt(index, 10);
        return placeholders[i - 1] !== undefined ? placeholders[i - 1] : match;
    });
}

class PreviewStrategyTiny {
    /**
     * @param {Element} panel
     */
    constructor(panel) {
        this.panel = panel;
    }
    /**
     * @returns {boolean}
     */
    init() {
        const tinyinstance = getInstanceForElementId(this.panel.id);
        if (!tinyinstance) {
            return false;
        }
        // Tell WidgetHub that the plugin definition has changed.
        const plugin = tinyinstance.plugins['tiny_widgethub/plugin'];
        if (typeof plugin?.widgetDefine !== 'function') {
            return false;
        }
        plugin.widgetDefine(null, '');
        tinyinstance.setDirty(false);
        tinyinstance.setContent('<p></p>');
        return true;
    }
    /**
     * @param {string} content
     * @param {import('./options').RawWidget} [widget]
     * @param {string} [css]
     * @returns {boolean}
     */
    render(content, widget, css = '') {
        if (widget) {
            const isfilter = (!!widget.filter && !!widget.template);
            const isselectcapable = (!!widget.selectors && !!widget.insertquery);
            widget = {
                ...widget,
                isfilter,
                isselectcapable,
            };
        }
        const tinyinstance = getInstanceForElementId(this.panel.id);
        if (!tinyinstance) {
            return false;
        }
        tinyinstance.setContent(content);
        // Tell WidgetHub that the plugin definition has changed.
        const plugin = tinyinstance.plugins['tiny_widgethub/plugin'];
        if (typeof plugin?.widgetDefine === 'function') {
            plugin.widgetDefine(widget, css);
        }
        return true;
    }

    /**
     * The current HTML content of the editor.
     * @returns {string}
     */
    getValue() {
        const tinyinstance = getInstanceForElementId(this.panel.id);
        if (!tinyinstance) {
            return '';
        }
        return tinyinstance.getContent();
    }
}

/**
 * @typedef {Object} Selectors
 * @property {string} json Selector for JSON textarea.
 * @property {string} yml Selector for YAML textarea.
 * @property {string} partials Selector for partials textarea.
 * @property {string} save Selector for save button.
 * @property {string} saveandclose Selector for save and close button.
 * @property {string} refreshbtn Selector for refresh/preview button.
 */

/**
 * @typedef {Object} SettingsNodes
 * @property {HTMLDivElement} editorAreayml - Place where to attach CM editor
 * @property {HTMLTextAreaElement|null} [previewTiny] - Place where to attach TinyMCE
 * @property {HTMLIFrameElement|null} [previewPanel] - Place where to attach preview iframe
 * @property {HTMLDivElement} previewLog - Place where to attach preview log
 * @property {HTMLDivElement} alertLog - Place where to attach alert log
 * @property {HTMLButtonElement} clearLogBtn - Button type
 * @property {HTMLTextAreaElement} ymlArea - Form field
 * @property {HTMLTextAreaElement} jsonArea - Form field
 * @property {HTMLTextAreaElement} partialArea - Form field
 * @property {HTMLInputElement} saveBtn - Form field
 * @property {HTMLInputElement} saveCloseBtn - Form field
 * @property {HTMLButtonElement|null} [refreshBtn] - Button type
 */

/**
 * Main class for managing widget settings and editors.
 */
export default class WidgetSettings {
    /** @type {PreviewStrategyTiny | null} */
    tinyPreviewStrategy = null;

    /** @type {Record<string, CmEditor>} */
    editors = {};

    /** @type {number|null} */
    id;

    /** @type {string[]} */
    keys;

    /** @type {Selectors} */
    selectors;

    /** @type {SettingsNodes & Object.<string, any>} */
    nodes;

    /** @type {string|undefined} */
    originalKey;

    /**
     * @param {Object} opts
     * @param {number} opts.id The widget ID (<0 for new, 0 for partial)
     * @param {string[]} opts.keys Array of existing widget keys
     * @param {Selectors} opts.selectors Selectors for various form elements
     */
    constructor(opts) {
        this.id = opts.id;
        this.keys = opts.keys || [];
        this.selectors = opts.selectors;

        // Configuration for validation
        const nodeDefinitions = {
            editorAreayml: { selector: '#p-yml > div', type: HTMLDivElement, required: true },
            ymlArea: { selector: this.selectors.yml, type: HTMLTextAreaElement, required: true },
            jsonArea: { selector: this.selectors.json, type: HTMLTextAreaElement, required: true },
            partialArea: { selector: this.selectors.partials, type: HTMLTextAreaElement, required: true },
            saveBtn: { selector: this.selectors.save, type: HTMLInputElement, required: true },
            saveCloseBtn: { selector: this.selectors.saveandclose, type: HTMLInputElement, required: true },
            refreshBtn: { selector: this.selectors.refreshbtn, type: HTMLButtonElement, required: false },
            previewTiny: { selector: '#p-tiny > textarea', type: HTMLTextAreaElement, required: false },
            previewPanel: { selector: '#p-preview > iframe', type: HTMLIFrameElement, required: false },
            previewLog: { selector: '#p-log', type: HTMLDivElement, required: true },
            alertLog: { selector: '#id_widget_previewlog', type: HTMLDivElement, required: true },
            clearLogBtn: { selector: '#id_widget_clearlog', type: HTMLButtonElement, required: true },
        };

        /** @type {Partial<SettingsNodes> & Record<string, any>} */
        const validatedNodes = {};

        // Run strict validation
        Object.entries(nodeDefinitions).forEach(([name, def]) => {
            const element = document.querySelector(def.selector);

            // 1. Check existence
            if (!element && def.required) {
                throw new Error(`[SettingsEditor] Node "${name}" missing. Selector: ${def.selector}`);
            }

            // 2. Check concrete type (HTMLTextAreaElement, HTMLButtonElement, etc.)
            if (element && !(element instanceof def.type)) {
                throw new Error(
                    `[SettingsEditor] Node "${name}" is the wrong type. ` +
                    `Expected ${def.type.name} but found ${element.constructor.name}.`
                );
            }
            validatedNodes[name] = element;
        });

        /**
         * Safe assignment: Every node is confirmed to exist and be of the correct type.
         * @type {SettingsNodes & Object.<string, any>}
         */
        this.nodes = /** @type {SettingsNodes & Object.<string, any>} */ (validatedNodes);
        if (this.nodes.previewTiny) {
            this.tinyPreviewStrategy = new PreviewStrategyTiny(this.nodes.previewTiny);
        }
    }

    /**
     * Static entry point for Moodle AMD initialization.
     * @param {{id: number, keys: string[], selectors: Selectors}} opts The options from the PHP side.
     */
    static init(opts) {
        const instance = new WidgetSettings(opts);
        instance.render();
    }

    /**
     * Creates an editor instance for a given type and sets the initial value.
     * @param {'yml' | 'css' | 'html'} type
     * @returns {void}
     */
    _createEditor(type) {
        if (this.editors[type] || !this.nodes['editorArea' + type]) {
            return;
        }
        const onChangeListener = () => {
            this._onRefreshBtnClick();
        };
        const editor = new CmEditor(this.nodes['editorArea' + type], type, onChangeListener);
        this.editors[type] = editor;

        // Set initial value
        if (type === 'yml') {
            this._setYamlValue();
        } else {
            const defaultValue = '';
            editor.setValue(this.nodes[type + 'Area']?.value ?? defaultValue);
        }
    }

    /**
     * Initialize the YAML value in the editor.
     * @private
     */
    _setYamlValue() {
        if (!this.editors.yml) {
            return;
        }

        const ymlValue = this.nodes.ymlArea.value?.trim() ?? '';
        let jsonValue = this.nodes.jsonArea.value?.trim() || '{}';
        const parsed = JSON.parse(jsonValue);
        this.originalKey = parsed.key;

        if (this.id !== null && this.id >= 0) { // Not a blank new widget
            if (this.id === 0 && !ymlValue && (!jsonValue || jsonValue === '{}')) {
                // If it's a new partials that hasn't been saved yet
                this.editors.yml.setValue("key: partials\nLOREM: Lorem ipsum");
                return;
            }
            if (ymlValue) {
                this.editors.yml.setValue(ymlValue);
                return;
            }
            if (jsonValue) {
                // Remove id from JSON
                delete parsed.id;
                delete parsed.timecreated;
                delete parsed.timemodified;
                jsonValue = JSON.stringify(parsed); // Convert back to JSON
                try {
                    const yml = YAML.fromJSON(jsonValue);
                    this.editors.yml.setValue(yml);
                } catch (ex) {
                    console.error('Error converting JSON to YAML:', ex);
                    this.editors.yml.setValue('');
                }
                return;
            }
        } else {
            this.editors.yml.setValue(DEFAULT_DOC);
        }
    }

    /**
     * Validation result.
     * @typedef {Object} ValidationResult
     * @property {string} msg - Error message.
     * @property {string} html - HTML content.
     * @property {string|undefined} json - JSON content.
     * @property {any} obj - Object content.
     */
    /**
     * Validate the current YAML content.
     * @param {string} yml The YAML string.
     * @param {Record<string, any>} partials Partials for validation.
     * @returns {Promise<ValidationResult>}
     */
    // eslint-disable-next-line complexity
    async validate(yml, partials) {
        /** @type {ValidationResult} */
        const validation = { msg: '', html: '', json: undefined, obj: undefined };
        try {
            let jsonObj;
            try {
                jsonObj = YAML.parse(yml);
            } catch (ex) {
                validation.msg = await get_string('erryaml', component) + ':: ' + ex;
                return validation;
            }

            if (!jsonObj) {
                validation.msg = await get_string('erryaml', component) + ':: empty yaml';
                return validation;
            }

            // Sanitize SVG if set.
            const icon = jsonObj.icon?.trim();
            if (icon && (icon.startsWith('<svg') || icon.startsWith('data:image/svg+xml;base64,'))) {
                jsonObj.icon = sanitizeSvg(icon);
            }

            validation.json = JSON.stringify(jsonObj, null, 0);
            validation.obj = jsonObj;

            // Basic key validation
            if (!jsonObj.key?.trim()) {
                validation.msg = await get_string('errproprequired', component, "'key'") + '\n';
            } else if (jsonObj.key !== 'partials') {
                if (this.id === 0) {
                    // This is a partials and it should have key: partials
                    validation.msg += await get_string('errproprequired', component, "'key: partials'") + '\n';
                }
                // Widget structure validation
                if (!jsonObj.name) {
                    validation.msg += await get_string('errproprequired', component, "'name'") + '\n';
                } else if (!(jsonObj.template || jsonObj.filter)) {
                    validation.msg += await get_string('errproprequired', component, "'template' | 'filter'") + '\n';
                } else if (jsonObj.template && jsonObj.filter) {
                    validation.msg += await get_string('errpropincompatible', component, "'template' & 'filter'") + '\n';
                } else if (!jsonObj.author || !jsonObj.version) {
                    validation.msg += await get_string('errproprequired', component, "'author' & 'version'") + '\n';
                }
            }

            if (this.id !== null && this.id >= 0 && jsonObj.key && jsonObj.key !== this.originalKey && this.keys.includes(jsonObj.key)) {
                validation.msg += await get_string('errkeyinuse', component, jsonObj.key) + '\n';
            }

            // If not partials, apply partial and Template validation
            if (jsonObj.key !== 'partials') {
                applyPartials(jsonObj, partials);
            }
            // Templates cannot have script tags nor style tags
            const template = jsonObj.template ?? jsonObj.filter ?? '';
            if (template.match(/<\s?script/i) || template.match(/<\s?style/i)) {
                validation.msg += await get_string('errscript', component) + '\n';
            }
            if (jsonObj.template) {
                const stack = unbalancedHTMLWithEJS(jsonObj.template);
                if (stack.length > 0) {
                    validation.msg += await get_string('errunbalancedhtml', component) + ': ' + stack + '\n';
                    return validation;
                }

                const translations = jsonObj.I18n ?? {};
                /** @type {Record<string, *>} */
                const ctx = {};
                (jsonObj.parameters ?? []).forEach(/** @param {import('./options').Param} param */(param) => {
                    ctx[param.name] = createDefaultsForParam(param, true);
                });

                if (jsonObj.template && this.id && this.id > 0) {
                    try {
                        const tinyinstance = getInstanceForElementId(this.nodes.previewTiny?.id ?? '');
                        const templateSrv = getTemplateSrv(tinyinstance);
                        validation.html = await templateSrv.render(jsonObj.template, ctx, translations, jsonObj.engine);
                    } catch (ex0) {
                        validation.msg += await get_string('errpreview', component) + ':: ' + ex0 + '\n';
                    }
                }
            }

            // Parameter validation
            if (jsonObj.parameters) {
                const parameters = /** @type {import('./options').Param[]} */ (jsonObj.parameters);
                const errStr1 = await get_string('errparamtype', component);
                const errStr2 = await get_string('errparamvalue', component);
                parameters
                    .filter(p => p.type === 'select' || p.type === 'autocomplete' || p.options)
                    .forEach(p => {
                        if (!p.options || !Array.isArray(p.options)) {
                            validation.msg += replacePlaceholders(errStr1, p.name + '.options', 'Array') + '\n';
                            return;
                        }
                        if (p.type === 'select') {
                            const options = p.options.map(o => typeof (o) === 'string' ? o : o.v);
                            if (p.value === undefined || options.indexOf(p.value) < 0) {
                                validation.msg += replacePlaceholders(errStr2, p.name + '.value', 'in options') + '\n';
                            }
                        }
                    });
            }

            // Compatibility check
            if (jsonObj.plugin_release && !compareVersion(common.currentRelease, jsonObj.plugin_release)) {
                validation.msg += await get_string('errversionmismatch', component, {
                    required: jsonObj.plugin_release,
                    installed: common.currentRelease
                }) + '\n';
            }

        } catch (ex) {
            validation.msg = await get_string('errunexpected', component) + ':: ' + ex + '\n';
        }
        return validation;
    }

    /**
     * Perform the save action.
     * @returns {Promise<boolean>} Whether the action was successful.
     */
    async preSaveAction() {
        const ymlEditor = this.editors.yml;
        if (!ymlEditor) {
            return false;
        }
        const ymlValue = ymlEditor.getValue();
        const partials = JSON.parse(this.nodes.partialArea.value || '{}');

        const validation = await this.validate(ymlValue, partials);

        if (validation.msg || !validation.json) {
            this._selectTab('log');
            validation.msg = validation.msg.replace(/\n/g, '<br>');
            this.nodes.alertLog.insertAdjacentHTML('afterbegin', `<div class="alert alert-danger">${validation.msg}</div>`);
        } else {
            this.nodes.alertLog.insertAdjacentHTML('afterbegin', `<div class="alert alert-success">Validation successful</div>`);
            // Sync hidden textareas for FormAPI submission
            this.nodes.ymlArea.value = ymlValue;
            this.nodes.jsonArea.value = validation.json;
            if (this.editors.css) {
                this.nodes.cssArea.value = this.editors.css.getValue().trim() ?? '';
            }
            if (this.editors.html) {
                this.nodes.htmlArea.value = this.editors.html.getValue().trim() ?? '';
            }
            return true;
        }
        return false;
    }

    /**
     * Enable or disable the control buttons.
     * @param {boolean} enabled
     * @private
     */
    _setButtonsEnabled(enabled) {
        if (this.nodes.saveBtn) {
            this.nodes.saveBtn.disabled = !enabled;
        }
        if (this.nodes.saveCloseBtn) {
            this.nodes.saveCloseBtn.disabled = !enabled;
        }
        if (this.nodes.refreshBtn) {
            this.nodes.refreshBtn.disabled = !enabled;
        }
    }

    /**
     * Select a tab.
     * @param {string} name - 'yml', 'css', 'html', 'preview', 'tiny'
     * @private
     */
    _selectTab(name) {
        /** @type {HTMLAnchorElement | null} */
        const tab = document.querySelector(`a[data-toggle="tab"][href="#p-${name}"], a[data-bs-toggle="tab"][data-bs-target="#p-${name}"]`);
        if (tab && !tab.classList.contains('disabled')) {
            tab.click();
        }
    }

    /**
     * Handles the refresh button click event.
     */
    async _onRefreshBtnClick() {
        if (!this.nodes.refreshBtn || !this.editors.yml) {
            return;
        }

        const partials = JSON.parse(this.nodes.partialArea.value || '{}');

        // Select tab tiny.
        this._selectTab('tiny');
        this.tinyPreviewStrategy?.render('<p></p>');
        spinButton(this.nodes.refreshBtn, 'fa-magnifying-glass');
        this.nodes.refreshBtn.disabled = true;

        const yml = this.editors.yml?.getValue() || '';
        const validation = await this.validate(yml, partials);

        if (validation.json) {
            const parsed = JSON.parse(validation.json);
            if (parsed?.key === 'partials') {
                if (this.nodes.refreshBtn) {
                    this.nodes.refreshBtn.disabled = false;
                }
                return;
            }
        }

        if (validation.msg) {
            this.nodes.alertLog.insertAdjacentHTML('afterbegin', `<div class="alert alert-danger">${validation.msg}</div>`);
            this._selectTab('log');
        } else if (validation.html) {
            if (this.nodes.jsonArea) {
                this.nodes.jsonArea.value = validation.json ?? '';
            }
            if (this.nodes.ymlArea) {
                this.nodes.ymlArea.value = yml;
            }
            this.tinyPreviewStrategy?.render(
                validation.html ?? '<p></p>',
                validation.obj,
                ''
            );
        }
        this.nodes.refreshBtn.disabled = false;
        unspinButton(this.nodes.refreshBtn, 'fa-magnifying-glass');
    }

    /**
     * Render and initialize the component.
     */
    async render() {
        // Preview button event
        this.nodes.refreshBtn?.addEventListener('click', (/** @type {Event} */ ev) => {
            ev.preventDefault();
            this._onRefreshBtnClick();
        });

        // Clear log button event
        if (this.nodes.clearLogBtn) {
            this.nodes.clearLogBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                this.nodes.alertLog?.querySelectorAll('.alert').forEach(e => e.remove());
            });
        }

        // Action to be performed before submission
        const form = this.nodes.saveBtn.closest('form');
        if (form) {
            form.addEventListener('submit', async (/** @type {SubmitEvent} */ evt) => {
                const submitter = evt.submitter;
                // @ts-ignore
                const actionName = submitter?.name ?? 'save';
                if (actionName === 'cancel') {
                    return;
                }
                evt.preventDefault();
                const passed = await this.preSaveAction();
                if (passed) {
                    /** @type {HTMLInputElement | null} */
                    const inputAction = form.querySelector('input[name="action"]');
                    if (inputAction) {
                        inputAction.value = actionName;
                    }
                    form.submit();
                }
            });
        }

        // Initialize TinyMCE editor
        this._createEditor('yml');
        // Intialize other editors on demand
        document.querySelectorAll(`a[data-toggle="tab"], a[data-bs-toggle="tab"]`).forEach((anchor) => {
            const href = anchor.getAttribute('href') || anchor.getAttribute('data-bs-target');
            if (!href) {
                return;
            }
            const type = href.replace('#p-', '');

            const action = () => {
                if (type === 'css' || type === 'html') {
                    this._createEditor(type);
                } else if (type === 'preview') {
                    this._createPreview();
                }
            };
            anchor.addEventListener('click', action);
            if (anchor.classList.contains('active')) {
                action();
            }
        });

        this._setButtonsEnabled(true);

        // Need to poll the previewStrategy to see if it has rendered the content.
        if (this.nodes.previewTiny) {
            let tries = 10;
            const interval = setInterval(() => {
                if (this.tinyPreviewStrategy?.init()) {
                    // Now it is safe to create preview
                    clearInterval(interval);
                    if (this.id !== null && this.id >= 0) {
                        this.nodes.refreshBtn?.click();
                    }
                }
                tries--;
                if (tries === 0) {
                    clearInterval(interval);
                }
            }, 1000);
        }

        setTimeout(() => {
            // Find the specific success notification.
            const notifications = document.querySelectorAll('#user-notifications > div.alert.alert-success');

            notifications.forEach(notification => {
                // @ts-ignore
                notification.querySelector('.close')?.click();
            });
        }, 5000); // 5 seconds delay

        //document.body.classList.remove(`${component}-loader`);
    }

    /**
     * Dynamically loads the tiny content into an iframe as a sandboxed environment.
     * It injects assets into the iframe.
     */
    async _createPreview() {
        // This is the iframe where the preview will be rendered.
        const iframe = this.nodes.previewPanel;
        if (!iframe) {
            return;
        }
        // @ts-ignore
        const cfg = window.M?.cfg || {};
        const subversion = 1;
        // Inject css all generated by Moodle into the editor's iframe.
        const allCss = `${cfg.wwwroot}/theme/styles.php/${cfg.theme}/${cfg.themerev}_${subversion}/all`;

        iframe.style.width = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

        const tinyContent = this.tinyPreviewStrategy?.getValue();
        // Display the preview in an iframe.
        const iframeContent = `
        <html>
            <head>
                <link rel="stylesheet" href="${allCss}">
            </head>
            <body>
                ${tinyContent}
            </body>
        </html>`;

        if (iframe.src?.startsWith('blob:')) {
            URL.revokeObjectURL(iframe.src);
        }
        iframe.src = URL.createObjectURL(new Blob([iframeContent], { type: 'text/html' }));

    }
}
