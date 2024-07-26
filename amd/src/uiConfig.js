/* eslint-disable no-eq-null */
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

import {IBConfigModal} from "./modal";
import ModalEvents from 'core/modal_events';
import ModalFactory from 'core/modal_factory';
import {UserStorage} from "./util";
import {getCourseId, getUserId} from "./options";

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pmulet@iedib.net>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export class UiConfigCtrl {
    uiPickController;
    editor;
    modal;

    constructor(uiPickController) {
        this.uiPickController = uiPickController;
        this.editor = this.uiPickController.editor;
        this.userStorage = UserStorage.getInstance(getUserId(this.editor), getCourseId(this.editor));
    }

    async handleAction() {
        const data = {
            checked1: this.userStorage.getFromLocal('saveall', false) ? ' checked' : '',
            checked2: this.userStorage.getFromLocal('start.latexf', false) ? ' checked' : '',
            checked3: this.userStorage.getFromLocal('start.disablespanf', false) ? ' checked' : ''
        };
        this.modal = await ModalFactory.create({
                type: IBConfigModal.TYPE,
                templateContext: data,
                large: true,
        });
        this.modal.footer.find("button.btn-primary").on("click", () => {
            this.applyChanges();
            this.modal.destroy();
            this.uiPickController.show();
        });
        this.modal.footer.find("button.btn-secondary").on("click", () => {
            this.modal.destroy();
            this.uiPickController.show();
        });
        this.modal.getRoot().on(ModalEvents.hidden, () => {
            this.modal.destroy();
            this.uiPickController.show();
        });

        this.modal.show();
    }

    applyChanges() {
        const checked1 = this.modal.body.find("#snpt-ckbx-saveall").is(':checked');
        this.userStorage.setToLocal('saveall', checked1, false);
        const checked2 = this.modal.body.find("#snpt-ckbx-startlatexf").is(':checked');
        this.userStorage.setToLocal('start.latexf', checked2, false);
        const checked3 = this.modal.body.find("#snpt-ckbx-startspanf").is(':checked');
        this.userStorage.setToLocal('start.disablespanf', checked3, true);
    }
}