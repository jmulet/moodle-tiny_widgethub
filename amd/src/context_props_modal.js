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

import {IBContextModal} from './modal';
import ModalFactory from 'core/modal_factory';
import ModalEvents from 'core/modal_events';
import {createControlHTML, getParametersFromForm, applyFieldWatchers} from './uiParams';
import {parseBinding} from './util';

/**
 * @class
 * @classdesc Create a generic editor dialogue class based on editor field of widget definition
 */
export default class ContextPropsModal {
    /**
     * @member {TinyMCE} #editor
     */
    #editor;
    // @ts-ignore
    #modal;

    /**
     * @param {import('./plugin').TinyMCE} editor
     */
    constructor(editor) {
        this.#editor = editor;
    }

    /**
     * Displays a modal dialog for editing the currentContext
     * based on contextual
     * @param {import('./context_init').PathResult} currentContext
     * @returns
     */
    async show(currentContext) {
        const widget = currentContext.widget;
        const hostId = this.#editor.id;
        const elem = currentContext.elem;

        if (!elem || !widget?.hasBindings()) {
            // eslint-disable-next-line no-console
            console.error("Invalid genericEditor widget definition ", widget);
            return;
        }

        // Create bindings
        /** @type {Object.<string, any>} */
        const bindingsDOM = {};
        // Extract param values from DOM
        /** @type {Object.<string, any>} */
        const paramValues = {};
        widget.parameters.filter(param => param.bind?.trim()).forEach((param) => {
            const bindSrc = (param.bind ?? '').trim();
            const binding = parseBinding(bindSrc, elem, typeof (param.value));
            if (binding) {
                bindingsDOM[param.name] = binding;
                paramValues[param.name] = binding.getValue();
            }
        });

        // Create parameters form controls
        // Filter only those parameters which have default Values
        /** @type {string[]} */
        const controls = [];
        widget.parameters.filter(param => param.bind).forEach((param) => {
            controls.push(createControlHTML(hostId, param, paramValues[param.name]));
        });

        const data = {
            name: widget.name,
            controls: controls
        };

        // Create the modal
        // @ts-ignore
        this.#modal = await ModalFactory.create({
            type: IBContextModal.TYPE,
            templateContext: data,
            large: true,
        });
        // @ts-ignore
        this.#modal.getRoot().on(ModalEvents.hidden, () => {
            this.#modal.destroy();
        });
        // Applying watchers to the form elements
        applyFieldWatchers(this.#modal.body, paramValues, widget, false);

        // Bind accept action to modal
        this.#modal.footer.find("button.btn-secondary").on("click", () => {
            this.#modal.destroy();
        });
        this.#modal.footer.find("button.btn-primary").on("click", () => {
            const form = this.#modal.body.find("form");
            const updatedValues = getParametersFromForm(widget, form, null);
            this.#modal.destroy();
            // Apply Param Values To DOM
            Object.keys(bindingsDOM).forEach(key => {
                bindingsDOM[key].setValue(updatedValues[key]);
            });
        });
        this.#modal.show();
    }

    close() {
        this.#modal.destroy();
    }
}
