/* eslint-disable no-console */
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
    if (typeof obj === 'string' && obj.startsWith('__') && obj.endsWith('__')) {
        partialKey = obj;
        obj = {};
    } else if (typeof obj === 'object' && obj.partial) {
        partialKey = obj.partial;
        delete obj.partial;
    }
    if (partialKey) {
        partialKey = partialKey.replace(/__/g, '');
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
 * @param {{template: string, parameters: *[]}} widget
 * @param {Record<string, *>} partials
 * @returns {void} The same widget with partials expanded
 */
function applyPartials(widget, partials) {
    // Expand partials in template.
    const regex = /__([\w\d]+)__/g;
    widget.template = widget.template.replace(regex, (s0, s1) => {
        return partials[s1] ?? s0;
    });

    // Expand partials in parameters.
    const parameters = widget.parameters;
    if (parameters) {
        parameters.forEach((/** @type {*} */ param, i) => {
            param = expandPartial(param, partials);
            parameters[i] = param;
            // Treat inner partials
            let prop = expandPartial(param.bind, partials);
            if (prop) {
                param.bind = prop;
            }
            prop = expandPartial(param.transform, partials);
            if (prop) {
                param.transform = prop;
            }
        });
    }
}

module.exports = {
    applyPartials
};

