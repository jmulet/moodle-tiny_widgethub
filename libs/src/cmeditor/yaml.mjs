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

import {
  parse,
  stringify,
  Scalar,
} from 'yaml';

/**
 * Does a key name of the yaml file requires a block format?
 * @param {string} str
 * @returns {boolean}
 */
function needsBlock(str) {
  return typeof str === 'string' && str.includes('\n');
}

/**
 * Converts a JSON string to a YAML string.
 * @param {string} json 
 * @returns {string}
 */
function fromJSON(json) {
  const _obj = JSON.parse(json);
  const blockKeys = {
    template: 'BLOCK_LITERAL',
    filter: 'BLOCK_LITERAL',
    instructions: 'BLOCK_FOLDED',
  };

  for (const [key, style] of Object.entries(blockKeys)) {
    if (needsBlock(_obj[key])) {
      /** @type {any} */
      const scalar = new Scalar(_obj[key]);
      scalar.type = style;
      if (style === 'BLOCK_FOLDED') {
        scalar.chomping = 'CLIP';
      }
      _obj[key] = scalar;
    }
  }
  if (Array.isArray(_obj.parameters)) {
    for (const param of _obj.parameters) {
      if (param.bind && typeof param.bind === 'object') {
        ['get', 'set'].forEach(key => {
          if (needsBlock(param.bind[key])) {
            param.bind[key] = new Scalar(param.bind[key]);
            param.bind[key].type = 'BLOCK_LITERAL';
          }
        });
      }
    }
  }
  return stringify(_obj, { indent: 2 });
}

export {
  parse,
  fromJSON,
  stringify,
  Scalar,
};