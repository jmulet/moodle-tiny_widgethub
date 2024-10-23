import { addRequires, cleanUnusedRequires } from "./dependencies";

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