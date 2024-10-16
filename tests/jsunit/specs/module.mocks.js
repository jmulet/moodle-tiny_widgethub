// @ts-ignore
module.exports = function applyMocks(jest) { 
    jest.mock("jquery", () => {
        const $ = require('../node_modules/jquery/dist/jquery.js');
        return {
            __esModule: true,
            default: $,
        }
    }, { virtual: true }); 
    jest.mock("core/mustache", () => {
        const Mustache = require('mustache');
        return {
            __esModule: true,
            default: Mustache,
        }
    }, { virtual: true }); 
    jest.mock("core/str", () => {
        const fs = require('fs');
        const fileContent = fs.readFileSync("../../lang/en/tiny_widgethub.php", {encoding: "utf8"});
        const regex = /\$string\[\s*'(.*)'\s*\]\s*=\s*'\s*(.*)\s*'\s*;\s*/gm;
        const map = new Map();
        let m;
        while ((m = regex.exec(fileContent)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            
            // The result can be accessed through the `m`-variable.
            map.set(m[1], m[2]);
        }
        /** @param {{key: string, component: string}[]} kps */
        const get_strings = function(kps) {
            return Promise.resolve(kps.map(kp => map.get(kp.key) ?? kp.key));
        };
        const coreStr = {
            /** @param  {{key: string, component: string}}  kp */
            get_string: (kp) => get_strings([kp]),
            get_strings
        };
        return {
            _esModule: true,
            default: coreStr
        };
    }, { virtual: true }); 
    jest.mock("core/log", () => {
        return {
            __esModule: true,
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
        };
    }, { virtual: true });

    jest.mock("editor_tiny/options", () => ({
        __esModule: true,
        getFilePicker: jest.fn(),
        /* @ts-ignore */
        getPluginOptionName: jest.fn().mockImplementation((_, key) => key)
    }), {virtual: true});
    
    jest.mock("editor_tiny/utils", () => ({
        __esModule: true,
        displayFilepicker: jest.fn()
    }), {virtual: true});
    
    jest.mock("core/config", () => ({
        __esModule: true,
        default: {
            wwwroot: "https://server.com"
        }
    }), {virtual: true});
    jest.mock('core/modal', () => ({
        __esModule: true,
        default: class {
            registerEventListeners(){}
        }
    }), {virtual: true});
    jest.mock('core/modal_registry', () => ({
        __esModule: true,
        default: {
            register: jest.fn()
        }
    }), {virtual: true});
    jest.mock('core/modal_factory', () => ({
        __esModule: true,
        default: {
             
        }
    }), {virtual: true});
    jest.mock('core/modal_events', () => ({
        __esModule: true,
        default: {
             
        }
    }), {virtual: true});
};

/**
 * Mock the window object requirejs
 * @param {string[]} deps 
 * @param {*} cb 
 */
// @ts-ignore
const requirejs = (deps, cb) => {
    // @ts-ignore
    const resolves = deps.map(d => d. replace("tiny_widgethub", "../src")).map(d => require(d)).map(n => n.default ?? n);
    cb(...resolves);
};
// @ts-ignore
global.window = global.window || {};
// @ts-ignore
global.window["require"] = requirejs;
// @ts-ignore
global.requirejs = requirejs;
