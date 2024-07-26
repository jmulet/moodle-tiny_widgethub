/* eslint-disable no-console */
/* eslint-disable no-bitwise */
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
 * @copyright   2024 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {IBContextModal} from './modal';
import ModalFactory from 'core/modal_factory';
import ModalEvents from 'core/modal_events';
import {createControlHTML, getParametersFromForm, applyFieldWatchers} from './uiParams';
import {parseBinding} from './util';


// TODO implement me!
const hasBindings = () => true;

// Create a generic editor dialogue class based on editor field of widget definition
export default class ContextProperties {
    /**
     * @member {any} editor
     */
    editor;

    constructor(editor) {
        this.editor = editor;
    }

    async show(currentContext) {
        const edSnpt = currentContext.snpt;
        const hostId = this.editor.id;

        if (!hasBindings(edSnpt)) {
            console.error("Invalid genericEditor widget definition ", edSnpt);
            return;
        }

        // Create bindings
        const bindingsDOM = {};
        // Extract param values from DOM
        const paramValues = {};
        edSnpt.parameters.filter(param => param.bind).forEach((param) => {
            const binding = parseBinding(param.bind, currentContext.elem, typeof (param.value));
            if (binding) {
                bindingsDOM[param.name] = binding;
                paramValues[param.name] = binding.getValue();
            }
        });
        console.log("DETECTED FROM DOM PARAMS ", paramValues);

        // Create parameters form controls
        // Filter only those parameters which have default Values
        const controls = [];
        edSnpt.parameters.filter(param => param.bind).forEach((param) => {
            controls.push(createControlHTML(hostId, param, paramValues[param.name]));
        });
        console.log("The generated controls are ", controls);

        const data = {
            name: edSnpt.name,
            controls: controls
        };

        // Create the modal
        this.modal = await ModalFactory.create({
            type: IBContextModal.TYPE,
            templateContext: data,
            large: true,
        });
        this.modal.getRoot().on(ModalEvents.hidden, () => {
            this.modal.destroy();
        });
        // Applying watchers to the form elements
        applyFieldWatchers(this.modal.body, paramValues, edSnpt, false);

        // Bind accept action to modal
        this.modal.footer.find("button.btn-secondary").on("click", () => {
            this.modal.destroy();
        });
        this.modal.footer.find("button.btn-primary").on("click", () => {
            const form = this.modal.body.find("form");
            const updatedValues = getParametersFromForm(edSnpt, form, null);
            this.modal.destroy();
            // Set Param Values To DOM
            Object.keys(bindingsDOM).forEach(key => {
                bindingsDOM[key].setValue(updatedValues[key]);
            });
        });
        console.log("Showing the modal");
        this.modal.show();
    }
}
