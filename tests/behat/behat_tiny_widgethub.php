<?php
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
 * Behat steps definitions for your Moodle plugin.
 *
 * @package    tiny_widgethub
 * @category   test
 * @copyright  2026 Josep Mulet
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Custom Behat steps for tiny_widgethub.
 */
class behat_tiny_widgethub extends behat_base {
    /**
     * Changes the window size to a specific resolution.
     * Note: This is particularly useful for testing Moodle's
     * responsive "Clean" or "Boost" themes in Docker.
     *
     * @Given /^I set the window size to "(?P<width>\d+)"x"(?P<height>\d+)"$/
     * @param int $width
     * @param int $height
     */
    public function i_set_the_window_size_to_x($width, $height) {
        $this->getSession()->getDriver()->resizeWindow((int)$width, (int)$height, null);
    }
}
