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

import {getFormCtrl} from '../controller/formCtrl';
import {getModalSrv} from '../service/modalSrv';
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
    /** @type {import('../service/modalSrv').ModalDialogue | null} */
    modal = null;

    /**
     * @param {import('../plugin').TinyMCE} editor
     * @param {import('../controller/formCtrl').FormCtrl} formCtrl
     * @param {import('../service/modalSrv').ModalSrv} modalSrv
     */
    constructor(editor, formCtrl, modalSrv) {
        /** @type {import('../plugin').TinyMCE} */
        this.editor = editor;
        /** @type {import('../controller/formCtrl').FormCtrl} */
        this.formCtrl = formCtrl;
        /** @type {import('../service/modalSrv').ModalSrv} */
        this.modalSrv = modalSrv;
    }

    /**
     * Displays a modal dialog for editing the currentContext
     * based on contextual
     * @param {import('../contextInit').PathResult} currentContext
     * @returns
     */
    async show(currentContext) {
        if (!currentContext.widget) {
            console.error("Missing widget on currentContext");
            return;
        }
        const widget = currentContext.widget;
        const hostId = this.editor.id;
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
        widget.parameters.filter(param => param.bind != undefined).forEach((param) => {
            if (!param.bind) {
                return;
            }
            const binding = createBinding(param.bind, elem, typeof (param.value));
            if (binding) {
                bindingsDOM[param.name] = binding;
                paramValues[param.name] = binding.getValue();
            }
        });

        // Create parameters form controls
        // Filter only those parameters which have default Values
        /** @type {string[]} */
        const controls = widget.parameters.filter(param => param.bind)
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
        this.formCtrl.attachPickers(this.modal.body);
        // Applying watchers to the form elements
        this.formCtrl.applyFieldWatchers(this.modal.body, paramValues, widget, false);

        // Bind accept action to modal
        this.modal.footer.find("button.btn-secondary").on("click", () => {
            this.modal?.destroy();
        });
        this.modal.footer.find("button.btn-primary").on("click", () => {
            const form = this.modal?.body?.find("form");
            let updatedValues = paramValues;
            if (form) {
                updatedValues = this.formCtrl.extractFormParameters(widget, form, true);
            }
            this.modal?.destroy();
            // Apply Param Values To DOM
            Object.keys(bindingsDOM).forEach(key => {
                bindingsDOM[key].setValue(updatedValues[key]);
            });
            this.editor.setDirty(true);
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
            console.error(ex);
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
