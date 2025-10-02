/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

/**
 * Reads data from a file, extracts keys, and checks if they are alphabetically sorted.
 * @param {string} filename - The name of the file containing the string data.
 * @return {string[]} - The list of language keys
 */
function checkAlphabeticalOrder(filename = "string_data.txt") {
    const filePath = path.join(__dirname, filename);

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File '${filename}' not found at ${filePath}. Please create this file and paste the data into it.`);
        return [];
    }

    let keys = [];
    try {
        // Read the file content synchronously
        const data = fs.readFileSync(filePath, 'utf-8');

        // Regular expression to find all keys enclosed in single quotes after $string
        // The /g flag ensures all matches are found.
        const regex = /\$string\['(.*?)'\]/g;
        keys = [];
        let match;

        // Use a loop with regex.exec to extract all capturing groups
        while ((match = regex.exec(data)) !== null) {
            keys.push(match[1]); // match[1] is the content of the first capturing group (the key)
        }

        if (keys.length === 0) {
            console.log("No keys were extracted. Check the file content and the regex pattern.");
            return [];
        }

        // 1. Create a sorted copy of the keys
        const sortedKeys = [...keys].sort();

        // 2. Check if the original array is equal to the sorted array
        const isSorted = keys.every((key, index) => key === sortedKeys[index]);

        console.log(`Data loaded from: ${filename}`);
        console.log(`Total keys extracted: ${keys.length}`);
        console.log(`Is the list of keys alphabetically sorted? ${isSorted}`);

        if (!isSorted) {
            // Find the first point of disorder
            for (let i = 0; i < keys.length - 1; i++) {
                // JavaScript's string comparison (>) works for alphabetical checks
                if (keys[i] > keys[i + 1]) {
                    console.log("\nFirst point of disorder found:");
                    console.log(`Index ${i}: '${keys[i]}' (should come after)`);
                    console.log(`Index ${i + 1}: '${keys[i + 1]}' (should come before)`);
                    break;
                }
            }
        }

    } catch (e) {
        console.error('An error occurred', e);
    }
    return keys;
}

/**
 * Validates a key name against the required format:
 * only lowercase letters (a-z) and underscores (_).
 * @param {string} key - The extracted key (e.g., 'name_subname').
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidKeyFormat(key) {
    // Regex: starts with a letter, followed by only a-z or _, ending with a letter or number.
    // The requirement is "only lowercase chars or _", so we'll enforce that strictly.
    return /^[a-z_]+$/.test(key);
}

/**
 * Reads a file, extracts keys matching $string['key_name'], and checks them.
 * @param {string} dir - The path to the file.
 * @param {Set<string>} knownKeys - Good keys names.
 * @param {Set<string>} unknownKeys - Set to collect keys not found in KNOWN_KEYS.
 * @param {Set<string>} badFormatKeys - Set to collect keys that violate naming conventions.
 * @return {number} - Number of files scanned.
 */
function processDirectory(dir, knownKeys, unknownKeys, badFormatKeys) {
    try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Ignore node_modules for efficiency
                if (item !== 'node_modules') {
                    processDirectory(fullPath, knownKeys, unknownKeys, badFormatKeys);
                }
            } else if (stat.isFile()) {
                processFile(fullPath, knownKeys, unknownKeys, badFormatKeys);
            }
        }
        return items.length;
    } catch (e) {
        console.error('Error processing directory ${dir}:', e);
    }
    return 0;
}

/**
 * Reads a file, extracts keys matching $string['key_name'], and checks them.
 * @param {string} filePath - The path to the file.
 * @param {Set<string>} knownKeys - Good keys names.
 * @param {Set<string>} unknownKeys - Set to collect keys not found in KNOWN_KEYS.
 * @param {Set<string>} badFormatKeys - Set to collect keys that violate naming conventions.
 */
function processFile(filePath, knownKeys, unknownKeys, badFormatKeys) {
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        console.error(`Error reading file ${filePath}:`, e);
        return;
    }

    // Regex to find: $string['...'] OR $string["..."]
    // We target the capture group (.*?) inside the quotes.
    const keyRegex = /\$string\[['"]([a-zA-Z0-9_:.-]+)['"]\]/g;
    let match;

    while ((match = keyRegex.exec(content)) !== null) {
        const fullKey = match[1];

        // 1. Check for bad naming convention (lowercase letters and underscore only)
        if (!isValidKeyFormat(fullKey)) {
            badFormatKeys.add(`File: ${filePath} | Key: ${fullKey}`);
        }

        // 2. Check against known keys
        // We only check keys that adhere to the basic format for redundancy,
        // as a key like 'Privacy:Metadata' will never match a 'known key' list built on the 'a_b' format.
        if (isValidKeyFormat(fullKey) && !knownKeys.has(fullKey)) {
            unknownKeys.add(`File: ${filePath} | Key: ${fullKey}`);
        }
    }
}

/**
 * Checks if two Set objects contain the exact same elements.
 * @param {Set<any>} setA The first Set.
 * @param {Set<any>} setB The second Set.
 * @returns {boolean} True if they are equal, false otherwise.
 */
function areSetsEqual(setA, setB) {
    // 1. Quick fail check: If sizes are different, they can't be equal.
    if (setA.size !== setB.size) {
        return false;
    }

    // 2. Element check: Use the .every() method on SetA's elements 
    // to verify that every element exists in SetB.
    for (const item of setA) {
        if (!setB.has(item)) {
            return false;
        }
    }

    // If both checks pass, the sets are equal.
    return true;
}

// Run the function
const langKeys = checkAlphabeticalOrder('../lang/en/tiny_widgethub.php');
if (langKeys.length !== 0) {
    const langKeysEs = checkAlphabeticalOrder('../lang/es/tiny_widgethub.php');
    const langKeysCa = checkAlphabeticalOrder('../lang/ca/tiny_widgethub.php');
    const knownKeySet = new Set(langKeys); // Convert for fast lookups
    const setEs = new Set(langKeysEs);
    const setCa = new Set(langKeysCa);

    if (!areSetsEqual(knownKeySet, setEs)) {
        console.error("❌ Spanish translation set is different from english");
    } else if (!areSetsEqual(knownKeySet, setCa)) {
        console.error("❌ Catalan translation set is different from english");
    } else {
        console.error("✅ All translation sets are identical ");
    }

    console.log("Checking repository for bad keys");
    const unknownKeys = new Set();
    const badFormatKeys = new Set();

    const START_DIR = '../repository';
    const numFiles = processDirectory(START_DIR, knownKeySet, unknownKeys, badFormatKeys);
    // --- Output Results ---
    console.log("========================================");
    console.log(`CHECK SUMMARY (Total Files Scanned: ${numFiles})\n`);

    if (unknownKeys.size > 0) {
        console.log(`❌ ${unknownKeys.size} UNKNOWN KEYS FOUND (Not in KNOWN_KEYS list):`);
        unknownKeys.forEach(key => console.log(`   - ${key}`));
        console.log("----------------------------------------");
    } else {
        console.log(`✅ All extracted keys ${langKeys.length} are found in the KNOWN_KEYS list.`);
    }

    if (badFormatKeys.size > 0) {
        console.log(`\n⚠️ ${badFormatKeys.size} BAD FORMAT KEYS FOUND (Violates [a-z_] only):`);
        badFormatKeys.forEach(key => console.log(`   - ${key}`));
        console.log("----------------------------------------");
    } else {
        console.log("✅ All extracted keys adhere to the [a-z_] naming convention.");
    }
}