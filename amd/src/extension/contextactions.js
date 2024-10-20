/* eslint-disable max-len */

import {registerMenuItemProvider} from "../extension";
import {addRequires, cleanUnusedRequires} from "./dependencies";

/**
 * @param {string} str
 * @returns {string}
 */
function prefixPluginName(str) {
    return str.split(/\s+/).map(e => {
        e = e.trim();
        if (e === '|') {
            return e;
        }
        return 'widgethub_' + e;
    }).join(' ');
}

/**
 * @typedef {{name: string, title: string, widgetKey?: string, icon?:string, action?: ()=> void, subMenuItems?: () => string}} UserDefinedItem
 */

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @returns {UserDefinedItem[]}
 **/
function provider(ctx) {
    /**
     * @param {string} type
     * @returns {UserDefinedItem}
     */
    const addImageEffectItem = (type) => {
        return {
            name: `add${type}Effect`,
            title: `Afegir efecte ${type}`,
            action: () => {
                const elem = ctx.path?.elem;
                if (!elem) {
                    return;
                }
                elem.attr("data-snptd", type);
                addRequires(ctx.editor, ["/sd/images.min.js"]);
            }
        };
    };

    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const removeImageEffectsItem = {
        name: 'removeImageEffects',
        title: 'Eliminar efectes d\'imatge',
        icon: 'trash',
        action: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return;
            }
            elem.removeAttr("data-snptd");
            cleanUnusedRequires(ctx.editor);
        }
    };


    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const imageEffectsNestedMenu = {
        name: 'imageEffects',
        widgetKey: 'imatge',
        title: 'Efectes d\'imatge',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            if (!elem.attr('data-snptd')) {
                return prefixPluginName("addZoomEffect addLightboxEffect");
            } else {
                return prefixPluginName("removeImageEffects");
            }
        }
    };


    return [
        addImageEffectItem('zoom'),
        addImageEffectItem('lightbox'),
        removeImageEffectsItem,
        imageEffectsNestedMenu,
    ];
}

registerMenuItemProvider(provider);