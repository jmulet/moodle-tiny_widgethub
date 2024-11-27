/* eslint-disable no-console */
import {subscribe} from "../extension";
import {getGlobalConfig} from "../options";
import {addBaseToUrl, evalInContext} from "../util";

/**
/**
 * Adds the required scripts defined in the list
 * @param {import("../plugin").TinyMCE} editor
 * @param {string[] | undefined} requireList
 * @returns {number}
 */
export function addRequires(editor, requireList) {
    const imgBaseUrl = getGlobalConfig(editor, 'imgBaseUrl', 'https://iedib.net/assets');

    let dependenciesUpdated = 0;
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
            const depen = addBaseToUrl(imgBaseUrl, scriptUrl);
            const scriptNode = editor.dom.create("script", {src: depen});
            scriptNode.setAttribute("type", "mce-no/type");
            scriptNode.setAttribute("data-mce-src", depen);
            sdArea.append(scriptNode);
            dependenciesUpdated++;
        });
    }
    return dependenciesUpdated;
}

/**
 * Removes those scripts that are not longer required
 * @param {import("../plugin").TinyMCE} editor
 * @returns {number}
 */
export function cleanUnusedRequires(editor) {
    const tiny = editor.getBody();
    const sdArea = tiny.querySelector("div.iedib-sd-area");
    if (!sdArea) {
       return 0;
    }
    // All scripts in sdArea
    /** @type {NodeListOf<HTMLScriptElement>} */
    const allScripts = sdArea.querySelectorAll("script");
    let changes = 0;
    allScripts.forEach((scriptElem) => {
        const src = (scriptElem.src || '').trim();
        let found = null;
        if (src.endsWith('sd/zoom.min.js') || src.endsWith('sd/lightbox.min.js')) {
            // No longer supported; always remove them
            scriptElem.remove();
            changes++;
        } else if (src.endsWith('sd/images.min.js')) {
            // Elements that require images.min.js
            found =
            tiny.querySelectorAll('[role="snptd_zoom"],[data-snptd="zoom"],[role="snptd_lightbox"],[data-snptd="lightbox"]');
            if (!found.length) {
                scriptElem.remove();
                changes++;
            }
        } else if (src.endsWith('sd/presentacio.min.js')) {
            // Elements that require presentacio.min.js
            found = tiny.querySelectorAll('[role="snptd_presentacio"],[data-snptd="presentacio"]');
            if (!found.length) {
                scriptElem.remove();
                changes++;
            }
        } else if (src.endsWith('sd/speak.min.js')) {
            // Elements that require presentacio.min.js
            found = tiny.querySelectorAll('a[href^="#speak_"]');
            if (!found.length) {
                scriptElem.remove();
                changes++;
            }
        } else if (src.endsWith('sd/talea.min.js')) {
            // Elements that require talea.min.js
            found = tiny.querySelectorAll('[role="snptd_talea"],[data-snptd="talea"]');
            if (!found.length) {
                scriptElem.remove();
                changes++;
            }
        } else if (src.endsWith('sd/narracio.min.js')) {
            // Elements that require narracio.min.js
            found = tiny.querySelectorAll('[role="snptd_narracio"],[data-snptd="narracio"]');
            if (!found.length) {
                scriptElem.remove();
                changes++;
            }
        } else if (src.endsWith('sd/quizz.min.js')) {
            // Elements that require quizz.min.js
            found = tiny.querySelectorAll('div[data-quizz-group]');
            if (!found.length) {
                scriptElem.remove();
                changes++;
            }
        } else if (src.endsWith('sd/programacio.min.js')) {
            found = tiny.querySelectorAll('pre.iedib-code');
            if (!found.length) {
                scriptElem.remove();
                changes++;
            }
        }
    });

    // Get rid of sdArea if no scripts are left
    if (!sdArea.querySelectorAll("script").length) {
        sdArea.remove();
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
            requireList.push(parts[0].trim());
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

/**
 * @param {import("../plugin").TinyMCE} editor
 * @param {string} query
 * @param {string} attr
 * @param {boolean} ishash
 * @param {string} prefix
 * @param {(ele: HTMLElement) => void} [changesWorker]
 * @returns {number}
 */
function alphaWalker(editor, query, attr, ishash, prefix, changesWorker) {
    /** @type {NodeListOf<HTMLElement>} */
    const all = editor.getBody().querySelectorAll(query);
    let casos = 0;
    all.forEach((/** @type{HTMLElement} */ ele) => {
        let localChange = 0;
        let old = ele.getAttribute(attr) || "";
        if (ishash) {
            // It starts with # and after that the actual id value
            if (attr === 'href') {
                old = '#' + old.split('#')[1];
            }
            if (RegExp(/^#\d/).exec(old)) {
                old = '#' + prefix + old.substring(1);
                ele.setAttribute(attr, old);
                if (attr === 'href') {
                    ele.dataset.mceHref = old;
                }
                localChange += 1;
            }
        } else if (RegExp(/^\d/).exec(old)) {
                old = prefix + old;
                ele.setAttribute(attr, old);
                if (attr === 'href') {
                    ele.dataset.mceHref = old;
                }
                localChange += 1;
        }
        if (localChange && changesWorker) {
            changesWorker(ele);
        }
        casos += localChange;
    });
    return casos;
}

/**
 * @param {HTMLElement} ele
 */
function changesWorker(ele) {
    const newId = ele.getAttribute("id");
    /** @type {NodeListOf<HTMLElement>} */
    const allAs = ele.querySelectorAll('a.accordion-toggle[data-toggle="collapse"]');
    allAs.forEach((asel) => {
        asel.setAttribute("data-parent", '#' + newId);
    });
}
/**
 *
 * @param {import("../plugin").TinyMCE} editor
 */
export function alphaFixingRefractor(editor) {
    const prefix = 'f_';
    let casos = 0;
    try {
        casos += alphaWalker(editor, '.accordion.iedib-accordion', 'id', false, prefix, changesWorker);
        const casos2 = alphaWalker(editor, 'ul.nav.nav-tabs>li>a', 'href', true, prefix);
        if (casos2 > 0) {
            casos += casos2 + alphaWalker(editor, '.tab-pane.iedib-tabpane', 'id', false, prefix);
        }
    } catch (ex) {
        console.error(ex);
    }
    // Show a message
    if (casos > 0) {
        editor.notificationManager.open({
            text: "S'ha millorat la configuració d'alguns snippets. Desau els canvis de la pàgina.",
            type: 'info'
        });
        editor.setDirty(true);
    }
}

subscribe('contentSet', addRequires);
subscribe('contentSet', alphaFixingRefractor);
subscribe('widgetInserted', widgetInserted);
subscribe('widgetRemoved', cleanUnusedRequires);
subscribe('ctxAction', cleanUnusedRequires);