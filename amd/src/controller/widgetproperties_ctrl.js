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

import { getFormCtrl } from '../controller/form_ctrl';
import { getModalSrv } from '../service/modal_service';
import { BindingsAdapter } from '../bindings';

/**
 * @class
 * @classdesc Defines a generic editor dialogue based on widget definition fields
 */
export class WidgetPropertiesCtrl {
    /** @type {import('../service/modal_service').ModalDialogue | null} */
    modal = null;

    /** @type {import('../service/sandbox').RemoteDom | null} */
    remoteDom = null;

    /** @type {string | null} */
    vdomId = null;

    /**
     * @param {import('../plugin').TinyMCE} editor
     * @param {import('../controller/form_ctrl').FormCtrl} formCtrl
     * @param {import('../service/modal_service').ModalSrv} modalSrv
     **/
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
     * @param {import('../contextactions').PathResult} currentContext
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
            console.error("Widget has no bindings ", widget);
            return;
        }
        this.bindingsAdapter = new BindingsAdapter(elem, widget);
        const valuesFromDom = await this.bindingsAdapter.getValues();

        // Create parameters form controls
        /** @type {string[]} */
        const controls = Object.values(valuesFromDom)
            .map(res => this.formCtrl.createControlHTML(hostId, res.param, res.value));

        const ctxData = {
            name: widget.name,
            controls: controls
        };

        // Create the modal
        // @ts-ignore
        this.modal = await this.modalSrv.create('context', ctxData, () => {
            this.close();
        });
        /** @type {import('../service/modal_service').ListenerTracker} */
        const listenerTracker = (/** @type {Element}*/ el, /** @type {string} */ evType, /** @type {EventListener} */ handler) => {
            this.modal?.twhRegisterListener(el, evType, handler);
        };
        const bodyElem = this.modal.body[0];
        // Bind actions on image and color pickers
        this.formCtrl.attachPickers(bodyElem, listenerTracker);
        // Applying watchers to the form elements
        const paramValues = Object.fromEntries(Object.entries(valuesFromDom).map(([name, e]) => [name, e.value]));
        this.formCtrl.applyFieldWatchers(bodyElem, paramValues, widget, false, listenerTracker);

        // Bind accept action to modal
        this.modal.footer.find("button.tiny_widgethub-btn-secondary").on("click", () => {
            this.close();
        });
        this.modal.footer.find("button.tiny_widgethub-btn-primary").on("click", async () => {
            const formElem = this.modal?.body.find('form')[0];
            if (formElem) {
                const updatedValues = this.formCtrl.extractFormParameters(widget, formElem, true);
                await this.bindingsAdapter?.setValues(updatedValues);
            }
            this.close();
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

    async close() {
        this.bindingsAdapter?.destroy();
        this.bindingsAdapter = null;
        this.modal?.destroy();
        this.modal = null;
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
