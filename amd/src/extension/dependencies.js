/* eslint-disable no-console */
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getGlobalConfig} from "../options";
import {subscribe} from "../extension";
import {getWidgetDict} from "../options";
import {evalInContext, addBaseToUrl} from "../util";
import Common from '../common';
const {component} = Common;
const JSAREACLASSNAME = `${component}-jsarea`;
/**
/**
 * Adds the required scripts defined in the list
 * @param {import("../plugin").TinyMCE} editor
 * @param {string[] | undefined} requireList
 * @returns {number}
 */
export function addRequires(editor, requireList) {
    const jsBaseUrl = getGlobalConfig(editor, 'jsBaseUrl', '');
    let dependenciesUpdated = 0;
    try {
    const jsareaSelector = `div.${JSAREACLASSNAME}`;
    const affectedWidgets = Object.values(getWidgetDict(editor)).filter(w => w.selectors && w.prop('requires'));

    const tiny = editor.getBody();
    let jsArea = tiny.querySelector(jsareaSelector);

    // If no requireList is passed, then analyze the page and add requires that must be there!
    if (!requireList) {
        requireList = [];
        affectedWidgets.forEach(w => {
            if (anyMatchesSelectors(tiny, w.selectors || [])) {
                requireList?.push(w.prop('requires')?.trim());
            }
        });
    }

    // Clear unused requires first
    cleanUnusedRequires(editor, affectedWidgets);
    jsArea = tiny.querySelector(jsareaSelector);

    // Check the existence of script area
    if (!jsArea && requireList.length > 0) {
        const spacer = editor.dom.create('p', {}, '<br>');
        jsArea = editor.dom.create('div', {"class": JSAREACLASSNAME});
        tiny.append(spacer);
        tiny.append(jsArea);
    }

    // Check which scripts must be created
    const scriptsToInsert = requireList.filter((scriptUrl) => {
        if (!scriptUrl.endsWith(".js")) {
            return false;
        }
        const realSrc = addBaseToUrl(jsBaseUrl, scriptUrl);
        return jsArea?.querySelector(`script[src="${realSrc}"]`) === null;
    });

    if (jsArea && scriptsToInsert.length > 0) {
        // Insert the scripts in the area
        scriptsToInsert.forEach(scriptUrl => {
            const realSrc = addBaseToUrl(jsBaseUrl, scriptUrl);
            const scriptNode = editor.dom.create("script",
                {src: realSrc, type: "mce-no/type", "data-mce-src": realSrc});
            jsArea.append(scriptNode);
            dependenciesUpdated++;
        });
    }
    } catch (ex) {
        console.error("A problem occurred adding dependencies:", ex);
    }
    return dependenciesUpdated;
}

/**
 * Removes those scripts that are not longer required
 * @param {HTMLElement} tiny
 * @param {string | string[]} selectors
 * @returns {boolean}
 */
function anyMatchesSelectors(tiny, selectors) {
    if (typeof (selectors) === 'string') {
        selectors = [selectors];
    }
    let anyFound = false;
    try {
        anyFound = [...tiny.querySelectorAll(selectors[0] ?? '')].some(e => {
            if (selectors.length === 1) {
                return true;
            }
            // Matches all other conditions
            let match = true;
            for (let i = 1; i < selectors.length; i++) {
                match = match && e.querySelector(selectors[i]) !== null;
                if (!match) {
                    break;
                }
            }
            return match;
        });
    } catch (ex) {
        console.error("Error in anyMatchesSelectors:", ex);
    }
    return anyFound;
}

/**
 * Removes those scripts that are not longer required
 * @param {import("../plugin").TinyMCE} editor
 * @param {import("../options").Widget[]} [affectedWidgets]
 * @returns {number}
 */
export function cleanUnusedRequires(editor, affectedWidgets) {
    let changes = 0;
    try {
    const tiny = editor.getBody();
    const jsArea = tiny.querySelector(`div.${JSAREACLASSNAME}`);
    if (!jsArea) {
       return 0;
    }

    if (!affectedWidgets) {
        affectedWidgets = Object.values(getWidgetDict(editor)).filter(w => w.selectors && w.prop('requires'));
    }
    const jsBaseUrl = getGlobalConfig(editor, 'jsBaseUrl', '');
    // All scripts in jsArea
    /** @type {NodeListOf<HTMLScriptElement>} */
    const allScripts = jsArea.querySelectorAll("script");
    allScripts.forEach((scriptElem) => {
        const src = (scriptElem.src || '')?.trim();
        if (!src) {
            scriptElem.remove();
            changes++;
            return;
        }

        // Match the widget with this src
        // @ts-ignore
        const widgetFound = affectedWidgets.filter(w => {
            const realSrc = addBaseToUrl(jsBaseUrl, w.prop('requires')?.trim() || '');
            return realSrc === src;
        })[0];
        if (!widgetFound) {
            scriptElem.remove();
            changes++;
            return;
        }
        const anyInstancesFound = anyMatchesSelectors(tiny, widgetFound.selectors ?? []);
        if (!anyInstancesFound) {
             // Script no longer needed
            scriptElem.remove();
            changes++;
        }
    });
    // Get rid of jsArea if no scripts are left
    if (!jsArea.querySelectorAll("script").length) {
        jsArea.remove();
        changes++;
    }
    } catch (ex) {
        console.error("Error while removing unused dependencies:", ex);
    }
    return changes;
}
/**
 * @param {import("../plugin").TinyMCE} editor
 * @param {import("../options").Widget} widget
 * @param {Record<string, any>} ctxFromDialogue
 */
function widgetInserted(editor, widget, ctxFromDialogue) {
    try {
      // Determine if should add any requires
      const requireList = [];
      // Treat the case of requires being an object (keys are the conditions to be met)
      if (widget.prop('requires')) {
         const parts = widget.prop('requires').split("|");
         let conditionFullfilled = true;
            if (parts.length > 1) {
               conditionFullfilled = evalInContext(ctxFromDialogue, parts[1]);
            }
         if (conditionFullfilled) {
            requireList.push(parts[0]?.trim());
         }
      }
      let changes = 0;
      if (requireList.length > 0) {
          // Now handle the filtered list of requires
          changes += addRequires(editor, requireList);
      } else {
          // Always try to remove unused requires
          changes += cleanUnusedRequires(editor);
      }
      if (changes > 0) {
        editor.setDirty(true);
      }
    } catch (ex) {
        console.error("An error occurre when treating dependencies of inserted widget:", ex);
    }
}

subscribe('contentSet', addRequires);
subscribe('widgetInserted', widgetInserted);
subscribe('widgetRemoved', cleanUnusedRequires);
subscribe('ctxAction', cleanUnusedRequires);
