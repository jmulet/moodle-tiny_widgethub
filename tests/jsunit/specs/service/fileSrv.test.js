require('../module.mocks')(jest);
const {FileSrv, getFileSrv} = require("../../src/service/fileSrv");

/** @type {import('../../src/service/fileSrv').FileSrv} */
let fileSrv;
const editor = {id: 1};

describe('FileSrv', () => {
    beforeEach(() => {
        fileSrv = new FileSrv(editor);
    });

    it('It must create', () => {
        expect(fileSrv).toBeTruthy();
    });

    it('It must create from cache', () => {
        const f1 = getFileSrv(editor);
        expect(f1).toBeTruthy();
        const f2 = getFileSrv(editor);
        expect(Object.is(f1, f2)).toBe(true);
        const f3 = getFileSrv({...editor, id: 2});
        expect(Object.is(f1, f3)).toBe(false);
    })

    it('It must get the filePicker', () => {
        const {getFilePicker} = require('editor_tiny/options');
        fileSrv.getImagePicker();
        expect(getFilePicker).toHaveBeenCalledWith(editor, 'image');
    });

    it('It must display the filePicker', () => {
        const {displayFilepicker} = require('editor_tiny/utils');
        fileSrv.displayImagePicker();
        expect(displayFilepicker).toHaveBeenCalledWith(editor, 'image');
    });
});
