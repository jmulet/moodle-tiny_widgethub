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
import {getFilePicker} from 'editor_tiny/options';
import {displayFilepicker} from 'editor_tiny/utils';

export class FileSrv {
    /**
     * @param {import('../plugin').TinyMCE} editor
     */
    constructor(editor) {
        this.editor = editor;
    }
    getImagePicker() {
        return getFilePicker(this.editor, 'image');
    }
    displayImagePicker() {
        return displayFilepicker(this.editor, 'image');
    }
}

const fileSrvInstances = new Map();
/**
 * @param {import('../plugin').TinyMCE} editor
 * @returns {FileSrv}
 */
export function getFileSrv(editor) {
    let instance = fileSrvInstances.get(editor);
    if (!instance) {
        instance = new FileSrv(editor);
        fileSrvInstances.set(editor, instance);
    }
    return instance;
}
