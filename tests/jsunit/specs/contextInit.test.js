/**
 * @jest-environment jsdom
 */
// Mock virtual modules
require('./module.mocks')(jest);

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


const jquery = require('jquery').default;
const { DomSrv } = require('../src/service/domSrv');
const srv = require('../src/contextInit');

describe('ContextInit', () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });

    it('creates', () => {
        const editor = {
            id: 1,
            ui: {
                registry: {
                    addIcon: jest.fn(),
                    addButton: jest.fn(),
                    addMenubarItem: jest.fn(),
                    addMenuItem: jest.fn(),
                    addContextMenu: jest.fn(),
                    getAll: jest.fn().mockReturnValue("")
                }
            },
            options: {
                get: () => {
                    return [rawSnpt];
                }
            }
        };
        srv.initContextActions(editor);
        expect(editor.ui.registry.addIcon).toHaveBeenCalled();
    });
})