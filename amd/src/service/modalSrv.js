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
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Modal from 'core/modal';
import ModalRegistry from 'core/modal_registry';
import ModalFactory from 'core/modal_factory';
import ModalEvents from 'core/modal_events';

// @ts-ignore
class IBPickerModal extends Modal {
    static TYPE = 'tiny_widgethub/pickerModal';
    static TEMPLATE = 'tiny_widgethub/pickerModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}
// @ts-ignore
ModalRegistry.register(IBPickerModal.TYPE, IBPickerModal, IBPickerModal.TEMPLATE);


// @ts-ignore
class IBParamsModal extends Modal {
    static TYPE = 'tiny_widgethub/paramsModal';
    static TEMPLATE = 'tiny_widgethub/paramsModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}
// @ts-ignore
ModalRegistry.register(IBParamsModal.TYPE, IBParamsModal, IBParamsModal.TEMPLATE);

// @ts-ignore
class IBContextModal extends Modal {
    static TYPE = 'tiny_widgethub/contextModal';
    static TEMPLATE = 'tiny_widgethub/contextModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}
// @ts-ignore
ModalRegistry.register(IBContextModal.TYPE, IBContextModal, IBContextModal.TEMPLATE);

/**
 * @typedef {JQuery<HTMLElement> & {header: JQuery<HTMLElement>, body: JQuery<HTMLElement>, footer: JQuery<HTMLElement>,destroy: () => void, show: () => void, getRoot: () => {on: () => void}}} ModalDialogue
 */

/**
 * @typedef {{ destroyOnHidden: boolean | undefined}} ModalOpts
 */

export class ModalSrv {
    /**
     * @param {'picker' | 'params' | 'context'} name
     * @param {object} templateContext
     * @param {()=>void} [onHidden]
     * @returns {Promise<ModalDialogue>}
     */
    async create(name, templateContext, onHidden) {
        let type;
        switch (name) {
            case ('picker'): type = IBPickerModal.TYPE; break;
            case ('params'): type = IBParamsModal.TYPE; break;
            case ('context'): type = IBContextModal.TYPE; break;
        }
        // @ts-ignore
        const modal = await ModalFactory.create({
            type,
            templateContext,
            large: true,
        });
        // Override styles imposed by body.tox-fullscreen on modals
        modal.modal.css({
            'max-width': '800px',
            'height': 'initial'
        });
        modal.header.css({
            'height': '61.46px',
            'padding': '1rem 1rem'
        });
        if (onHidden) {
            // @ts-ignore
            modal.getRoot().on(ModalEvents.hidden, () => {
                onHidden();
            });
        }
        return modal;
    }
}

/** @type {ModalSrv | undefined} */
let instanceSrv;
/**
 * @returns {ModalSrv}
 */
export function getModalSrv() {
    if (!instanceSrv) {
        instanceSrv = new ModalSrv();
    }
    return instanceSrv;
}
