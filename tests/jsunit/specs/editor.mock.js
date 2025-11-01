/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { TextEncoder, TextDecoder } from "node:util";
Object.assign(global, { TextEncoder, TextDecoder });

module.exports = function editorFactory(editorId=1, userInfo={id:1, username: 'joe', roles: ['student']}, selection="") {
    const {JSDOM} = require('jsdom');
    // Create a new JSDOM instance
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    // Access the document
    const doc= dom.window.document;

    return {
        id: editorId, 
        selection: {
            getContent: jest.fn().mockImplementation(() => selection),
            setContent: jest.fn()
        },
        options: {
            get: jest.fn().mockImplementation((key) => {
                if (key === 'user') {
                    return userInfo;
                }
            }),
            register: jest.fn()
        },
        windowManager: {
            confirm: jest.fn()
        },
        notificationManager: {
            open: jest.fn(),
        },
        setDirty: jest.fn(),
        focus: jest.fn(),
        dom: {
            window: dom.window,
            create: jest.fn().mockImplementation((elemTag, props, inner) => {
                const elem = doc.createElement(elemTag);
                if (props) {
                    Object.keys(props).forEach(key => {
                        elem.setAttribute(key, props[key]);
                    });
                }
                if (inner) {
                    elem.innerHTML = inner;
                }
                return elem;
            })
        },
        getBody: jest.fn().mockReturnValue(doc.body),
        getContent: jest.fn().mockImplementation(t => doc.body.innerHTML),
        setContent: jest.fn().mockImplementation(t => {doc.body.innerHTML = t; }),
        getDoc: jest.fn().mockReturnValue(doc),
        ui: {
                registry: {
                    addIcon: jest.fn(),
                    addButton: jest.fn(),
                    addMenubarItem: jest.fn(),
                    addMenuItem: jest.fn(),
                    addNestedMenuItem: jest.fn(),
                    addContextMenu: jest.fn(),
                    addContextToolbar: jest.fn(),
                    addToggleMenuButton: jest.fn(),
                    addToggleMenuItem: jest.fn(),
                    getAll: jest.fn().mockReturnValue("")
                }
            },
    }
};