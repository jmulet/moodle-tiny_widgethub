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

import {getFormCtrl} from '../controller/form_ctrl';
import {getModalSrv} from '../service/modal_service';
import {createBinding} from '../util';

/**
 * @typedef {JQuery<HTMLElement>} ModalDialogue
 * @property {JQuery<HTMLElement>} header
 * @property {JQuery<HTMLElement>} body
 * @property {JQuery<HTMLElement>} footer
 * @property {() => void} destroy
 * @property {() => void} show
 */

/**
 * @class
 * @classdesc Defines a generic editor dialogue based on widget definition fields
 */
export class WidgetPropertiesCtrl {
    /** @type {import('../service/modal_service').ModalDialogue | null} */
    modal = null;

    /**
     * @param {import('../plugin').TinyMCE} editor
     * @param {import('../controller/form_ctrl').FormCtrl} formCtrl
     * @param {import('../service/modal_service').ModalSrv} modalSrv
     */
    constructor(editor, formCtrl, modalSrv) {
        /** @type {import('../plugin').TinyMCE} */
        this.editor = editor;
        /** @type {import('../controller/form_ctrl').FormCtrl} */
        this.formCtrl = formCtrl;
        /** @type {import('../service/modal_service').ModalSrv} */
        this.modalSrv = modalSrv;
    }

    /**
     * Displays a modal dialog for editing the currentContext
     * based on contextual
     * @param {import('../contextinit').PathResult} currentContext
     * @returns
     */
    async show(currentContext) {
        if (!currentContext.widget) {
            console.error("Missing widget on currentContext");
            return;
        }
        const widget = currentContext.widget;
        const hostId = this.editor.id;
        // The DOM element for the root of the widget
        const elem = currentContext.elem;

        if (!elem || !widget?.hasBindings()) {
            console.error("Invalid widget definition ", widget);
            return;
        }

        // Create bindings
        /** @type {Object.<string, any>} */
        const bindingsDOM = {};
        // Extract param values from DOM
        /** @type {Object.<string, any>} */
        const paramValues = {};
        // Parameters that contain bindings
        const parametersWithBindings = widget.parameters.filter(param => param.bind != undefined);
        parametersWithBindings.forEach((param) => {
            if (param.bind && param.type !== 'repeatable') {
                // A simple control binding
                const binding = createBinding(param.bind, elem, typeof (param.value));
                if (binding) {
                    const pname = param.name;
                    bindingsDOM[pname] = binding;
                    paramValues[pname] = binding.getValue();
                }
            } else if (typeof (param.bind) === 'string' && param.type === 'repeatable') {
                // Find all item containers in DOM (param.bind is a query to every item element)
                document.querySelectorAll(param.bind).forEach(itemRoot => {
                    // For every field in parameter which has binding, create it
                    param.fields?.filter(f => f.bind !== undefined).forEach((f, i) => {
                        // @ts-ignore
                        const binding = createBinding(f.bind, itemRoot, typeof (f.value));
                        if (binding) {
                            const pname = `${param.name}[${i}].${f.name}`;
                            bindingsDOM[pname] = binding;
                            paramValues[pname] = binding.getValue();
                        }
                    });
                });
            }
        });

        // Create parameters form controls
        /** @type {string[]} */
        const controls = parametersWithBindings
            .map(param => this.formCtrl.createControlHTML(hostId, param, paramValues[param.name]));

        const ctxData = {
            name: widget.name,
            controls: controls
        };

        // Create the modal
        // @ts-ignore
        this.modal = await this.modalSrv.create('context', ctxData, () => {
            this.modal?.destroy();
            this.modal = null;
        });
        // Bind actions on image and color pickers
        this.formCtrl.attachPickers(this.modal.body);
        // Applying watchers to the form elements
        this.formCtrl.applyFieldWatchers(this.modal.body, paramValues, widget, false);

        // Bind accept action to modal
        this.modal.footer.find("button.tiny_widgethub-btn-secondary").on("click", () => {
            this.modal?.destroy();
        });
        this.modal.footer.find("button.tiny_widgethub-btn-primary").on("click", () => {
            const form = this.modal?.body?.find("form");
            let updatedValues = paramValues;
            if (form) {
                updatedValues = this.formCtrl.extractFormParameters(widget, form, true);
            }
            this.modal?.destroy();
            // Update parameter values back to DOM
            Object.keys(bindingsDOM).forEach(key => {
                const val = updatedValues[key];
                if (Array.isArray(val)) {
                    val.forEach((obj, i) => {
                        if (typeof obj !== 'object') {
                            return;
                        }
                        Object.keys(obj).forEach(objKey => {
                            const realKey = `${key}[${i}].${objKey}`;
                            bindingsDOM[realKey].setValue(obj[objKey]);
                        });
                    });
                } else {
                    bindingsDOM[key].setValue(val);
                }
            });
        });

        // Help circles require popover
        try {
            // @ts-ignore
            this.modal.body.popover({
            container: "body",
            selector: "[data-toggle=popover][data-trigger=hover]",
            trigger: "hover"
            });
        } catch (ex) {
            // console.error(ex);
        }

        this.modal.show();
    }

    close() {
        this.modal?.destroy();
    }
}

const widgetPropertiesCtrlInstances = new Map();
/**
 * @param {import('../plugin').TinyMCE} editor
 * @returns {WidgetPropertiesCtrl}
 */
export function getWidgetPropertiesCtrl(editor) {
    let instance = widgetPropertiesCtrlInstances.get(editor);
    if (!instance) {
        instance = new WidgetPropertiesCtrl(editor, getFormCtrl(editor), getModalSrv());
        widgetPropertiesCtrlInstances.set(editor, instance);
    }
    return instance;
}
