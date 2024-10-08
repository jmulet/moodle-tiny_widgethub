import { WidgetParamsCtrl } from "./controller/widgetParamsCtrl";
import { WidgetPickerCtrl } from "./controller/widgetPickerCtrl";
import { FormCtrl } from "./controller/formCtrl";
import {ModalSrv} from "./service/modalSrv";
import Mustache from "core/mustache";
import {TemplateSrv} from "./service/templateSrv";
import {UserStorageSrv} from "./service/userStorageSrv";
import jQuery from "jquery";
import { displayFilepicker } from "editor_tiny/utils";
import { getFilePicker } from "editor_tiny/options";
import WidgetPropertiesCtrl from "./controller/widgetPropertiesCtrl";
import { EditorOptions } from "./options";
import { initContextActions } from "./contextInit";
import { DomSrv } from "./service/domSrv";
import { applyWidgetFilter } from "./util";
import * as coreStr from "core/str";

export class FileSrv {
    /**
     * @param {import('./plugin').TinyMCE} editor
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
 * Determines if something is a class or not
 * @param {*} obj
 * @returns {boolean}
 */
function isClass(obj) {
    const isCtorClass = obj.constructor?.toString()?.substring(0, 5) === 'class';
    if (obj.prototype === undefined) {
        return isCtorClass;
    }
    const isPrototypeCtorClass = obj.prototype?.constructor?.toString()?.substring(0, 5) === 'class';
    return isCtorClass || isPrototypeCtorClass;
}

/**
 * Container for dependency injection
 * @typedef {{name: string, type: 'singleton' | 'service' | 'factory', obj: *, deps: string[]}} DIRegistryEntry
 */
export class DIContainer {
    /**
     * @type {Map<string, DIRegistryEntry>}
     */
    static #registry = new Map();
    /**
     * @type {Map<string, *>}
     */
    static #singletonInstances = new Map();
    /**
     * @type {Map<string, *>}
     */
    #serviceInstances = new Map();

    /**
     * @param {string=} dependencies
     * @returns {string[]}
     */
    static #parseDeps(dependencies) {
        if (!dependencies?.trim()) {
            return [];
        }
        return dependencies.split(',').map(e => e.trim());
    }

    /**
     * @param {string} name
     * @param {*} obj
     * @param {string=} dependencies
     */
    static registerSingleton(name, obj, dependencies) {
        this.#registry.set(name, { name, type: 'singleton', obj, deps: DIContainer.#parseDeps(dependencies) });
    }

    /**
     * @param {string} name
     * @param {*} obj
     * @param {string=} dependencies
     */
    static registerService(name, obj, dependencies) {
        this.#registry.set(name, { name, type: 'service', obj, deps: DIContainer.#parseDeps(dependencies) });
    }

    /**
    * @param {string} name
    * @param {*} obj
    * @param {string=} dependencies
    */
    static registerFactory(name, obj, dependencies) {
        this.#registry.set(name, { name, type: 'factory', obj, deps: DIContainer.#parseDeps(dependencies) });
    }

    /**
     * Register a instance in the container
     * @param {string} name
     * @param {*} obj
     */
    registerInstance(name, obj) {
        this.#serviceInstances.set(name, obj);
    }

    /**
     * @param {string} name
     * @returns {*} - An instance of the "name" in the correct scope
     */
    get(name) {
        if (name.indexOf(",") > 0) {
            return name.split(",").map(e => this.get(e.trim()));
        }
        // Check if already exists an instance with this name.
        if (this.#serviceInstances.has(name)) {
            return this.#serviceInstances.get(name);
        }
        const reg = DIContainer.#registry.get(name);
        if (!reg) {
            throw new Error(`Cannot find a registry for dependency ${name}`);
        }
        switch (reg.type) {
            case ('singleton'): return this.#getInstance(DIContainer.#singletonInstances, reg);
            case ('service'): return this.#getInstance(this.#serviceInstances, reg);
            case ('factory'): {
                const deps = (reg.deps ?? []).map(name => this.get(name));
                if (isClass(reg.obj)) {
                    // Has to instantiate a class.
                    /** @param {*[]} args */
                    return (...args) => {
                        return new reg.obj(...deps, ...args);
                    };
                } else if (typeof (reg.obj) === 'function') {
                    // Has to call the function.
                    /** @param {*[]} args */
                    return (...args) => {
                        return reg.obj(...deps, ...args);
                    };
                }
            }
        }
        throw new Error(`Invalid registry type ${reg.type}`);
    }

    /**
     * @param {Map<string, *>} map
     * @param {DIRegistryEntry} reg
     * @returns {*}
     */
    #getInstance(map, reg) {
        if (map.has(reg.name)) {
            return map.get(reg.name);
        }
        // Create an instance
        const instance = this.#createInstance(reg);
        map.set(reg.name, instance);
        return instance;
    }

    /**
     * @param {DIRegistryEntry} reg
     * @returns {*}
     */
    #createInstance(reg) {
        // Need to get all the dependencies.
        const deps = (reg.deps ?? []).map(name => this.get(name));
        if (isClass(reg.obj)) {
            // Has to instantiate a class.
            return new reg.obj(...deps);
        } else if (typeof (reg.obj) === 'function' && deps.length) {
            // Prevent from calling functions like jQuery if no dependencies are passed
            // Has to call the function.
            return reg.obj(...deps);
        } else {
            // Return directly.
            return reg.obj;
        }
    }
}

/** @typedef {{localStorage: Storage, sessionStorage: Storage}} IStorage */

DIContainer.registerSingleton("jQuery", jQuery);
DIContainer.registerSingleton("coreStr", coreStr);
DIContainer.registerSingleton("modalSrv", ModalSrv);
DIContainer.registerSingleton("mustache", Mustache);
DIContainer.registerSingleton("ejsLoader", ejsLoader);
DIContainer.registerSingleton("iStorage", { localStorage, sessionStorage });
DIContainer.registerService("editorOptions", EditorOptions, "editor");
DIContainer.registerFactory("widgetParamsFactory", WidgetParamsCtrl, "editor, userStorage, templateSrv, modalSrv, formCtrl");
DIContainer.registerService("widgetPickCtrl", WidgetPickerCtrl,
    "editor, editorOptions, widgetParamsFactory, modalSrv, templateSrv, userStorage");
DIContainer.registerService("widgetPropertiesCtrl", WidgetPropertiesCtrl, "editor, formCtrl, modalSrv");
DIContainer.registerService("formCtrl", FormCtrl, "editor, userStorage, templateSrv, fileSrv, jQuery");
DIContainer.registerSingleton("domSrv", DomSrv, "jQuery");
DIContainer.registerSingleton("templateSrv", TemplateSrv, "mustache, ejsLoader");
DIContainer.registerSingleton("userStorage", UserStorageSrv, "editorOptions, iStorage");
DIContainer.registerService("fileSrv", FileSrv, "editor");
DIContainer.registerFactory("initContextActions", initContextActions,
    "editor, editorOptions, widgetPropertiesCtrl, domSrv, jQuery");
DIContainer.registerSingleton("applyWidgetFilter", applyWidgetFilter, "coreStr");