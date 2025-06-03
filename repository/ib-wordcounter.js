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
 *
 * @package     tiny_widgethub
 * @copyright   2025 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
(function() {
  // Check if the script is already in page.
  window.widgetHub = window.widgetHub || {widgets: {}};
  if (widgetHub.widgets.ibWordCounter) {
    console.warn("ibWordCounter is already in page.");
    return;
  }
  // Define the workspace for your widget. You can hold whatever needed.
  widgetHub.widgets.ibWordCounter = {cache: {}};

  // Always search by a query that could not potentially affect other widgets.
  document.querySelectorAll('div[data-widget="ib-wordcounter"]').forEach(elem => {
    if (elem.dataset.active === "true") {
      // Avoid processing the same widget instance several times.
      return;
    }
    // Apply the logic here to the given elem root
    // This is just an example:
    if (!elem.id) {
      // Make sure the element has an id (used by the cache)
      elem.id = 'g' + Math.random().toString(32).substring(2);
    }
    // Use the namespace ...
    let wordCount = widgetHub.widgets.ibWordCounter.cache[elem.id];
    if (!wordCount) {
      const text = elem.textContent || '';
      wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

      // Store in cache
      widgetHub.widgets.ibWordCounter.cache[elem.id] = wordCount;
    }
    // Apply all desired effects to the element
    elem.title = 'The number of words of this block is ' + wordCount;
    elem.style.border = '1px dotted gray';
  });
})();
