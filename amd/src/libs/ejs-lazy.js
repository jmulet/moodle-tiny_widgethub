// @ts-nocheck
/* eslint-disable */
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
 * An adaptation of the EJS templating engine as AMD module.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

const utils = {};
(function(mod) {
    'use strict';
    const regExpChars = /[|\\{}()[\]^$+*?.]/g;
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    const hasOwn = function(obj, key) {
 return hasOwnProperty.apply(obj, [key]);
};

    /**
     * Escape characters reserved in regular expressions.
     *
     * If `string` is `undefined` or `null`, the empty string is returned.
     *
     * @param {String} string Input string
     * @return {String} Escaped string
     * @static
     * @private
     */
    mod.escapeRegExpChars = function(string) {
        // istanbul ignore if
        if (!string) {
            return '';
        }
        return String(string).replace(regExpChars, '\\$&');
    };

    const _ENCODE_HTML_RULES = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&#34;',
        "'": '&#39;'
    };
    const _MATCH_HTML = /[&<>'"]/g;

    /**
     *
     * @param {string} c
     * @returns {string} encoded char
     */
    function encode_char(c) {
        return _ENCODE_HTML_RULES[c] || c;
    }

    /**
     * Stringified version of constants used by {@link module:utils.escapeXML}.
     *
     * It is used in the process of generating {@link ClientFunction}s.
     *
     * @readonly
     * @type {String}
     */

    const escapeFuncStr =
        'var _ENCODE_HTML_RULES = {\n'
        + '      "&": "&amp;"\n'
        + '    , "<": "&lt;"\n'
        + '    , ">": "&gt;"\n'
        + '    , \'"\': "&#34;"\n'
        + '    , "\'": "&#39;"\n'
        + '    }\n'
        + '  , _MATCH_HTML = /[&<>\'"]/g;\n'
        + 'function encode_char(c) {\n'
        + '  return _ENCODE_HTML_RULES[c] || c;\n'
        + '};\n';

    /**
     * Escape characters reserved in XML.
     *
     * If `markup` is `undefined` or `null`, the empty string is returned.
     *
     * @param {String} markup Input string
     * @return {String} Escaped string
     * @static
     * @private
     */
    mod.escapeXML = function(markup) {
        return markup == undefined
            ? ''
            : String(markup)
                .replace(_MATCH_HTML, encode_char);
    };

    /**
     * Naive copy of properties from one object to another.
     * Does not recurse into non-scalar properties
     */
    function escapeXMLToString() {
        return Function.prototype.toString.call(this) + ';\n' + escapeFuncStr;
    }

    try {
        if (typeof Object.defineProperty === 'function') {
            // If the Function prototype is frozen, the "toString" property is non-writable.
            // This means that any objects which inherit this property
            // cannot have the property changed using an assignment. If using strict mode,
            // attempting that will cause an error. If not using strict
            // mode, attempting that will be silently ignored.
            // However, we can still explicitly shadow the prototype's "toString" property by
            // defining a new "toString" property on this object.
            Object.defineProperty(mod.escapeXML, 'toString', {value: escapeXMLToString});
        } else {
            // If Object.defineProperty() doesn't exist, attempt to shadow this property using the assignment operator.
            mod.escapeXML.toString = escapeXMLToString;
        }
    } catch (err) {
        console.warn('Unable to set escapeXML.toString (is the Function prototype frozen?)');
    }

    /**
     * Naive copy of properties from one object to another.
     * Does not recurse into non-scalar properties
     * Does not check to see if the property has a value before copying
     *
     * @param  {Object} to   Destination object
     * @param  {Object} from Source object
     * @return {Object}      Destination object
     * @static
     * @private
     */
    mod.shallowCopy = function(to, from) {
        from = from || {};
        if ((to !== null) && (to !== undefined)) {
            for (let p in from) {
                if (!hasOwn(from, p)) {
                    continue;
                }
                if (p === '__proto__' || p === 'constructor') {
                    continue;
                }
                to[p] = from[p];
            }
        }
        return to;
    };

    /**
     * Naive copy of a list of key names, from one object to another.
     * Only copies property if it is actually defined
     * Does not recurse into non-scalar properties
     *
     * @param  {Object} to   Destination object
     * @param  {Object} from Source object
     * @param  {Array} list List of properties to copy
     * @return {Object}      Destination object
     * @static
     * @private
     */
    mod.shallowCopyFromList = function(to, from, list) {
        list = list || [];
        from = from || {};
        if ((to !== null) && (to !== undefined)) {
            for (let i = 0; i < list.length; i++) {
                const p = list[i];
                if (typeof from[p] != 'undefined') {
                    if (!hasOwn(from, p)) {
                        continue;
                    }
                    if (p === '__proto__' || p === 'constructor') {
                        continue;
                    }
                    to[p] = from[p];
                }
            }
        }
        return to;
    };

    /**
     * Simple in-process cache implementation. Does not implement limits of any
     * sort.
     *
     * @implements {Cache}
     * @static
     * @private
     */
    mod.cache = {
        _data: {},
        set: function(key, val) {
            this._data[key] = val;
        },
        get: function(key) {
            return this._data[key];
        },
        remove: function(key) {
            delete this._data[key];
        },
        reset: function() {
            this._data = {};
        }
    };

    /**
     * Transforms hyphen case variable into camel case.
     *
     * @param {String} str Hyphen case string
     * @return {String} Camel case string
     * @static
     * @private
     */
    mod.hyphenToCamel = function(str) {
        return str.replace(/-[a-z]/g, function(match) {
 return match[1].toUpperCase();
});
    };

    /**
     * Returns a null-prototype object in runtimes that support it
     *
     * @return {Object} Object, prototype will be set to null where possible
     * @static
     * @private
     */
    mod.createNullProtoObjWherePossible = (function() {
        if (typeof Object.create == 'function') {
            return function() {
                return Object.create(null);
            };
        }
        if (!({__proto__: null} instanceof Object)) {
            return function() {
                return {__proto__: null};
            };
        }
        // Not possible, just pass through
        return function() {
            return {};
        };
    })();

    /**
     * Copies own-properties from one object to a null-prototype object for basic
     * protection against prototype pollution
     *
     * @param {Object} obj to copy properties from
     * @return {Object} Object with own-properties of input object
     * @static
     * @private
     */
    mod.hasOwnOnlyObject = function(obj) {
        const o = mod.createNullProtoObjWherePossible();
        for (let p in obj) {
            if (hasOwn(obj, p)) {
                o[p] = obj[p];
            }
        }
        return o;
    };

})(utils);

/*
 * EJS Embedded JavaScript templates
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

/**
 * @file Embedded JavaScript templating engine. {@link http://ejs.co}
 * @author Matthew Eernisse <mde@fleegix.org>
 * @author Tiancheng "Timothy" Gu <timothygu99@gmail.com>
 * @project EJS
 * @license {@link http://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0}
 */

/**
 * EJS internal functions.
 *
 * Technically this "module" lies in the same file as {@link module:ejs}, for
 * the sake of organization all the private functions re grouped into this
 * module.
 *
 * @module ejs-internal
 * @private
 */

/**
 * Embedded JavaScript templating engine.
 *
 * @module ejs
 * @public
 */
const EJS = {};
const path = {
    // Mocked path module
};

let scopeOptionWarned = false;
/** @type {string} */
const _VERSION_STRING = '3.1.10';
const _DEFAULT_OPEN_DELIMITER = '<';
const _DEFAULT_CLOSE_DELIMITER = '>';
const _DEFAULT_DELIMITER = '%';
const _DEFAULT_LOCALS_NAME = 'locals';
const _NAME = 'ejs';
const _REGEX_STRING = '(<%%|%%>|<%=|<%-|<%_|<%#|<%|%>|-%>|_%>)';
const _OPTS_PASSABLE_WITH_DATA = ['delimiter', 'scope', 'context', 'debug', 'compileDebug',
    'client', '_with', 'rmWhitespace', 'strict', 'filename', 'async'];
const _JS_IDENTIFIER = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;

/**
 * EJS template function cache. This can be a LRU object from lru-cache NPM
 * module. By default, it is {@link module:utils.cache}, a simple in-process
 * cache that grows continuously.
 *
 * @type {Cache}
 */

EJS.cache = utils.cache;

/**
 * Name of the object containing the locals.
 *
 * This variable is overridden by {@link Options}`.localsName` if it is not
 * `undefined`.
 *
 * @type {String}
 * @public
 */

EJS.localsName = _DEFAULT_LOCALS_NAME;

/**
 * Promise implementation -- defaults to the native implementation if available
 * This is mostly just for testability
 *
 * @type {PromiseConstructorLike}
 * @public
 */

EJS.promiseImpl = (new Function('return this;'))().Promise;

/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `template` is not set, the file specified in `options.filename` will be
 * read.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @memberof module:ejs-internal
 * @param {Options} options   compilation options
 * @param {String} [template] template source
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned.
 * @static
 */

/**
 *
 * @param {Option} options
 * @param {String} template
 */
function handleCache(options, template) {
    let func;
    const filename = options.filename;
    const hasTemplate = arguments.length > 1;
    if (!hasTemplate) {
        throw new Error('Internal EJS error: a template must be provided');
    }

    if (options.cache) {
        if (!filename) {
            throw new Error('cache option requires a filename');
        }
        func = EJS.cache.get(filename);
        if (func) {
            return func;
        }
    }
    func = EJS.compile(template, options);
    if (options.cache) {
        EJS.cache.set(filename, func);
    }
    return func;
}


/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * @memberof module:ejs-internal
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned
 * @static
 */
function includeFile(path, options) {
    const opts = utils.shallowCopy(utils.createNullProtoObjWherePossible(), options);
    opts.filename = path + "/" + options.filename;
    if (typeof options.includer === 'function') {
      const includerResult = options.includer(path, opts.filename);
      if (includerResult) {
        if (includerResult.filename) {
          opts.filename = includerResult.filename;
        }
        if (includerResult.template) {
          return handleCache(opts, includerResult.template);
        }
      }
    }
    return handleCache(opts);
 }

/**
 * Re-throw the given `err` in context to the `str` of ejs, `filename`, and
 * `lineno`.
 *
 * @memberof module:ejs-internal
 * @param {Error}  err      Error object
 * @param {String} str      EJS source
 * @param {String} flnm     file name of the EJS file
 * @param {Number} lineno   line number of the error
 * @param {EscapeCallback} esc
 * @static
 */
function rethrow(err, str, flnm, lineno, esc) {
    const lines = str.split('\n');
    const start = Math.max(lineno - 3, 0);
    const end = Math.min(lines.length, lineno + 3);
    const filename = esc(flnm);
    // Error context
    const context = lines.slice(start, end).map(function(line, i) {
        const curr = i + start + 1;
        return (curr == lineno ? ' >> ' : '    ')
            + curr
            + '| '
            + line;
    }).join('\n');

    // Alter exception message
    err.path = filename;
    err.message = (filename || 'ejs') + ':'
        + lineno + '\n'
        + context + '\n\n'
        + err.message;

    throw err;
}

/**
 *
 * @param {string} str
 */
function stripSemi(str) {
    return str.replace(/;(\s*$)/, '$1');
}

/**
 * Compile the given `str` of ejs into a template function.
 *
 * @param {String}  template EJS template
 *
 * @param {Options} [opts] compilation options
 *
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `opts.client`, either type might be returned.
 * Note that the return type of the function also depends on the value of `opts.async`.
 * @public
 */

EJS.compile = function compile(template, opts) {
    let templ;

    // V1 compat
    // 'scope' is 'context'
    // Remove this in a future version
    if (opts?.scope) {
        if (!scopeOptionWarned) {
            console.warn('`scope` option is deprecated and will be removed in EJS 3');
            scopeOptionWarned = true;
        }
        if (!opts.context) {
            opts.context = opts.scope;
        }
        delete opts.scope;
    }
    templ = new Template(template, opts);
    return templ.compile();
};

/**
 * Render the given `template` of ejs.
 *
 * If you would like to include options but not data, you need to explicitly
 * call this function with `data` being an empty object or `null`.
 *
 * @param {String}   template EJS template
 * @param {Object}  [data={}] template data
 * @param {Options} [opts={}] compilation and rendering options
 * @return {(String|Promise<String>)}
 * Return value type depends on `opts.async`.
 * @public
 */

EJS.render = function(template, d, o) {
    const data = d || utils.createNullProtoObjWherePossible();
    const opts = o || utils.createNullProtoObjWherePossible();

    // No options object -- if there are optiony names
    // in the data, copy them to options
    if (arguments.length == 2) {
        utils.shallowCopyFromList(opts, data, _OPTS_PASSABLE_WITH_DATA);
    }

    return handleCache(opts, template)(data);
};

/**
 * Clear intermediate JavaScript cache. Calls {@link Cache#reset}.
 * @public
 */

/**
 * EJS template class
 * @public
 */
EJS.Template = Template;

EJS.clearCache = function() {
    EJS.cache.reset();
};

/**
 *
 * @param {String} text
 * @param {Object} optsParam
 */
function Template(text, optsParam) {
    const opts = utils.hasOwnOnlyObject(optsParam);
    const options = utils.createNullProtoObjWherePossible();
    this.templateText = text;
    /** @type {string | null} */
    this.mode = null;
    this.truncate = false;
    this.currentLine = 1;
    this.source = '';
    options.client = opts.client || false;
    options.escapeFunction = opts.escape || opts.escapeFunction || utils.escapeXML;
    options.compileDebug = opts.compileDebug !== false;
    options.debug = !!opts.debug;
    options.filename = opts.filename;
    options.openDelimiter = opts.openDelimiter || EJS.openDelimiter || _DEFAULT_OPEN_DELIMITER;
    options.closeDelimiter = opts.closeDelimiter || EJS.closeDelimiter || _DEFAULT_CLOSE_DELIMITER;
    options.delimiter = opts.delimiter || EJS.delimiter || _DEFAULT_DELIMITER;
    options.strict = opts.strict || false;
    options.context = opts.context;
    options.cache = opts.cache || false;
    options.rmWhitespace = opts.rmWhitespace;
    options.root = opts.root;
    options.includer = opts.includer;
    options.outputFunctionName = opts.outputFunctionName;
    options.localsName = opts.localsName || EJS.localsName || _DEFAULT_LOCALS_NAME;
    options.views = opts.views;
    options.async = opts.async;
    options.destructuredLocals = opts.destructuredLocals;
    options.legacyInclude = typeof opts.legacyInclude != 'undefined' ? !!opts.legacyInclude : true;

    if (options.strict) {
        options._with = false;
    } else {
        options._with = typeof opts._with != 'undefined' ? opts._with : true;
    }

    this.opts = options;

    this.regex = this.createRegex();
}

Template.modes = {
    EVAL: 'eval',
    ESCAPED: 'escaped',
    RAW: 'raw',
    COMMENT: 'comment',
    LITERAL: 'literal'
};

Template.prototype = {
    createRegex: function() {
        let str = _REGEX_STRING;
        const delim = utils.escapeRegExpChars(this.opts.delimiter);
        const open = utils.escapeRegExpChars(this.opts.openDelimiter);
        const close = utils.escapeRegExpChars(this.opts.closeDelimiter);
        str = str.replace(/%/g, delim)
            .replace(/</g, open)
            .replace(/>/g, close);
        return new RegExp(str);
    },

    compile: function() {
        /** @type {string} */
        let src;
        /** @type {ClientFunction} */
        let fn;
        const opts = this.opts;
        let prepended = '';
        let appended = '';
        /** @type {EscapeCallback} */
        const escapeFn = opts.escapeFunction;
        /** @type {FunctionConstructor} */
        let Ctor;
        /** @type {string} */
        const sanitizedFilename = opts.filename ? JSON.stringify(opts.filename) : 'undefined';

        if (!this.source) {
            this.generateSource();
            prepended +=
                '  var __output = "";\n' +
                '  function __append(s) { if (s !== undefined && s !== null) __output += s }\n';
            if (opts.outputFunctionName) {
                if (!_JS_IDENTIFIER.test(opts.outputFunctionName)) {
                    throw new Error('outputFunctionName is not a valid JS identifier.');
                }
                prepended += '  var ' + opts.outputFunctionName + ' = __append;' + '\n';
            }
            if (opts.localsName && !_JS_IDENTIFIER.test(opts.localsName)) {
                throw new Error('localsName is not a valid JS identifier.');
            }
            if (opts.destructuredLocals?.length) {
                let destructuring = '  var __locals = (' + opts.localsName + ' || {}),\n';
                for (let i = 0; i < opts.destructuredLocals.length; i++) {
                    const name = opts.destructuredLocals[i];
                    if (!_JS_IDENTIFIER.test(name)) {
                        throw new Error('destructuredLocals[' + i + '] is not a valid JS identifier.');
                    }
                    if (i > 0) {
                        destructuring += ',\n  ';
                    }
                    destructuring += name + ' = __locals.' + name;
                }
                prepended += destructuring + ';\n';
            }
            if (opts._with !== false) {
                prepended += '  with (' + opts.localsName + ' || {}) {' + '\n';
                appended += '  }' + '\n';
            }
            appended += '  return __output;' + '\n';
            this.source = prepended + this.source + appended;
        }

        if (opts.compileDebug) {
            src = 'var __line = 1' + '\n'
                + '  , __lines = ' + JSON.stringify(this.templateText) + '\n'
                + '  , __filename = ' + sanitizedFilename + ';' + '\n'
                + 'try {' + '\n'
                + this.source
                + '} catch (e) {' + '\n'
                + '  rethrow(e, __lines, __filename, __line, escapeFn);' + '\n'
                + '}' + '\n';
        } else {
            src = this.source;
        }

        if (opts.client) {
            src = 'escapeFn = escapeFn || ' + escapeFn.toString() + ';' + '\n' + src;
            if (opts.compileDebug) {
                src = 'rethrow = rethrow || ' + rethrow.toString() + ';' + '\n' + src;
            }
        }

        if (opts.strict) {
            src = '"use strict";\n' + src;
        }
        if (opts.debug) {
            console.log(src);
        }
        if (opts.compileDebug && opts.filename) {
            src = src + '\n'
                + '//# sourceURL=' + sanitizedFilename + '\n';
        }

        try {
            if (opts.async) {
                // Have to use generated function for this, since in envs without support,
                // it breaks in parsing
                try {
                    Ctor = (new Function('return (async function(){}).constructor;'))();
                } catch (e) {
                    if (e instanceof SyntaxError) {
                        throw new Error('This environment does not support async/await');
                    } else {
                        throw e;
                    }
                }
            } else {
                Ctor = Function;
            }
            fn = new Ctor(opts.localsName + ', escapeFn, include, rethrow', src);
        } catch (e) {
            // istanbul ignore else
            if (e instanceof SyntaxError) {
                if (opts.filename) {
                    e.message += ' in ' + opts.filename;
                }
                e.message += ' while compiling ejs\n\n';
                e.message += 'If the above error is not helpful, you may want to try EJS-Lint:\n';
                e.message += 'https://github.com/RyanZim/EJS-Lint';
                if (!opts.async) {
                    e.message += '\n';
                    e.message += 'Or, if you meant to create an async function, pass `async: true` as an option.';
                }
            }
            throw e;
        }

        // Return a callable function which will execute the function
        // created by the source-code, with the passed data as locals
        // Adds a local `include` function which allows full recursive include
        const returnedFn = opts.client ? fn : function anonymous(data) {
            const include = function(path, includeData) {
                let d = utils.shallowCopy(utils.createNullProtoObjWherePossible(), data);
                if (includeData) {
                    d = utils.shallowCopy(d, includeData);
                }
                return includeFile(path, opts)(d);
            };
            return fn.apply(opts.context,
                [data || utils.createNullProtoObjWherePossible(), escapeFn, include, rethrow]);
        };
        if (opts.filename && typeof Object.defineProperty === 'function') {
            const filename = opts.filename;
            const basename = path.basename(filename, path.extname(filename));
            try {
                Object.defineProperty(returnedFn, 'name', {
                    value: basename,
                    writable: false,
                    enumerable: false,
                    configurable: true
                });
            } catch (e) { /* Ignore */ }
        }
        return returnedFn;
    },

    generateSource: function() {
        const opts = this.opts;

        if (opts.rmWhitespace) {
            // Have to use two separate replace here as `^` and `$` operators don't
            // work well with `\r` and empty lines don't work well with the `m` flag.
            this.templateText =
                this.templateText.replace(/[\r\n]+/g, '\n').replace(/^\s+|\s+$/gm, '');
        }

        // Slurp spaces and tabs before <%_ and after _%>
        this.templateText =
            this.templateText.replace(/[ \t]*<%_/gm, '<%_').replace(/_%>[ \t]*/gm, '_%>');

        const self = this;
        const matches = this.parseTemplateText();
        const d = this.opts.delimiter;
        const o = this.opts.openDelimiter;
        const c = this.opts.closeDelimiter;

        if (matches?.length) {
            matches.forEach(function(line, index) {
                let closing;
                // If this is an opening tag, check for closing tags
                // May end up with some false positives here
                // Better to store modes as k/v with openDelimiter + delimiter as key
                // Then this can simply check against the map
                if (line.startsWith(o + d) // If it is a tag
                    && !line.startsWith(o + d + d)) { // And is not escaped
                    closing = matches[index + 2];
                    if (!(closing == d + c || closing == '-' + d + c || closing == '_' + d + c)) {
                        throw new Error('Could not find matching close tag for "' + line + '".');
                    }
                }
                self.scanLine(line);
            });
        }

    },

    parseTemplateText: function() {
        let str = this.templateText;
        const pat = this.regex;
        let result = pat.exec(str);
        const arr = [];
        let firstPos;

        while (result) {
            firstPos = result.index;

            if (firstPos !== 0) {
                arr.push(str.substring(0, firstPos));
                str = str.slice(firstPos);
            }

            arr.push(result[0]);
            str = str.slice(result[0].length);
            result = pat.exec(str);
        }

        if (str) {
            arr.push(str);
        }

        return arr;
    },

    _addOutput: function(line) {
        if (this.truncate) {
            // Only replace single leading linebreak in the line after
            // -%> tag -- this is the single, trailing linebreak
            // after the tag that the truncation mode replaces
            // Handle Win / Unix / old Mac linebreaks -- do the \r\n
            // combo first in the regex-or
            line = line.replace(/^(?:\r\n|\r|\n)/, '');
            this.truncate = false;
        }
        if (!line) {
            return line;
        }

        // Preserve literal slashes
        line = line.replace(/\\/g, '\\\\');

        // Convert linebreaks
        line = line.replace(/\n/g, '\\n');
        line = line.replace(/\r/g, '\\r');

        // Escape double-quotes
        // - this will be the delimiter during execution
        line = line.replace(/"/g, '\\"');
        this.source += '    ; __append("' + line + '")' + '\n';
        return undefined;
    },

    scanLine: function(line) {
        const self = this;
        const d = this.opts.delimiter;
        const o = this.opts.openDelimiter;
        const c = this.opts.closeDelimiter;
        let newLineCount = 0;

        newLineCount = (line.split('\n').length - 1);

        switch (line) {
            case o + d:
            case o + d + '_':
                this.mode = Template.modes.EVAL;
                break;
            case o + d + '=':
                this.mode = Template.modes.ESCAPED;
                break;
            case o + d + '-':
                this.mode = Template.modes.RAW;
                break;
            case o + d + '#':
                this.mode = Template.modes.COMMENT;
                break;
            case o + d + d:
                this.mode = Template.modes.LITERAL;
                this.source += '    ; __append("' + line.replace(o + d + d, o + d) + '")' + '\n';
                break;
            case d + d + c:
                this.mode = Template.modes.LITERAL;
                this.source += '    ; __append("' + line.replace(d + d + c, d + c) + '")' + '\n';
                break;
            case d + c:
            case '-' + d + c:
            case '_' + d + c:
                if (this.mode == Template.modes.LITERAL) {
                    this._addOutput(line);
                }

                this.mode = null;
                this.truncate = line.indexOf('-') === 0 || line.indexOf('_') === 0;
                break;
            default:
                // In script mode, depends on type of tag
                if (this.mode) {
                    // If '//' is found without a line break, add a line break.
                    switch (this.mode) {
                        case Template.modes.EVAL:
                        case Template.modes.ESCAPED:
                        case Template.modes.RAW:
                            if (line.lastIndexOf('//') > line.lastIndexOf('\n')) {
                                line += '\n';
                            }
                    }
                    switch (this.mode) {
                        // Just executing code
                        case Template.modes.EVAL:
                            this.source += '    ; ' + line + '\n';
                            break;
                        // Exec, esc, and output
                        case Template.modes.ESCAPED:
                            this.source += '    ; __append(escapeFn(' + stripSemi(line) + '))' + '\n';
                            break;
                        // Exec and output
                        case Template.modes.RAW:
                            this.source += '    ; __append(' + stripSemi(line) + ')' + '\n';
                            break;
                        case Template.modes.COMMENT:
                            // Do nothing
                            break;
                        // Literal <%% mode, append as raw output
                        case Template.modes.LITERAL:
                            this._addOutput(line);
                            break;
                    }
                }
                // In string mode, just add the output
                else {
                    this._addOutput(line);
                }
        }

        if (self.opts.compileDebug && newLineCount) {
            this.currentLine += newLineCount;
            this.source += '    ; __line = ' + this.currentLine + '\n';
        }
    }
};

/**
 * Escape characters reserved in XML.
 *
 * This is simply an export of {@link module:utils.escapeXML}.
 *
 * If `markup` is `undefined` or `null`, the empty string is returned.
 *
 * @param {String} markup Input string
 * @return {String} Escaped string
 * @public
 * @func
 * */
EJS.escapeXML = utils.escapeXML;

/**
 * Version of EJS.
 *
 * @readonly
 * @type {String}
 * @public
 */

EJS.VERSION = _VERSION_STRING;

/**
 * Name for detection of EJS.
 *
 * @readonly
 * @type {String}
 * @public
 */

EJS.name = _NAME;

export default EJS;
