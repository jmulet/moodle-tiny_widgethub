/**
 * @jest-environment jsdom
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { getDomSrv } from '../src/service/dom_service';

// Mock virtual modules
require('./module.mocks')(jest);
const editorFactory = require('./editor.mock');
const {componentName} = require('../src/common').default;

/** @type {import('../src/options').RawWidget} */
const rawSnpt = {
    "id": 1,
    "name": "Capsa multi-propòsit",
    "key": "capsa-generica",
    "instructions": "<b>Alerta</b>: Serveix per informar d'una errada o situació greu a tenir en compte. <br> <b>Ampliació</b>: Marcau que el material és d'ampliació per als alumnes.<br> <b>Consell</b>: Donau un consell als alumnes.<br> <b>Important</b>: Remarcar que és un contingut rellevant que cal estudiar.<br> <b>Introducció</b>: Serveix per introduir un lliurament o una secció d'ell.  Triau una mida i idioma per a la capsa.\n",
    "template": "<p><br></p><!--begin: Capsa {{tipus}} {{mida}} -->\n<div class=\"iedib-capsa iedib-capsa-{{mida}} iedib-{{tipus}}-border\" data-lang=\"{{LANG}}\">\n  <div class=\"iedib-lateral iedib-{{tipus}}\">\n    <p class=\"iedib-titolLateral\">{{#I18n}}msg_{{tipus}}{{/I18n}}<span class=\"iedib-{{tipus}}-logo\"></span></p>\n  </div>\n  <div class=\"iedib-central\">\n   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna\n   aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n   Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint\n   occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>\n  </div>\n</div>\n<!--end: Capsa {{tipus}} {{mida}}--> <p><br></p>\n",
    "version": "1.0.0",
    "author": "J.Mulet",
    "category": "capses",
    "insertquery": ".iedib-central",
    "selectors": ".iedib-capsa.iedib-alerta-border,.iedib-capsa.iedib-ampliacio-border,.iedib-capsa.iedib-consell-border,.iedib-capsa.iedib-important-border,.iedib-capsa.iedib-introduccio-border",
    "unwrap": "div.iedib-central > *",
    "I18n": {
        "msg_alerta": { "ca": "ALERTA", "es": "ALERTA", "en": "WATCH OUT", "fr": "ATTENTION", "de": "ACHTUNG" },
        "msg_ampliacio": { "ca": "AMPLIACIÓ", "es": "AMPLIACIÓN", "en": "EXTENSION", "fr": "EXTENSION", "de": "ERWEITERUNG" },
        "msg_consell": { "ca": "CONSELL", "es": "CONSEJO", "en": "ADVICE", "fr": "CONSEIL", "de": "TIPP" },
        "msg_important": { "ca": "IMPORTANT", "es": "IMPORTANTE", "en": "IMPORTANT", "fr": "IMPORTANT", "de": "WICHTIG" },
        "msg_introduccio": { "ca": "INTRODUCCIÓ", "es": "INTRODUCIÓN", "en": "INTRODUCTION", "fr": "INTRODUCTION", "de": "EINFÜHRUNG" }
    },
    "parameters": [
        { "name": "tipus", "value": "alerta", "title": "Propòsit de la capsa", "type": "select", "options": [{ "v": "alerta", "l": "Alerta" }, { "v": "ampliacio", "l": "Ampliació" }, { "v": "consell", "l": "Consell" }, { "v": "important", "l": "Important" }, { "v": "introduccio", "l": "Introducció" }] },
        { "name": "mida", "value": "gran", "title": "Mida de la capsa", "type": "select", "options": [{ "v": "gran", "l": "Gran" }, { "v": "mitjana", "l": "Mitjana" }, { "v": "petita", "l": "Petita" }] },
        { "name": "LANG", "value": "CA", "title": "Idioma", "type": "select", "options": [{ "v": "ca", "l": "Català" }, { "v": "es", "l": "Castellà" }, { "v": "en", "l": "English" }, { "v": "fr", "l": "Francès" }, { "v": "de", "l": "Alemany" }] }]
};

describe('ContextInit', () => {
    /** @type {any} */
    let mockTranslateSrv;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        mockTranslateSrv = {
            get_strings: jest.fn().mockImplementation((/** @type {{key: string, component: string}[]} */ arg) => {
                return Promise.resolve(arg.map(e => e.key));
            })
        }
    });

    it('It creates a context menu with only unwrap item', async () => {
        // @ts-ignore
        const editor = editorFactory();
        editor.options.get = jest.fn().mockImplementation((/** @type {string} */ key) => {
            if (key === 'user') {
                return {
                    id: 1,
                    username: 'joe',
                    roles: ['teacher']
                };
            }
            return [rawSnpt];
        });
        const {ContextActionsManager} = require('../src/contextactions');
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv);
        await contextActionsManager.init();
        expect(editor.ui.registry.addIcon).toHaveBeenCalled();
        // Test context menus
        expect(editor.ui.registry.addContextMenu).toHaveBeenCalledWith(`${componentName}_cm`, expect.any(Object));
        const contextMenuUpdate = editor.ui.registry.addContextMenu.mock.calls[0][1].update;
        expect(typeof contextMenuUpdate).toBe('function');

        editor.setContent(`<p>ok</p>
            <div class="iedib-capsa iedib-alerta-border">
                <div class="iedib-central">
                    <span>hello</span>
                </div>
            </div>`);
        let nodeSelected = editor.getBody().querySelector('p');
        let menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe('');
        const ctx = contextActionsManager.ctx;
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.widget).toBeFalsy();
        expect(ctx.path?.elem).toBeFalsy();

        nodeSelected = editor.getBody().querySelector('span');
        menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe(`${componentName}_unwrap_item`);
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.elem).toBe(editor.getBody().querySelector('div.iedib-capsa'));
        expect(ctx.path?.widget?.key).toBe('capsa-generica');

        // Test context toolbar
        expect(editor.ui.registry.addContextToolbar).not.toHaveBeenCalled();
    });



    it('It creates a context menu with only unwrap, cut, printable item', async () => {
        // @ts-ignore
        const editor = editorFactory();
        const rawSnpt2 = {...rawSnpt,
            contextmenu: [
                {
                   actions: 'printable | cut'
                }
            ]
        }
        editor.options.get = jest.fn().mockImplementation((/** @type {string} */ key) => {
            if (key === 'user') {
                return {
                    id: 1,
                    username: 'joe',
                    roles: ['teacher']
                };
            }
            return [rawSnpt2];
        });
        const {ContextActionsManager} = require('../src/contextactions');
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv);
        await contextActionsManager.init();
        // Test context menus
        expect(editor.ui.registry.addContextMenu).toHaveBeenCalledWith(`${componentName}_cm`, expect.any(Object));
        const contextMenuUpdate = editor.ui.registry.addContextMenu.mock.calls[0][1].update;
        expect(typeof contextMenuUpdate).toBe('function');

        editor.setContent(`<p>ok</p>
            <div class="iedib-capsa iedib-alerta-border">
                <div class="iedib-central">
                    <span>hello</span>
                </div>
            </div>`);
        let nodeSelected = editor.getBody().querySelector('p');
        let menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe('');
        const ctx = contextActionsManager.ctx;
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.widget).toBeFalsy();
        expect(ctx.path?.elem).toBeFalsy();

        nodeSelected = editor.getBody().querySelector('.iedib-central');
        menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toContain(`${componentName}_unwrap_item`);
        expect(menuItems).toContain(`${componentName}_printable_item`);
        expect(menuItems).toContain(`${componentName}_cut_item`);
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.elem).toBe(editor.getBody().querySelector('div.iedib-capsa'));
        expect(ctx.path?.widget?.key).toBe('capsa-generica');

        // Test context toolbar
        expect(editor.ui.registry.addContextToolbar).not.toHaveBeenCalled();
    });
})