// @ts-nocheck
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

class IBPickerModal extends Modal {
    static TYPE = 'tiny_widgethub/pickerModal';
    static TEMPLATE = 'tiny_widgethub/pickerModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}
ModalRegistry.register(IBPickerModal.TYPE, IBPickerModal, IBPickerModal.TEMPLATE);


class IBParamsModal extends Modal {
    static TYPE = 'tiny_widgethub/paramsModal';
    static TEMPLATE = 'tiny_widgethub/paramsModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}
ModalRegistry.register(IBParamsModal.TYPE, IBParamsModal, IBParamsModal.TEMPLATE);

class IBContextModal extends Modal {
    static TYPE = 'tiny_widgethub/contextModal';
    static TEMPLATE = 'tiny_widgethub/contextModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}
ModalRegistry.register(IBContextModal.TYPE, IBContextModal, IBContextModal.TEMPLATE);

/**
 * @typedef {
 *      JQuery<HTMLElement> extends {
 *          header: JQuery<HTMLElement>,
 *          body: JQuery<HTMLElement>,
 *          footer: JQuery<HTMLElement>,
 *          destroy(),
 *          show()
 *      }
 * } ModalDialogue
 *
 * @typedef {
 *    destroyOnHidden: boolean | undefined,
 * } ModalOpts
 */
export default {
    /**
     * @param {'picker' | 'params' | 'context'} name
     * @param {object} templateContext
     * @param {ModalOpts=} opts
     * @returns {Promise<ModalDialogue>}
     */
    create: (name, templateContext, opts) => {
        let type;
        switch (name) {
            case ('picker'): type = IBPickerModal.TYPE; break;
            case ('params'): type = IBParamsModal.TYPE; break;
            case ('context'): type = IBContextModal.TYPE; break;
        }
        const modal = ModalFactory.create({
            type,
            templateContext,
            large: true,
        });
        if (opts?.destroyOnHidden) {
            modal.getRoot().on(ModalEvents.hidden, () => {
                modal.destroy();
            });
        }
        return modal;
    },
};