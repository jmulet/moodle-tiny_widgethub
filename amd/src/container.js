import {WidgetParamsCtrl} from "./controller/widgetParamsCtrl";
import {WidgetPickerCtrl} from "./controller/widgetPickerCtrl";
import {FormCtrl} from "./controller/formCtrl";
import _modalSrv from "./service/modalSrv";
import _mustache from "core/mustache";
import TemplateSrv from "./service/templateSrv";
import UserStorageSrv from "./service/userStorageSrv";
import _jQuery from "jquery";
import { displayFilepicker } from "editor_tiny/utils";
import { getFilePicker } from "editor_tiny/options";
import WidgetPropertiesCtrl from "./controller/widgetPropertiesCtrl";
import { EditorOptions } from "./options";

// Singleton instances (shared among editors)
/**
 * @type {TemplateSrv | undefined}
 */
let _templateSrv;
/**
 * Load on demand the template engine EJS
 * @typedef {Object} EJS
 * @property {(template: string, ctx: Object.<string,any>) => string} render
 */
/** @type {EJS | undefined} */
let _ejs;
export const ejsLoader = () => {
    if (_ejs) {
    return Promise.resolve(_ejs);
    }
    return new Promise((resolve, reject) => {
        // @ts-ignore
        window.require(['tiny_widgethub/ejs-lazy'], (ejsModule) => {
            _ejs = ejsModule;
            if (_ejs) {
                resolve(_ejs);
            } else {
                reject();
            }
        }, reject);
    });
};

/**
 * Container for dependency injection
 * @member {TinyMCE} _editor
 * @member {WidgetPickerCtrl} _widgetPickCtrl
 */
export class DIContainer {
    /**
     * @type {import("./plugin").TinyMCE}
     */
    editor;
    /**
     * @type { WidgetPickerCtrl | undefined}
     */
    _widgetPickCtrl;

    /**
     * @type {Record<string, UserStorageSrv>}
     */
    _userStorageInstances = {};

    /**
     * @type {EditorOptions | undefined}
     */
    _editorOptions;

    /**
     * @type {FormCtrl | undefined}
     */
    _formCtrl;

    /**
     * @param {import("./plugin").TinyMCE} editor
     */
    constructor(editor) {
        this.editor = editor;
    }

    get editorOptions() {
        this._editorOptions = this._editorOptions ?? new EditorOptions(this);
        return this._editorOptions;
    }

    get widgetParamsFactory() {
        /**
         * @param {import('./util').WidgetWrapper} widget
         */
        return (widget) => {
            // Creates multiple instances of the service
            return new WidgetParamsCtrl(this, widget);
        };
    }
    /**
     * @scope {editor}
     */
    get widgetPickCtrl() {
        this._widgetPickCtrl = this._widgetPickCtrl ?? new WidgetPickerCtrl(this);
        return this._widgetPickCtrl;
    }

    get widgetPropertiesCtrl() {
        this._widgetPropertiesCtrl = this._widgetPropertiesCtrl ?? new WidgetPropertiesCtrl(this);
        return this._widgetPropertiesCtrl;
    }

    get formCtrl() {
        this._formCtrl = this._formCtrl ?? new FormCtrl(this);
        return this._formCtrl;
    }

    /**
     * @scope {singleton}
     */
    get modalSrv() {
        return _modalSrv;
    }

    /**
     * @scope {singleton}
     */
    get templateSrv() {
        _templateSrv = _templateSrv || new TemplateSrv(this);
        return _templateSrv;
    }

    /**
     * Provides an implementation based on browser storage
     */
    get iStorage() {
        return {
            localStorage,
            sessionStorage
        };
    }

    /**
     * @scope {singleton} for each user and course
     */
    get userStorage() {
        const userId = this.editorOptions.userId;
        const courseId = this.editorOptions.courseId;
        const key =  userId + "_" + courseId;
        // @ts-ignore
        if (!this._userStorageInstances[key]) {
            this._userStorageInstances[key] = new UserStorageSrv(this, userId, courseId);
        }
        return this._userStorageInstances[key];
    }

    get mustache() {
        return _mustache;
    }

    /**
     * @returns {() => Promise<EJS>}
     */
    get ejsLoader() {
        return ejsLoader;
    }

    get fileSrv() {
        this._fileSrv = this._fileSrv || {
            getImagePicker: () => {
                return getFilePicker(this.editor, 'image');
            },
            displayImagePicker: () => {
                return displayFilepicker(this.editor, 'image');
            }
        };
        return this._fileSrv;
    }

    get jQuery() {
        return _jQuery;
    }
}