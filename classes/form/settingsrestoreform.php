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
 * Tiny WidgetHub plugin.
 *
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @package     tiny_widgethub
 */

namespace tiny_widgethub\form;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');
require_once($CFG->libdir . '/editorlib.php');

/**
 * WidgetHub restore settings form.
 */
class settingsrestoreform extends \moodleform {
    /**
     * Form definition.
     */
    public function definition() {
        $mform = $this->_form;

        $mform->addElement(
            'filepicker',
            'zipfile',
            get_string('upload', 'core') . ' .whz',
            null,
            ['accepted_types' => ['.whz', '.zip']]
        );

        $mform->addRule('zipfile', null, 'required');

        // Add other import options.
        // Override existing widgets.
        $mform->addElement(
            'selectyesno',
            'override',
            get_string('overridewidgets', 'tiny_widgethub')
        );

        // Import configuration settings.
        $mform->addElement(
            'selectyesno',
            'config',
            get_string('importconfig', 'tiny_widgethub')
        );

        $mform->setType('override', PARAM_INT);
        $mform->setType('config', PARAM_INT);
        $mform->setDefault('override', 1);
        $mform->setDefault('config', 0);

        $this->add_action_buttons();
    }
}
