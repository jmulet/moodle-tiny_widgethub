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

import Modal from 'core/modal';
import ModalRegistry from 'core/modal_registry';

export const IBPickModal = class extends Modal {
    static TYPE = 'tiny_widgethub/pickModal';
    static TEMPLATE = 'tiny_widgethub/pickModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
};
ModalRegistry.register(IBPickModal.TYPE, IBPickModal, IBPickModal.TEMPLATE);


export const IBParamsModal = class extends Modal {
    static TYPE = 'tiny_widgethub/paramsModal';
    static TEMPLATE = 'tiny_widgethub/paramsModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
};
ModalRegistry.register(IBParamsModal.TYPE, IBParamsModal, IBParamsModal.TEMPLATE);

export const IBContextModal = class extends Modal {
    static TYPE = 'tiny_widgethub/contexModal';
    static TEMPLATE = 'tiny_widgethub/contextModal';

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
};
ModalRegistry.register(IBContextModal.TYPE, IBContextModal, IBContextModal.TEMPLATE);