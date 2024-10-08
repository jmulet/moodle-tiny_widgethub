/**
 * @jest-environment jsdom
 */
import { FormCtrl } from "../../src/controller/formCtrl";

const jQuery = require('jquery');

const mockEditor = {
    id: 1,
    content: {
        getSelection: jest.fn()
    }
};

/** @type {*} */
const mockUserStorage = {
    localStorage,
    sessionStorage
};

/** @type {*} */
const mockTemplateSrv = {
    render: jest.fn(),
    renderMustache: jest.fn(),
    renderEJS: jest.fn()
};

/** @type {*} */
const mockFileSrv = {
    getImagePicker: jest.fn(),
    displayImagePicker: jest.fn()
};

const formCtrl = new FormCtrl(mockEditor, mockUserStorage, mockTemplateSrv, mockFileSrv, jQuery);

describe("FormCtrl", () => {

    it("FormCtrl is created", () => {
        expect(formCtrl).not.toBeNull();
    });

});