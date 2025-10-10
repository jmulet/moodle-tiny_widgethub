/* eslint-disable no-console */
/**
 * Utility Script for the WidgetHub Plugin
 *
 * Usage:
 * - This script must be executed using NodeJS
 *
 * Author: Josep Mulet Pol <pep.mulet@gmail.com>
 */
const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const srcDir = path.resolve('../repository'); // Source folder
const outDir = path.resolve('../repository/lang'); // Destination folder

/**
 * Reads data from a file, extracts keys, and checks if they are alphabetically sorted.
 * @param {string} lang - The name of the file containing the string data.
 * @return {Record<string, string>} - The list of language keys
 */
function loadLangStrings(lang = 'en') {
    const filename = "../lang/" + (lang || 'en') + "/tiny_widgethub.php";
    const filePath = path.join(__dirname, filename);

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File '${filename}' not found at ${filePath}. Please create this file and paste the data into it.`);
        return {};
    }
    /** @type {Record<string, string>}  */
    let keyValues = {};
    try {
        // Read the file content synchronously
        const data = fs.readFileSync(filePath, 'utf-8');

        // Regular expression to find all keys enclosed in single quotes after $string
        // The /g flag ensures all matches are found.
        const regex = /\$string\['(.*?)'\]\s*=\s*(['"])((?:\\.|(?!\2).)*?)\2/g;
        keyValues = {};
        let match;

        // Use a loop with regex.exec to extract all capturing groups
        while ((match = regex.exec(data)) !== null) {
            keyValues[match[1]] = match[3].replace(/\\'/g, "'").replace(/\\"/g, '"');
        }
    } catch (e) {
        console.error('An error occurred', e);
    }
    return keyValues;
}

// === MAIN FUNCTION ===
/**
 * @param {Record<string, string>} stringMap
 * @param {string} [lang]
 */
function replacePlaceholdersInYmlFiles(stringMap, lang = 'en') {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true});
  }

  // Read all .yml files from the source directory
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.yml'));

  files.forEach(file => {
    const filePath = path.join(srcDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Replace all occurrences of $string.<key>
    const replaced = content.replace(/\$string\.([A-Za-z0-9_]+)/g, (match, key) => {
      if (stringMap[key]) {
        return stringMap[key];
      } else {
        console.warn(`Warning: No mapping found for ${key} in file ${file}`);
        return match; // Leave it unchanged
      }
    });

    // Write to destination directory
    fs.mkdirSync(path.dirname(outDir + '/' + lang), {recursive: true});
    const outPath = path.join(outDir + '/' + lang, file);
    fs.writeFileSync(outPath, replaced, 'utf8');

    console.log(`Processed: ${file}`);
  });

  console.log('✅ All files processed successfully.');
}

// Run
["en", "es", "ca"].forEach(lang => {
    const langMap = loadLangStrings(lang);
    replacePlaceholdersInYmlFiles(langMap, lang);
});