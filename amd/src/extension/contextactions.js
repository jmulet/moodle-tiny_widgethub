import {addRequires, cleanUnusedRequires} from './dependencies';
import jQuery from 'jquery';

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @param {string} type
 * @returns {() => void}
 */
export function addImageEffectAction(ctx, type) {
    return () => {
        const elem = ctx.path?.elem;
        if (!elem) {
            return;
        }
        elem.attr("data-snptd", type);
        addRequires(ctx.editor, ["/sd/images.min.js"]);
    };
}

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @returns {() => void}
 */
export function removeImageEffectsAction(ctx) {
    return () => {
        const elem = ctx.path?.elem;
        if (!elem) {
            return;
        }
        elem.removeAttr("data-snptd");
        cleanUnusedRequires(ctx.editor);
    };
}

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @param {string} iso
 * @returns {() => void} The action to execute
 */
export function changeBoxLangAction(ctx, iso) {
    return () => {
        const elem = ctx.path?.elem;
        const widget = ctx.path?.widget;
        if (!elem || !widget) {
            return;
        }
        const $lateral = elem.find('.iedib-titolLateral');
        let snippetKey = widget.key;
        const isTascaExercici = elem.attr('data-proposat') === 'true';
        let theType;
        ["alerta", "ampliacio", "consell", "important", "introduccio"].forEach((ty) => {
            if (elem.hasClass("iedib-" + ty + "-border")) {
                theType = ty;
            }
        });
        if (isTascaExercici) {
            snippetKey = 'tasca-exercici';
        }
        const I18n = widget.I18n;
        let langKey = snippetKey === "capsa-generica" ? "msg_" + theType : "msg";
        if (isTascaExercici) {
            langKey = 'msg_epr';
        }
        if (I18n?.[langKey]?.[iso]) {
            if (isTascaExercici) {
                const h4 = elem.find('.iedib-central h4').first();
                h4.html(I18n[langKey][iso]);
            } else {
                $lateral.html(I18n[langKey][iso]);
                $lateral.append('<span class="iedib-' + theType + '-logo"></span>');
            }
        }
        // Replace data-lang
        elem.attr('data-lang', iso);
    };
}

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @param {string} size
 * @returns {() => void} The action to execute
 */
export function changeBoxSizeAction(ctx, size) {
    return () => {
        const elem = ctx.path?.elem;
        const widget = ctx.path?.widget;
        if (!elem || !widget) {
            return;
        }
        elem.removeClass("iedib-capsa-petita iedib-capsa-mitjana iedib-capsa-gran");
        elem.addClass("iedib-capsa-" + size);
    };
}

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @param {string} severity
 * @returns {() => void} The action to execute
 */
export function changeBoxSeverityAction(ctx, severity) {
    return () => {
        const elem = ctx.path?.elem;
        const widget = ctx.path?.widget;
        if (!elem || !widget) {
            return;
        }
        elem.removeClass(
            "iedib-alerta-border iedib-important-border iedib-consell-border iedib-introduccio-border iedib-ampliacio-border");
        elem.addClass("iedib-" + severity + "-border");
        const $lateral = elem.find(".iedib-lateral");
        $lateral.removeClass("iedib-alerta iedib-important iedib-consell iedib-introduccio iedib-ampliacio");
        $lateral.addClass("iedib-" + severity);
        const lang = elem.attr("data-lang") || "ca";
        let langKey = "msg_" + severity;
        // Change the lateral title
        if (widget.I18n?.[langKey]?.[lang]) {
            $lateral.find('.iedib-titolLateral')
                .html(widget.I18n[langKey][lang]);
        }
    };
}

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @returns {() => void} The action to execute
 */
export function switchBoxSimpleExampleAction(ctx) {
    return () => {
        const $target = ctx.path?.elem;
        const widget = ctx.path?.widget;
        if (!$target || !widget) {
            return;
        }
        const lang = $target.attr("data-lang") || "ca";
        const solLabel = widget.I18n?.sol?.[lang] ?? 'Solució';
        const formulacio = $target.find("div.iedib-formulacio-rows > *").clone();
        const resolucio = $target.find("div.iedib-resolucio-rows >  *").clone();
        const lateral = $target.find("p.iedib-titolLateral").html();
        const newSnpt = jQuery('<div class="iedib-capsa iedib-capsa-gran iedib-exemple-border" data-lang="' + lang + '">' +
            '<div class="iedib-lateral iedib-exemple">' +
            '<p class="iedib-titolLateral">' + lateral + '</span></p>' +
            '</div>' +
            '<div class="iedib-central">' +
            // Formulacio
            // Resolució
            '<br></div></div>');
        const central = newSnpt.find('div.iedib-central');
        central.append(formulacio);
        if (resolucio.find('div.accordion').length === 0) {
            central.append("<p><b>" + solLabel + "</b>:</p>");
        }
        central.append(resolucio);
        $target.replaceWith(newSnpt);
    };
}

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @returns {() => void} The action to execute
 */
export function switchBoxRowsExampleAction(ctx) {
    return () => {
        const $target = ctx.path?.elem;
        if (!$target) {
            return;
        }
        const lang = $target.attr("data-lang") || "ca";
        const lateral = $target.find("p.iedib-titolLateral").html();
        const formulacio = $target.find("div.span4.iedib-formulacio > *");
        const resolucio = $target.find("div.span8.iedib-resolucio > div.iedib-central > *");
        const newSnpt = jQuery('<div class="iedib-capsa iedib-capsa-gran iedib-exemple-border" data-lang="' + lang + '">' +
            '<div class="iedib-lateral iedib-exemple">' +
            '<p class="iedib-titolLateral">' + lateral + '</p>' +
            '</div>' +
            '<div class="iedib-formulacio-rows">' +
            // Add formulació
            '</div>' +
            '<div class="iedib-resolucio-rows">' +
            // Add resolució
            '</div></div>');

        newSnpt.find('div.iedib-formulacio-rows').append(formulacio);
        newSnpt.find('div.iedib-resolucio-rows').append(resolucio);
        $target.replaceWith(newSnpt);
    };
}

/**
 * @param {import("../contextInit").ItemMenuContext} ctx
 * @returns {() => void} The action to execute
 */
export function imageSwitchToSnippetAction(ctx) {
    return () => {
        const $target = ctx.path?.elem;
        if (!$target) {
            return;
        }
        const $snpt = jQuery('<div class="iedib-figura iedib-grid-responsive"></div');
        $snpt.append($target.clone());
        // eslint-disable-next-line max-len
        $snpt.append(jQuery('<p class="iedib-img-footer"><span class="iedib-caption-counter">Imatge:</span> <span class="iedib-caption-title">Descripció</span></p>'));
        $target.replaceWith($snpt);
    };
}

