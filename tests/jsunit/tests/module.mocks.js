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
    jest.mock("core/str", () => jest.fn(), { virtual: true }); 
    jest.mock("core/log", () => {
        return {
            __esModule: true,
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
        };
    }, { virtual: true });
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
global.window["require"] = requirejs;
// @ts-ignore
global.requirejs = requirejs;