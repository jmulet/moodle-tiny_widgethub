/* eslint-disable no-console */
import { evalInContext } from "../../../tests/jsunit/src/util";
import {subscribe} from "../extension";
import {addBaseToUrl} from "../util";

const IMG_BASE_URL = "https://iedib.net/assets";

/**
/**
 * Adds the required scripts defined in the list
 * @param {import("../plugin").TinyMCE} editor
 * @param {string[] | undefined} requireList
 * @returns {boolean}
 */
export function addRequires(editor, requireList) {
    let dependenciesUpdated = false;
    const tiny = editor.getBody();
    let sdArea = tiny.querySelector("div.iedib-sd-area");

    // If no requireList is passed, then analyze the page and add requires that must be there!
    if (!requireList) {
        requireList = [];
        let found = tiny
            .querySelector('[role="snptd_zoom"],[data-snptd="zoom"],[role="snptd_lightbox"],[data-snptd="lightbox"]');
        if (found) {
            requireList.push("sd/images.min.js");
        }
        // Elements that require presentacio.min.js
        found = tiny.querySelector('[role="snptd_presentacio"],[data-snptd="presentacio"]');
        if (found) {
            requireList.push("sd/presentacio.min.js");
        }
        // Elements that require presentacio.min.js
        found = tiny.querySelector('a[href^="#speak_"]');
        if (found) {
            requireList.push("sd/speak.min.js");
        }
        // Elements that require talea.min.js
        found = tiny.querySelector('[role="snptd_talea"],[data-snptd="talea"]');
        if (found) {
            requireList.push("sd/talea.min.js");
        }
        // Elements that require narracio.min.js
        found = tiny.querySelector('[role="snptd_narracio"],[data-snptd="narracio"]');
        if (found) {
            requireList.push("sd/narracio.min.js");
        }
        // Elements that require quizz.min.js
        found = tiny.querySelector('div[data-quizz-group]');
        if (found) {
            requireList.push("sd/quizz.min.js");
        }
        // Elements that require programacio.min.js
        found = tiny.querySelector('pre.iedib-code');
        if (found) {
             requireList.push("sd/programacio.min.js");
        }
    }

    // Clear unused requires first
    cleanUnusedRequires(editor);
    sdArea = tiny.querySelector("div.iedib-sd-area");

    if (!sdArea && requireList.length > 0) {
        const spacer = editor.dom.create('p', {}, '<br>');
        sdArea = editor.dom.create('div', {"class": 'iedib-sd-area'});
        tiny.append(spacer);
        tiny.append(sdArea);
    }

    // Check the existence of script area
    const scriptsToInsert = requireList.filter((requireScript) => {
        // S'ha de mirar dins la pàgina si ja té la dependència inclosa
        if (!requireScript.endsWith(".js")) {
            return false;
        }
        const found = sdArea?.querySelector('script[src$="' + requireScript + '"]') !== null;
        return !found;
    });

    if (sdArea && scriptsToInsert.length > 0) {
        // Insert the scripts in the area
        scriptsToInsert.forEach(scriptUrl => {
            const depen = addBaseToUrl(IMG_BASE_URL, scriptUrl);
            const scriptNode = editor.dom.create("script", {src: depen});
            scriptNode.setAttribute("type", "mce-no/type");
            scriptNode.setAttribute("data-mce-src", depen);
            sdArea.append(scriptNode);
        });
        dependenciesUpdated = true;
    }
    return dependenciesUpdated;
}

/**
 * Removes those scripts that are not longer required
 * @param {import("../plugin").TinyMCE} editor
 */
export function cleanUnusedRequires(editor) {
    console.log("Removing unused requires...");
    const tiny = editor.getBody();
    const sdArea = tiny.querySelector("div.iedib-sd-area");
    if (!sdArea) {
        console.log("No sdArea found");
        return;
    }
    // All scripts in sdArea
    /** @type {HTMLScriptElement[]} */
    const allScripts = sdArea.querySelectorAll("script");
    allScripts.forEach((scriptElem) => {
        const src = (scriptElem.src || '').trim();
        let found = null;
        if (src.endsWith('sd/zoom.min.js') || src.endsWith('sd/lightbox.min.js')) {
            // No longer supported; always remove them
            scriptElem.remove();
        } else if (src.endsWith('sd/images.min.js')) {
            // Elements that require images.min.js
            found =
            tiny.querySelectorAll('[role="snptd_zoom"],[data-snptd="zoom"],[role="snptd_lightbox"],[data-snptd="lightbox"]');
            if (!found.length) {
                scriptElem.remove();
            }
        } else if (src.endsWith('sd/presentacio.min.js')) {
            // Elements that require presentacio.min.js
            found = tiny.querySelectorAll('[role="snptd_presentacio"],[data-snptd="presentacio"]');
            if (!found.length) {
                scriptElem.remove();
            }
        } else if (src.endsWith('sd/speak.min.js')) {
            // Elements that require presentacio.min.js
            found = tiny.querySelectorAll('a[href^="#speak_"]');
            if (!found.length) {
                scriptElem.remove();
            }
        } else if (src.endsWith('sd/talea.min.js')) {
            // Elements that require talea.min.js
            found = tiny.querySelectorAll('[role="snptd_talea"],[data-snptd="talea"]');
            if (!found.length) {
                scriptElem.remove();
            }
        } else if (src.endsWith('sd/narracio.min.js')) {
            // Elements that require narracio.min.js
            found = tiny.querySelectorAll('[role="snptd_narracio"],[data-snptd="narracio"]');
            if (!found.length) {
                scriptElem.remove();
            }
        } else if (src.endsWith('sd/quizz.min.js')) {
            // Elements that require quizz.min.js
            found = tiny.querySelectorAll('div[data-quizz-group]');
            if (!found.length) {
                scriptElem.remove();
            }
        } else if (src.endsWith('sd/programacio.min.js')) {
            found = tiny.querySelectorAll('pre.iedib-code');
            if (!found.length) {
                scriptElem.remove();
            }
        }
    });

    // Get rid of sdArea if no scripts are left
    if (!sdArea.querySelectorAll("script").length) {
        sdArea.remove();
    }
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
            requireList.push(parts[0].trim());
         }
      }
      if (requireList.length > 0) {
          // Now handle the filtered list of requires
          addRequires(editor, requireList);
      } else {
          // Always try to remove unused requires
          cleanUnusedRequires(editor);
      }
}

subscribe('contentSet', addRequires);
subscribe('widgetInserted', widgetInserted);
subscribe('widgetRemoved', cleanUnusedRequires);
subscribe('ctxAction', cleanUnusedRequires);
