/* eslint-disable no-console */
/* eslint-disable max-len */
import {registerMenuItemProvider} from "../extension";
import {convertInt, findVariableByName} from "../util";
import * as Action from './contextactions';

const SUPPORTED_LANGS = [
    {iso: 'ca', title: 'Català'},
    {iso: 'es', title: 'Castellà'},
    {iso: 'en', title: 'English'},
    {iso: 'fr', title: 'Francès'},
    {iso: 'de', title: 'Alemany'},
];

const AVAILABLE_EFFECTS = [
    {name: 'zoom', title: 'Zoom'},
    {name: 'lightbox', title: 'Pantalla completa'},
];

const SUPPORTED_SIZES = [
    {v: 'gran', l: 'Gran'},
    {v: 'mitjana', l: 'Mitjana'},
    {v: 'petita', l: 'Petita'},
];

/**
 * @typedef {{type: string, text: string, icon?: string, onAction: (api?: *) => void}} MenuItem
 * @typedef {{name: string, title: string, condition?: string | RegExp | (() => boolean), icon?:string, onAction?: ()=> void, subMenuItems?: () => string | MenuItem[]}} UserDefinedItem
 */

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @returns {UserDefinedItem[]}
 **/
function provider(ctx) {
    /**
     * @param {string} title
     * @param {string} label
     * @param {*} initialValue
     * @param {(api: *) => void} onSubmit
     */
    const openInputDialog = function(title, label, initialValue, onSubmit) {
        ctx.editor?.windowManager.open({
            title,
            body: {
              type: 'panel',
              items: [
                {
                  type: 'input',
                  name: 'value',
                  label: label
                }
              ]
            },
            buttons: [
              {
                type: 'submit',
                text: 'Acceptar'
              }
            ],
            initialData: {
                value: initialValue
            },
            onSubmit
        });
    };

    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const imageEffectsNestedMenu = {
        name: 'imageEffects',
        condition: 'imatge',
        title: 'Efectes d\'imatge',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            if (!elem.attr('data-snptd')) {
                return AVAILABLE_EFFECTS.map(e => ({
                    type: 'menuitem',
                    text: e.title,
                    onAction: Action.addImageEffectAction(ctx, e.name)
                }));
            } else {
                return [{
                    type: 'menuitem',
                    icon: 'remove',
                    text: 'Treure',
                    onAction: Action.removeImageEffectsAction(ctx)
                }];
            }
        }
    };

    /**
     * Converts a raw image into a snippet
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const imageSwitchToSnippet = {
        name: 'imageSwitchToSnippet',
        condition: () => {
           // We are not inside a widget image and the
           // selectedElement right clicked must be a tag img
           const key = ctx.path?.widget?.key;
           const elem = ctx.path?.selectedElement;
           const isImg = (key !== undefined && key !== 'imatge' && key !== 'grid-imatge' &&
            elem?.prop('tagName') === 'IMG');
           if (ctx.path && isImg && elem?.[0]) {
                ctx.path.targetElement = elem;
           }
           return isImg;
        },
        title: 'Convertir a snippet imatge',
        onAction: Action.imageSwitchToSnippetAction(ctx)
    };

    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
     const changeBoxLanguageNestedMenu = {
        name: 'changeBoxLanguage',
        condition: /capsa-.*|tasca-exercici/,
        title: 'Idioma',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            const currentLang = elem.attr('data-lang') ?? '';
            return SUPPORTED_LANGS.map(({iso, title}) => ({
                type: 'menuitem',
                text: title,
                icon: iso === currentLang ? 'checkmark' : undefined,
                onAction: Action.changeBoxLangAction(ctx, iso)
            }));
        }
    };

     /**
      * @param {import("../contextInit").ItemMenuContext} ctx
      * @returns {UserDefinedItem}
      */
     const changeBoxSizeNestedMenu = {
        name: 'changeBoxSize',
        condition: /^capsa-.*|^tasca-exercici$/,
        title: 'Mida',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            const sizes = findVariableByName('mida', widget.parameters)?.options;
            return (sizes || SUPPORTED_SIZES).map((/** @type {*}*/ e) => ({
                type: 'menuitem',
                text: e.l ?? e,
                icon: elem.hasClass('iedib-capsa-' + (e.v ?? e)) ? 'checkmark' : undefined,
                onAction: Action.changeBoxSizeAction(ctx, e.v ?? e)
            }));
        }
    };

      /**
       * @param {import("../contextInit").ItemMenuContext} ctx
       * @returns {UserDefinedItem}
       */
      const changeBoxSeverityNestedMenu = {
        name: 'changeBoxSeverity',
        condition: 'capsa-generica',
        title: 'Tipus',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            const severities = findVariableByName('tipus', widget.parameters)?.options;
            return (severities || []).map((/** @type {*}*/ e) => ({
                type: 'menuitem',
                text: e.l ?? e,
                icon: elem.hasClass('iedib-' + (e.v ?? e) + '-border') ? 'checkmark' : undefined,
                onAction: Action.changeBoxSeverityAction(ctx, e.v ?? e)
            }));
        }
    };

      /**
       * @param {import("../contextInit").ItemMenuContext} ctx
       * @returns {UserDefinedItem}
       */
      const switchBoxRowsExample = {
        name: 'switchBoxRowsExample',
        condition: 'capsa-exemple-cols',
        title: 'Convertir a exemple 2 files',
        onAction: Action.switchBoxRowsExampleAction(ctx)
    };

     /**
      * @param {import("../contextInit").ItemMenuContext} ctx
      * @returns {UserDefinedItem}
      */
     const switchBoxSimpleExample = {
        name: 'switchBoxSimpleExample',
        condition: 'capsa-exemple-rows',
        title: 'Convertir a exemple simple',
        onAction: Action.switchBoxSimpleExampleAction(ctx)
    };

    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const numberedListNestedMenu = {
        name: 'numberedListNestedMenu',
        condition: () => {
            const selectedElement = ctx.path?.selectedElement;
            // It must search an OL in the path, probably selectedElement is LI or so!!!!!
            const target = selectedElement?.closest("ol");
            if (ctx.path && target?.[0]) {
                ctx.path.targetElement = target;
            }
            return target?.[0] !== undefined;
        },
        icon: 'list-num-default',
        title: 'Llista',
        subMenuItems: () => {
            // Determine if the class is there
            const isBeauty = ctx.path?.targetElement?.hasClass('iedib-falist');
            return [
                {
                    type: 'menuitem',
                    text: 'Embellit',
                    icon: isBeauty ? 'checkmark' : undefined,
                    onAction: () => {
                        console.log("beauty action");
                        // Toggle class
                        const $target = ctx.path?.targetElement;
                        if (!$target) {
                            return;
                        }
                        $target.toggleClass('iedib-falist');
                        // Make sure that start and style are in sync
                        const startAt = $target.attr("start") || "1";
                        if ($target.hasClass('iedib-falist')) {
                            const beginAt = parseInt(startAt);
                            $target.css("counter-reset", "iedibfalist-counter " + (beginAt - 1));
                        } else {
                            $target.css("counter-reset", "");
                        }
                    }
                },
                {
                    type: 'menuitem',
                    text: 'Comença a',
                    onAction: () => {
                        console.log("start at");
                        // Get the start property of the list
                        const startAt1 = ctx.path?.targetElement?.attr("start") ?? "1";
                        // Open input dialog, set the value and retrieve new value
                        openInputDialog('Comença la numeració a ...', '', startAt1,
                        (/** @type {*} */ api) => {
                            api.close();
                            const $target = ctx.path?.targetElement;
                            if (!$target) {
                                return;
                            }
                            // Change the number at which start
                            const startAt2 = api.getData().value ?? "1";
                            const beginAt3 = convertInt(startAt2, 1);
                            $target.attr("start", beginAt3);
                            $target.css("counter-reset", "iedibfalist-counter " + (beginAt3 - 1));
                        });
                    },
                }
            ];
        }
    };

    /**
     * @param {import("../contextInit").ItemMenuContext} ctx
     * @returns {UserDefinedItem}
     */
    const tablesMaxWidthMenu = {
        name: 'tablesMaxWidthMenu',
        condition: 'taula-predefinida,taula-bs',
        title: 'Amplada taula',
        onAction: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return;
            }
            // Get the initial width
            const startAt1 = ($target.css("max-width") || "-1").replace("px", "");
            // Open input dialog, set the value and retrieve new value
            openInputDialog('Amplada màxima en (px)', '-1=sense limit', startAt1,
            (/** @type {*} */ api) => {
                const $target = ctx.path?.elem;
                if (!$target) {
                    return;
                }
                const maxwidth = convertInt(api.getData().value, 0);
                if (maxwidth > 0) {
                    $target.css("max-width", maxwidth + "px");
                } else {
                    $target.css("max-width", "");
                }
                api.close();
            });
        },
    };

    return [
        // Image actions
        imageEffectsNestedMenu,
        imageSwitchToSnippet,

        // Box actions
        changeBoxLanguageNestedMenu,
        changeBoxSizeNestedMenu,
        changeBoxSeverityNestedMenu,
        switchBoxRowsExample,
        switchBoxSimpleExample,

        // Others
        numberedListNestedMenu,
        tablesMaxWidthMenu,
    ];
}

registerMenuItemProvider(provider);