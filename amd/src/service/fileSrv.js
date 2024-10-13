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
