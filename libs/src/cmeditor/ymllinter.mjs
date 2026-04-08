
/* eslint-disable max-len */
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
 * Tiny CodePro plugin.
 *
 * @module      tiny_codepro/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import YAML from 'yaml';

/**
 * Traverses a YAML CST to find the node corresponding to a Zod error path.
 * This function is the same as before, as Zod's path format is compatible.
 * @param {YAML.Node | null} cstNode - The root CST node from the 'yaml' library.
 * @param {PropertyKey[]} path - The path segments from a Zod issue.
 * @returns {YAML.Node | null} The CST node at the path, or null if not found.
 */
function findNodeAtObjectPath(cstNode, path) {
    /** @type {YAML.Node | null}  */
    let currentNode = cstNode;
    /** @type {YAML.Node | null}  */
    let parentNode = null;
    if (!path || path.length === 0) {
        return cstNode;
    }
    for (const segment of path) {
        // If at any point our node is null, we can't go deeper.
        if (!currentNode) {
            return parentNode;
        }
        parentNode = currentNode;

        if (YAML.isMap(currentNode) && typeof segment === 'string') {
            // --- Case 1: The current node is a YAML Map ---
            // We can only proceed if the path segment is a string key.

            // Find the key-value pair where the key's value matches the segment.
            // We must also check that the key is a Scalar to safely access its .value
            /** @type {any} */
            const pair = currentNode.items.find(
                (p) => YAML.isScalar(p.key) && p.key.value === segment
            );
            // The new current node is the value of the found pair.
            currentNode = pair ? pair.value : null;

        } else if (YAML.isSeq(currentNode) && typeof segment === 'number') {
            // --- Case 2: The current node is a YAML Sequence (Array) ---
            // We can only proceed if the path segment is a number index.

            /** @type {any} */
            const item = currentNode.items[segment];
            currentNode = item ?? null;

            // --- Case 3: Mismatch or end of traversal ---
            // If the node is not a traversable type (e.g., a Scalar) or the
            // segment type doesn't match the node type (e.g., a number for a map),
            // then the path is invalid.
        } else {
            currentNode = null;
        }
    }

    return currentNode ?? parentNode;
}

/**
 * Creates a linter for CodeMirror
 * @param {import("zod").ZodSchema} schema
 * @returns
 */
export const createYamlZodLinter = (schema) => {
    return (/** @type {import("@codemirror/view").EditorView} */ view) => {
        /** @type {any} */
        const diagnostics = [];
        const text = view.state.doc.toString();
        if (text.trim().length === 0) {
            return diagnostics;
        }

        // 1. Parse YAML to a CST, collecting syntax errors
        const doc = YAML.parseDocument(text);
        if (doc.errors.length > 0) {
            for (const err of doc.errors) {
                const pos = err.pos || [0, 0];
                diagnostics.push({
                    from: pos[0], to: pos[1] || pos[0],
                    severity: 'error', message: `YAML Syntax Error: ${err.message}`,
                });
            }
            return diagnostics;
        }

        // 2. Convert to JSON and validate with Zod's safeParse
        const jsonData = doc.toJSON();
        const result = schema.safeParse(jsonData);

        // 3. If validation fails, map Zod issues to diagnostics
        if (!result.success) {
            for (const issue of result.error.issues) {
                // 4. Map the error path back to the CST node to get its position
                const node = findNodeAtObjectPath(doc.contents, issue.path);
                const range = node && node.range ? node.range : [0, view.state.doc.length];

                const isWarning = issue.message?.indexOf('[DEPRECATED]') >= 0;
                diagnostics.push({
                    from: range[0], to: range[1],
                    severity: isWarning ? 'warning' : 'error',
                    message: `Schema Error: ${issue.message} (at ${issue.path.join('.') || 'root'})`,
                });
            }
        }
        return diagnostics;
    };
};
