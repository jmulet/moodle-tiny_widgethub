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
import { RemoteDom } from '../service/sandbox';
import { fnCallParser } from '../util';
import { bindingsFactoryAPI } from '../bindings';

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

        // Parameters that contain bindings.
        const parametersWithBindings = widget.parameters.filter(param => {
            return param.bind !== undefined;
        });
        const hasRemoteBindings = parametersWithBindings.some(param => typeof param.bind === 'object');
        if (hasRemoteBindings) {
            // Create a Virtual Dom for the widget root element
            this.remoteDom = await RemoteDom.getInstance();
            this.vdomId = await this.remoteDom.createRemoteDom(elem);
        }

        const localBindings = new Map();

        /** @type {Array<Promise<any>>} */
        const pendingValuePromises = [];
        parametersWithBindings.forEach((param) => {
            const paramValueType = typeof (param.value);
            if (!param.bind) {
                return;
            }
            /** @type {string | {name: string, args: Array<any>}} */
            if (typeof param.bind === 'string') {
                // Retrieve the value of this parameter from the Local Dom
                const { name, args } = fnCallParser(param.bind);
                const bindingFactory = bindingsFactoryAPI[name];
                if (!bindingFactory) {
                    console.error("Binding function not found: ", name);
                    return;
                }
                const binder = bindingFactory(elem, ...args);
                localBindings.set(param.name, binder);
                const value = binder.getValue();
                pendingValuePromises.push(Promise.resolve({
                    name: param.name,
                    value
                }));
            } else if (typeof param.bind === 'object') {
                // Retrieve the value of this parameter from the Remote Dom
                if (this.remoteDom === null || this.vdomId === null) {
                    return;
                }
                const instructions = param.bind.getValue || param.bind.get || '';
                const useJQuery = param.bind.get !== undefined;
                pendingValuePromises.push(this.remoteDom.queryOnRemoteDom({
                    vid: this.vdomId,
                    name: param.name,
                    type: paramValueType,
                    instructions,
                    useJQuery
                }));
            }
        });

        // Extract param values from DOM
        /** @type {Object.<string, any>} Empty object {} without prototype */
        const paramValues = Object.create(null);

        const valuesFromDom = await Promise.all(pendingValuePromises);
        valuesFromDom.forEach(res => {
            paramValues[res.name] = res.value;
        });

        // Create parameters form controls
        /** @type {string[]} */
        const controls = valuesFromDom
            .map(res => this.formCtrl.createControlHTML(hostId, res.name, res.value));

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
        const formElem = this.modal.body.find('form')[0];
        // Bind actions on image and color pickers
        this.formCtrl.attachPickers(bodyElem, listenerTracker);
        // Applying watchers to the form elements
        this.formCtrl.applyFieldWatchers(bodyElem, paramValues, widget, false, listenerTracker);

        // Bind accept action to modal
        this.modal.footer.find("button.tiny_widgethub-btn-secondary").on("click", () => {
            this.close();
        });
        this.modal.footer.find("button.tiny_widgethub-btn-primary").on("click", async () => {
            let updatedValues = paramValues;
            if (formElem) {
                updatedValues = this.formCtrl.extractFormParameters(widget, formElem, true);
            }

            // Patch local bindings first
            localBindings.forEach((binder, name) => {
                const val = updatedValues[name];
                const oldValue = valuesFromDom.find(res => res.name === name)?.value;
                if (val !== undefined && val !== oldValue && val !== oldValue) {
                    binder.setValue(val);
                }
            });
            if (!this.remoteDom || !this.vdomId) {
                // We are done. Close the modal.
                this.close();
                return;
            }

            // Update parameter values to remote DOM.
            /** @type {Array<Promise<any>>} */
            const pendingUpdates = [];
            parametersWithBindings.filter(param => typeof param.bind === 'object')
                .forEach((param) => {
                    if (this.remoteDom === null || this.vdomId === null) {
                        return;
                    }
                    const oldValue = valuesFromDom.find(res => res.name === param.name)?.value;
                    const val = updatedValues[param.name];
                    if (val === undefined || val === oldValue || typeof param.bind !== 'object') {
                        return;
                    }
                    /** @type {string | {name: string, args: Array<any>}} */
                    const instructions = param.bind.getValue || param.bind.get || '';
                    const useJQuery = param.bind.get !== undefined;
                    pendingUpdates.push(this.remoteDom.updateRemoteDomValue({
                        vid: this.vdomId,
                        name: param.name,
                        value: val,
                        instructions,
                        useJQuery
                    }));
                });

            // Wait for all updates to complete on remote DOM.
            await Promise.all(pendingUpdates);
            // Retrieve the patches from remote DOM.
            await this.remoteDom.applyPatches(this.vdomId);

            // Do not close until remoteDom can be disposed.
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
        if (this.remoteDom && this.vdomId) {
            await this.remoteDom.destroyRemoteDom(this.vdomId);
            this.vdomId = null;
            this.remoteDom = null;
        }
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
