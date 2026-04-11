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
 * Form for widget repository synchronization.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\form;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * Synchronization form class.
 */
class settingssyncform extends \moodleform {
    /**
     * Form definition.
     */
    public function definition() {
        $mform = $this->_form;
        $tablehtml = $this->_customdata['tablehtml'] ?? '';

        $mform->addElement('html', $tablehtml);

        // Hidden field kept in sync with checkbox selections by the AMD module.
        $mform->addElement('hidden', 'selectedkeys', '');
        $mform->setType('selectedkeys', PARAM_RAW);

        $buttonarray = [];
        $buttonarray[] = &$mform->createElement(
            'submit',
            'submitbutton',
            get_string('syncrepository', 'tiny_widgethub'),
            ['disabled' => 'disabled']
        );
        $buttonarray[] = &$mform->createElement('cancel');
        $mform->addGroup($buttonarray, 'buttonar', '', [' '], false);
        $mform->closeHeaderBefore('buttonar');
    }
}
