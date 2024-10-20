/* eslint-disable no-console */
/*
 * This is an utility script for the WidgetHub plugin
 * It converts widgets from ../repository in yaml format
 * into ../presets in .json format.
 * All json files in presets will be automatically imported
 * when the plugin is installed or updated.
 *
 * Please, execute me with nodejs.
 *
 * @autor Josep Mulet Pol <pep.mulet@gmail.com>
 *
 **/

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const crypto = require("crypto");

/**
 * @param {string} str
 * @param {string} needle
 * @returns {number} The number of cases found
 */
function casesOf(str, needle) {
    return str.split(needle).length - 1;
}

/**
 * Detect the number of duplicated items in the list
 * @param {string[]} list
 * @returns {number} The number of errors
 */
function checkUniqueKeys(list) {
    let nerrs = 0;
    list.forEach(e => {
        const flist = list.filter(e2 => e2 == e);
        if (flist.length != 1) {
            nerrs++;
            console.error(`\tDuplicate key ${e}`);
        }
    });
    return nerrs;
}


/**
 * @param {*} wdg - The widget definition parsed from yaml into JS object
 * @returns {number} The number of errors detected
 */
function testJsonFields(wdg) {
    let nerrs = 0;
    const requiredFields = ['name', 'key', 'template', 'version', 'author'];
    requiredFields.forEach(key => {
        if (wdg[key] == null) {
            nerrs++;
            console.error(`\tThe key ${key} is required`);
        }
    });
    if (wdg.parameters != null) {
        // Check parameters.
        wdg.parameters.forEach((/** @type {*} */ p) => {
            if (!p.partial && (!p.name || !p.title)) {
                nerrs++;
                console.error(`\tThe parameter ${JSON.stringify(p)} requires name and title`);
            }
            if (p.type == 'select') {
                if (!p.options?.length) {
                    nerrs++;
                    console.error(`\tThe parameter ${JSON.stringify(p)} requires options array`);
                }
            }
        });
    }
    // Check for consistency in HTML template. Most common tags are balanced.
    if (wdg.template != null) {
        const requiredFields2 = ['span', 'p', 'div', 'li', 'ol', 'ul', 'table', 'td', 'tr', 'th'];
        requiredFields2.forEach((tag) => {
            const nn1 = casesOf(wdg.template, '<' + tag);
            const nn2 = casesOf(wdg.template, '</' + tag);
            if (nn1 != nn2) {
                nerrs++;
                console.error(`\tUnbalanced tag ${tag} in template! ${nn1} - ${nn2}`);
            }
        });
    }
    return nerrs;
}

/**
 * Check if the json fields have the correct format
 * @param {*} wdg
 * @returns
 */
function testJsonFields_contents(wdg) {
    let nerrs = 0;
    if (wdg.key.toLowerCase() != wdg.key || wdg.key.trim() != wdg.key) {
        nerrs++;
        console.log("\tDo not use whitespaces in keys and use lowercase!");
    }
    if (wdg.name && wdg.name.indexOf("|") >= 0) {
        nerrs++;
        console.log("\tNames cannot contain | use category instead");
    }
    return nerrs;
}

/**
 * @param {*} parsed - The parsed widget
 * @returns {number} - The number of errors
 */
function checkTemplate(parsed) {
    // Detect the type of engine
    let engine = parsed.engine;
    if (!engine) {
        engine = parsed.template.indexOf('<%') >= 0 ? 'ejs' : 'mustache';
    }
    if (engine === 'mustache') {
        return checkMustache(parsed);
    } else {
        return checkEJS(parsed);
    }
}

/**
 * @param {*} parsed - The parsed widget
 * @returns {number} - The number of errors
 */
function checkEJS(parsed) {
    // TODO: Not implemented
    return 0;
}

/**
 * @param {*} parsed - The parsed widget
 * @returns {number} - The number of errors
 */
function checkMustache(parsed) {
    let nerr = 0;
    const str = parsed.template;

     // The context for the template.
     /** @type {Record<string, *>} */
     const ctx = {};
     // Find all {{#var}} {{/var}} occurences in the template
     const regex0 = /{{#var}}(.*){{\/var}}/gm;
     let m0;
     while ((m0 = regex0.exec(str)) !== null) {
        if (m0.index === regex0.lastIndex) {
            regex0.lastIndex++;
        }
        const varName = m0[1].split('=')[0];
        ctx[varName] = m0[1];
     }

    // All fields {{}} must have an associated parameter.
    const regex = /\{{2,3}([^}]*)\}{2,3}/gm;
    let m;

    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        (parsed.parameters ?? []).forEach((/** @type {*} */ p) => {
            ctx[p.name] = p.value;
        });

        m.forEach((match, groupIndex) => {
            if (groupIndex == 1) {
                if (match.indexOf("/") >= 0) {
                    // End of block
                    return;
                }
                // var defines a new variable
                
                // Ignore special blocks
                if (['#if', '#var', '#eval', '#each', '#I18n', 'i', 'j'].indexOf(match) > -1) {
                    return;
                }

                const key = match.replace("#", "").replace("^", "");
                if (ctx[key] === undefined) {
                    console.error(`Missing parameter ${key} for template ${parsed.key}`);
                    nerr++;
                }
            }
        });
    }
    return nerr;
}

/**
 * @param {*} parsed - The parsed widget definition
 */
function findErrors(parsed) {
    if (parsed.key === 'partials') {
        return;
    }
    // Check that all required parameters are there and have the right syntax.
    if (testJsonFields(parsed)) {
        console.error(":-( Errors have been found! Fix the issues and run the script again.");
        process.exit(1);
    }

    // All parameters must have a default value.
    (parsed.parameters || []).forEach((/** @type {*} */ p) => {
        if (p.value == null) {
            console.error(`The parameter ${JSON.stringify(p)} requires a default value in widget ${parsed.key}`, parsed);
            console.error(":-( Parameter value missing! Fix this issue and run the script again.");
            process.exit(1);
        }
    });

    if (checkTemplate(parsed) || testJsonFields_contents(parsed)) {
        console.error("Errors detected. Fix the issues and run the script again.");
        process.exit(1);
    }
}


console.log(`
    *****************************************************
    This is an utility script for the WidgetHub plugin
    It converts widgets from ../repository in yaml format
    into ../presets in .json format.

    Josep Mulet Pol <pep.mulet@gmail.com>
    *****************************************************

`);

// Detecting parameters
let testMode = false;
let helpMode = false;
let filterMode = '*';
process.argv.forEach((arg, i) => {
    if (arg === '--test' || arg === '-t') {
        testMode = true;
        console.log("> Running in test mode, no changes will be written");
    } else if (arg === '--help' || arg === '-h') {
        helpMode = true;
    } else if (i > 1) {
        filterMode = arg;
    }
});

if (helpMode || process.argv.length < 3) {
    console.error(`
    The call requires one argument, either the yaml file name or @, ! to convert all files.
    Examples:
        node ./presets_tiny.js bs-tabs    # It only treats bs-tabs.yaml
        node ./presets_tiny.js @          # It treats all files that have been modified (check hash)
        node ./presets_tiny.js !          # Force transforming all files regardless of its modification.
    
    Options:
        --test  -t  # Runs in test mode (no changes are written)
        --help  -h  # Shows this information
    `);
    process.exit(1);
}

// Load the hashes file (if exists) to detect which yaml files have changed.
/** @type {Record<string, string>} */
let hashes = {};
try {
    const raw = fs.readFileSync("./.hashes-presets-tiny.json", "utf-8");
    hashes = JSON.parse(raw);
} catch (ex) {
    console.info("> Creating empty hash file.");
}

const sourceDirectory = path.resolve('../repository/');
const targetDirectory = path.resolve('../presets/');

let doFiles = fs.readdirSync(sourceDirectory)
    .filter(e => path.extname(e).endsWith("yaml") || path.extname(e).endsWith("yml"));
if (filterMode !== '@' && filterMode !== '!') {
    doFiles = doFiles.filter(e => e.endsWith(filterMode));
    console.log('> Treating files ', doFiles);
}

/** @type {string[]} */
let usedKeys = [];

// Load all files into an array
/** @type {Record<string, *>} */
const widgets = {};

doFiles.forEach((f) => {
    const ymlfile = fs.readFileSync(path.join(sourceDirectory, f), "utf-8");
    /** @type {*} */
    let parsed;
    try {
        parsed = yaml.load(ymlfile);
        if (parsed) {
            widgets[f] = parsed;
        } else {
            console.error(`Error: cannot parse file ${f}`);
            process.exit(1);
        }
    } catch (ex) {
        console.error(`Invalid syntax in yaml for file ${f}:: ${ex}`);
        process.exit(1);
    }
});

// Search for an special file with key named partials
const partials = Object.values(widgets).filter((/** @type {*} */ w) => w.key === "partials")[0];
if (partials) {
    Object.values(widgets)
        .filter((w) => w.key !== "partials")
        .forEach((w) => {
        if (Array.isArray(w.parameters)) {
            w.parameters.forEach((p, i) => {
                if (p.partial) {
                    const replacement = partials[p.partial];
                    if (!replacement) {
                        console.error(`Cannot find partial ${p.partial} in widget ${w.key}`);
                        process.exit(1);
                    }
                    w.parameters[i] = replacement;
                }
            });
        }
    });
}


Object.entries(widgets).forEach(([f, parsed]) => {
    console.log(`\n> File ${f}`);
    console.log('  ------------------------');
    if (parsed.template?.indexOf('<script') >= 0) {
        console.error("Template cannot contain any script tag.");
    }
    // Check for errors.
    findErrors(parsed);
    usedKeys.push(parsed.key);

    const output = JSON.stringify(parsed, null, 4);
    parsed.generated = "" + new Date();
    const preoutput = JSON.stringify(parsed, null, 4);

    // Compute hash with generated date field.
    let hashNow = crypto.createHash('sha256').update(preoutput).digest('base64');

    if (filterMode === '!' || hashes[parsed.key] != hashNow) {
        hashes[parsed.key] = hashNow;
        // Save-it
        const filename = f.replace(".yaml", ".json").replace(".yml", ".json");
        if (!testMode) {
            fs.writeFileSync(path.join(targetDirectory, filename), output, { encoding: "utf-8" });
            console.log(` [Saved] ${filename}`);
        }
    } else {
        console.log(" [No changes]");
    }
});

// Check duplicates on widget keys
checkUniqueKeys(usedKeys);

// Saving hashes for future runs.
if (!testMode) {
    fs.writeFileSync(".hashes-presets-tiny.json", JSON.stringify(hashes), "utf-8");
}
