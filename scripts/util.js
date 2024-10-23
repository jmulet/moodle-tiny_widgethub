
/**
 * @param {*} obj - The object to expand
 * @param {Record<string, *>} partials - The dictionary with partials
 * @returns {*} The modified object
 */
function expandPartial(obj, partials) {
    if ((obj ?? null) === null) {
        return obj;
    }
    let partialKey;
    if (typeof obj === 'string' && obj.startsWith(`@`)) {
        partialKey = obj;
        obj = {};
    } else if (typeof obj === 'object' && obj.partial) {
        partialKey = obj.partial;
    }
    if (partialKey) {
        if (!partials[partialKey]) {
            console.error(`Cannot find partial for ${partialKey}`);
        } else {
            // Override with passed properties.
            obj = {...partials[partialKey], ...obj};
        }
    }
    return obj;
}

/**
 * Partials are variables that start with @ which
 * can be expanded in different parts of the widget
 * definition.
 * @param {RawWidget} widget
 * @param {Record<string, *>} partials
 * @returns {void} The same widget with partials expanded
 */
function applyPartials(widget, partials) {
    // Expand partials in template.
    const regex = /@([\w\d]+)([\s<'"])/g;
    widget.template = widget.template.replace(regex, (s0, s1) => {
        return partials['@' + s1] ?? s0;
    });

    // Expand partials in parameters.
    const parameters = widget.parameters;
    if (parameters) {
        parameters.forEach((/** @type {*} */ param, i) => {
            param = expandPartial(param, partials);
            parameters[i] = param;
            // Treat inner partials
            param.bind = expandPartial(param.bind, partials);
            param.transform = expandPartial(param.transform, partials);
        });
    }
}

module.exports = {
    applyPartials
};

