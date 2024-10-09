/**
 * @jest-environment jsdom
 */
import { DomSrv } from "../../src/service/domSrv";

/** @type {*} */
const jQuery = require("jquery");

/** @type {import('../../src/service/domSrv').DomSrv} */
let domSrv;

describe("DomSrv", () => {
    beforeEach(() => {
        domSrv = new DomSrv(jQuery);
    });

    test('The jquery node must be cloned', () => {
        const elem = jQuery('<div id="id1" data-target="#t1"><div id="t1"></div></div>');
        /** @type {Record<string, string>} */
        const idMap = {};
        const cloned = domSrv.smartClone(elem, elem, idMap);
        expect(cloned.prop('outerHTML')).toBe(`<div id="${idMap['id1']}" data-target="#${idMap['t1']}"><div id="${idMap['t1']}"></div></div>`);
    });

    test('Real case 1', () => {
        const elem = jQuery(` 
        <div class="whb-tabmenu">
        <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item">
                <a class="nav-link active" href="#id_1" data-toggle="tab" role="tab"><span>&nbsp;</span><span>Tab1</span></a>
            </li> 
            <li class="nav-item">
                <a class="nav-link" href="#id_2" data-toggle="tab" role="tab"><span>&nbsp;</span><span>Tab2</span></a>
            </li> 
        </ul>
        <div class="tab-content"> 
        <div class="tab-pane show active" id="id_1" role="tabpanel">
            <p> 1 Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
            consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        </div> 
        <div class="tab-pane" id="id_2" role="tabpanel">
            <p> 1 Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
            consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        </div> 
        </div>
        </div>`);

        const toClone = elem.find(".nav-item").first();

        /** @type {Record<string, string>} */

        const idMap = {};
        const cloned = domSrv.smartClone(toClone, elem, idMap);
        cloned.insertAfter(toClone);
        expect(cloned).toBeTruthy();
    });

    test('find references', () => {
        const $root = jQuery(`
            <div id="root">
                <div id="controls">
                    <ul>
                        <li id="li1">
                            <a data-bs-target="#c1" id="a1" data-parent="#root">a1</a>
                        </li>
                        <li id="li2">
                            <a data-target="#c2" id="a2" data-parent="#root">a2</a>
                        </li>
                    </ul>
                </div>
                <div id="content">
                    <div id="c1">
                        Content 1
                    </div>
                    <div id="c2">
                        Content 2
                    </div>
                </div>
            </div>    
        `);
        let $e = $root.find("#li2");
        let found = domSrv.findReferences($e, $root);
        expect(found.length).toBe(1);
        expect(found[0].text().trim()).toBe("Content 2");
        
        $e = $root.find("#li1 > a");
        found = domSrv.findReferences($e, $root);
        expect(found.length).toBe(1);
        expect(found[0].text().trim()).toBe("Content 1");
    });
});