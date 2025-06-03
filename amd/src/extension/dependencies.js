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
import {subscribe} from "../extension";
import {getWidgetDict} from "../options";
import {evalInContext} from "../util";

const JSAREACLASSNAME = 'tiny_widgethub-jsarea';
/**
/**
 * Adds the required scripts defined in the list
 * @param {import("../plugin").TinyMCE} editor
 * @param {string[] | undefined} requireList
 * @returns {number}
 */
export function addRequires(editor, requireList) {
    const jsareaSelector = `div.${JSAREACLASSNAME}`;
    const affectedWidgets = Object.values(getWidgetDict(editor)).filter(w => w.selectors && w.prop('requires'));

    let dependenciesUpdated = 0;
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

    if (!jsArea && requireList.length > 0) {
        const spacer = editor.dom.create('p', {}, '<br>');
        jsArea = editor.dom.create('div', {"class": JSAREACLASSNAME});
        tiny.append(spacer);
        tiny.append(jsArea);
    }

    // Check the existence of script area
    const scriptsToInsert = requireList.filter((requireScript) => {
        if (!requireScript.endsWith(".js")) {
            return false;
        }
        return jsArea?.querySelector(`script[src="${requireScript}"]`) === null;
    });

    if (jsArea && scriptsToInsert.length > 0) {
        // Insert the scripts in the area
        scriptsToInsert.forEach(scriptUrl => {
            const scriptNode = editor.dom.create("script",
                {src: scriptUrl, type: "mce-no/type", "data-mce-src": scriptUrl});
            jsArea.append(scriptNode);
            dependenciesUpdated++;
        });
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
    const anyFound = [...tiny.querySelectorAll(selectors[0] ?? '')].some(e => {
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
    return anyFound;
}

/**
 * Removes those scripts that are not longer required
 * @param {import("../plugin").TinyMCE} editor
 * @param {import("../options").Widget[]} [affectedWidgets]
 * @returns {number}
 */
export function cleanUnusedRequires(editor, affectedWidgets) {
    const tiny = editor.getBody();
    const jsArea = tiny.querySelector(`div.${JSAREACLASSNAME}`);
    if (!jsArea) {
       return 0;
    }

    if (!affectedWidgets) {
        affectedWidgets = Object.values(getWidgetDict(editor)).filter(w => w.selectors && w.prop('requires'));
    }
    // All scripts in jsArea
    /** @type {NodeListOf<HTMLScriptElement>} */
    const allScripts = jsArea.querySelectorAll("script");
    let changes = 0;
    allScripts.forEach((scriptElem) => {
        const src = (scriptElem.src || '')?.trim();

        // Match the widget with this src
        const widgetFound = affectedWidgets.filter(w => w.prop('requires')?.trim() === src)[0];
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
    return changes;
}
/**
 * @param {import("../plugin").TinyMCE} editor
 * @param {import("../options").Widget} widget
 * @param {Record<string, any>} ctxFromDialogue
 */
function widgetInserted(editor, widget, ctxFromDialogue) {
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
}

subscribe('contentSet', addRequires);
subscribe('widgetInserted', widgetInserted);
subscribe('widgetRemoved', cleanUnusedRequires);
subscribe('ctxAction', cleanUnusedRequires);
