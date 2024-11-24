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
 * @typedef {{name: string, title: string, condition?: string | RegExp | (() => boolean), icon?: string, onAction?: ()=> void, subMenuItems?: () => (string | MenuItem[])}} UserDefinedItem
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
     * @type {UserDefinedItem}
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
                    onAction: Action.addImageEffectAction.bind({ctx, type: e.name})
                }));
            } else {
                return [{
                    type: 'menuitem',
                    icon: 'remove',
                    text: 'Treure',
                    onAction: Action.removeImageEffectsAction.bind({ctx})
                }];
            }
        }
    };

    /**
     * @type {UserDefinedItem}
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
        onAction: Action.imageSwitchToSnippetAction.bind({ctx})
    };

    /**
     * @type {UserDefinedItem}
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
                onAction: Action.changeBoxLangAction.bind({ctx, iso})
            }));
        }
    };

    /**
     * @type {UserDefinedItem}
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
                onAction: Action.changeBoxSizeAction.bind({ctx, size: e.v ?? e})
            }));
        }
    };

    /**
     * @type {UserDefinedItem}
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
                onAction: Action.changeBoxSeverityAction.bind({ctx, severity: e.v ?? e})
            }));
        }
    };


    /**
     * @type {UserDefinedItem}
     */
    const twoColumnsNestedMenu = {
        name: 'twoColumnsNestedMenu',
        condition: 'two-cols',
        title: 'Mida columnes',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            /** @type {*} */
            const menuItems = [{
                type: 'menuitem',
                text: "A una columna",
                onAction: Action.changeColumnWidth.bind({ctx, colSpan: 0})
            }];

            const firstSpan =
            (elem.find("div:first-child").attr('class')?.split(' ') ?? [])
            .filter(c => c.startsWith('span')).map(c => c.replace('span', ''))[0];

            for (let i = 2; i < 12; i = i + 2) {
                const tpc = parseInt((100 * i / 12.0).toFixed(0));
                const label = tpc + "% | " + (100 - tpc) + "%";
                let isCurrent = firstSpan && convertInt(firstSpan, 0) == i;
                menuItems.push({
                    type: 'menuitem',
                    text: label,
                    icon: isCurrent ? 'checkmark' : undefined,
                    onAction: Action.changeColumnWidth.bind({ctx, colSpan: i})
                });
            }
            return menuItems;
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const switchBoxRowsExample = {
        name: 'switchBoxRowsExample',
        condition: 'capsa-exemple-cols',
        title: 'Convertir a exemple 2 files',
        onAction: Action.switchBoxRowsExampleAction.bind({ctx})
    };

    /**
     * @type {UserDefinedItem}
     */
    const switchBoxSimpleExample = {
        name: 'switchBoxSimpleExample',
        condition: 'capsa-exemple-rows',
        title: 'Convertir a exemple simple',
        onAction: Action.switchBoxSimpleExampleAction.bind({ctx})
    };

    /**
     * @type {UserDefinedItem}
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
     * @type {UserDefinedItem}
     */
   const accordionIndependentBehaviorNestedMenu = {
        name: 'accordionIndependentBehavior',
        condition: 'desplegable2',
        title: 'Comportament',
        subMenuItems: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return '';
            }
            // Is Accordion behavior?
            const isDependentBehavior =
            ($target.find("div.accordion-body").attr("data-parent") ?? null) !== null;

            return [false, true].map(opt => ({
                type: 'menuitem',
                text: opt ? 'Independents' : 'Dependents',
                icon: isDependentBehavior === opt ? undefined : 'checkmark',
                onAction: Action.setAccordionBehavior.bind({ctx, isDependentBehavior: opt})
            }));
        }
    };


    /**
     * @type {UserDefinedItem}
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
            const startAt1 = ($target.css("max-width") || "-1")
                .replace("px", "").replace("none", "-1");
            // Open input dialog, set the value and retrieve new value
            openInputDialog('Amplada màxima en (px)', '-1=sense limit', startAt1,
            (/** @type {*} */ api) => {
                const $target = ctx.path?.elem;
                if (!$target) {
                    return;
                }
                const maxwidth = convertInt(api.getData().value.replace("px", "").trim(), 0);
                if (maxwidth > 0) {
                    $target.css("max-width", maxwidth + "px");
                } else {
                    $target.css("max-width", "");
                }
                api.close();
            });
        },
    };

    /**
     * @type {UserDefinedItem}
     */
    const convertToBsTableMenu = {
        name: 'convertToBsTableMenu',
        condition: 'taula-bs',
        title: 'Convertir a taula Bootstrap',
        onAction: Action.convert2BootstrapTable.bind({ctx}),
    };

    /**
     * @type {UserDefinedItem}
     */
    const convertToPredefinedTableMenu = {
        name: 'convertToPredefinedTableMenu',
        condition: 'taula-predefinida',
        title: 'Convertir a taula predefinida',
        onAction: Action.convert2PrefefinedTable.bind({ctx}),
    };

     /**
     * @type {UserDefinedItem}
     */
     const responsivenessNestedMenu = {
        name: 'responsivenessNestedMenu',
        condition: 'taula-bs',
        title: 'Responsivitat',
        subMenuItems: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return '';
            }
            // Is responsiveness active
            const isResponsive = $target.parent().hasClass('table-responsible');

            return [{
                type: 'menuitem',
                text: isResponsive ? 'Treure' : 'Afegir',
                onAction: Action.toggleBootstapTableResponsiveness.bind({ctx})
            }];
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const tablesHeaderNestedMenu = {
            name: 'tablesHeaderNestedMenu',
            condition: 'taula-predefinida,taula-bs',
            title: 'Capçalera',
            subMenuItems: () => {
                const $target = ctx.path?.elem;
                if (!$target) {
                    return '';
                }
                const hasHeader = $target.find('thead').length > 0;

                return [{
                    type: 'menuitem',
                    text: hasHeader ? 'Treure' : 'Afegir',
                    onAction: Action.toggleTableHeader.bind({ctx})
                }];
            }
    };

    /**
     * @type {UserDefinedItem}
     */
    const tablesFooterNestedMenu = {
        name: 'tablesFooterNestedMenu',
        condition: 'taula-predefinida,taula-bs',
        title: 'Peu de taula',
        subMenuItems: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return '';
            }
            const hasFooter = $target.find('tfoot').length > 0;

            return [{
                type: 'menuitem',
                text: hasFooter ? 'Treure' : 'Afegir',
                onAction: Action.toggleTableFooter.bind({ctx})
            }];
        }
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
        accordionIndependentBehaviorNestedMenu,
        numberedListNestedMenu,
        twoColumnsNestedMenu,

        // Tables
        tablesMaxWidthMenu,
        convertToBsTableMenu,
        convertToPredefinedTableMenu,
        responsivenessNestedMenu,
        tablesHeaderNestedMenu,
        tablesFooterNestedMenu
    ];
}

registerMenuItemProvider(provider);