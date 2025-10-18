/**
 * @jest-environment jsdom
 */
import { htmlToElement } from '../../src/util';

require('../module.mocks')(jest);
const {DomSrv, getDomSrv} = require("../../src/service/dom_service");

/** @type {import('../../src/service/dom_service').DomSrv} */
let domSrv;

describe("DomSrv", () => {
    beforeEach(() => {
        domSrv = new DomSrv();
    });

    test('It must create from cache', () => {
        const d1 = getDomSrv();
        const d2 = getDomSrv();
        expect(d1).toBeTruthy();
        expect(Object.is(d1, d2)).toBe(true);
    });

    test('The html node must be cloned', () => {
        const elem = htmlToElement('<div id="id1" data-target="#t1"><div id="t1"></div></div>');
        /** @type {Record<string, string>} */
        const idMap = {};
        const cloned = domSrv.smartClone(elem, elem, idMap);
        expect(cloned.outerHTML).toBe(`<div id="${idMap['id1']}" data-target="#${idMap['t1']}"><div id="${idMap['t1']}"></div></div>`);
    });

    test('Real case 1', () => {
        const elem = htmlToElement(` 
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

        const toClone = elem.querySelector(".nav-item");
        if (!toClone) throw new Error("toClone not found"); // runtime guard
        expect(toClone).toBeTruthy();

        /** @type {Record<string, string>} */

        const idMap = {};
        const cloned = domSrv.smartClone(toClone, elem, idMap);
        if (!cloned) throw new Error("cloned not found"); // runtime guard
        expect(cloned).toBeTruthy();
        // @ts-ignore
        toClone.parentNode.insertBefore(cloned, toClone.nextSibling);
    });

    test('find references', () => {
        const root = htmlToElement(`
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
        let elem = root.querySelector("#li2");
        if (!elem) throw new Error("#li2 not found"); // runtime guard
        expect(elem).toBeTruthy();
        let found = domSrv.findReferences(elem, root);
        expect(found).toBeTruthy();
        expect(found.map(f => f.textContent.trim()).join('')).toBe("Content 2");
        
        elem = root.querySelector("#li1 > a");
        if (!elem) throw new Error("#li1 > a not found"); // runtime guard
        found = domSrv.findReferences(elem, root);
        expect(found).toBeTruthy();
        expect(found.map(f => f.textContent.trim()).join('')).toBe("Content 1");
    });

    test.each([
        ['<span></span>', undefined, false],
        ['<span></span>', 'span', true],
        ['<span></span>', 'span.d-print-none', false],
        ['<span class="d-print-none"></span>', ['span.d-print-none'], true],
        ['<span class="d-print-none"></span>', ['span.d-print-none', 'i.fa'], false],
        ['<span role="presentation" class="d-print-none"><i class="fa fa-check"></i></span>', ['span.d-print-none', 'i.fa'], true],
    ])
    ('Element %s matches the selectors %s yields %s', (elemHtml, selectors, result) => {
        const div = document.createElement("DIV");
        div.innerHTML = elemHtml;
        const firstChild = div.firstChild;
        expect(firstChild).toBeTruthy();
        // @ts-ignore
        expect(domSrv.matchesSelectors(firstChild, selectors)).toStrictEqual(result);
    });

    test.each([
        ['d1', 'widget1', 'd1'],
        ['d2', 'widget2', 'd2'],
        ['d3', 'widget2', 'd2'],
        ['d4', 'widget2', 'd2'],
        ['d5', 'widget2', 'd2'],
        ['d6', 'widget2', 'd2'],
        ['d7', 'widget1', 'd1'],
        ['d8', 'widget1', 'd1'],
        ['d9', 'widget1', 'd1'],
        ['d10', undefined, undefined],
        ['d11', '!OL', 'd11'],
        ['d12', '!OL', 'd11'],
        ['d13', undefined, undefined],
        ['d14', '!IMG', 'd14'],
    ])
    ('findWidgetOnEventPath clicked at %s finds widget key=%s at element %s', (idClicked, keyFound, idFound) => {
        document.body.innerHTML = `
            <div id="d1" class="iedib-capsa-exemple">
               <ul id="d2" role="snptd_image">
                 <li id="d3">
                    <img id="d4">
                 </li>
                 <li id="d5"> <span id="d6"></span> </li>
               </ul>

               <ol id="d7">
                <li id="d8"> item1 </li>
               </ol>

               <p id="d9">Text</p>
            </div>
            <p id="d10"> External text </p>
            <ol id="d11">
                <li id="d12"> item1 </li>
            </ol>
            <div id="d13">
              <img id="d14">
            </div>
        `;
        /** @type {any} */
        const rawWidget1 = {
            key: 'widget1',
            selectors: 'div.iedib-capsa-exemple'
        };
        /** @type {any} */
        const rawWidget2 = {
            key: 'widget2',
            selectors: 'ul[role="snptd_image"]'
        }
        /** @type {import('../../src/options').Widget[]} */
        const widgetList = [rawWidget1, rawWidget2];
        const selectedElement = document.body.querySelector('#'+idClicked);
        expect(selectedElement?.id).toBe(idClicked);
        // @ts-ignore
        const pathResult = domSrv.findWidgetOnEventPath(widgetList, selectedElement);
        expect(pathResult.selectedElement).toBe(selectedElement);
        expect(pathResult.widget?.key).toBe(keyFound)
        if (!keyFound?.startsWith("!")) {
            expect(pathResult.targetElement).toBeUndefined();
            expect(pathResult.elem?.id).toBe(idFound);
        } else {
            expect(pathResult.elem).toBeUndefined();
            expect(pathResult.targetElement?.id).toBe(idFound);
        }
    })
});