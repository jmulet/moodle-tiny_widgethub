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
 * WidgetHub editor settings form.
 */
class settingseditorform extends \moodleform {
    /**
     * Form definition.
     */
    public function definition() {
        $mform = $this->_form;
        $widgetid = $this->_customdata['id'] ?? \tiny_widgethub\local\storage\storagefactory::BLANK_ID;

        $mform->addElement('hidden', 'id', $widgetid);
        $mform->setType('id', PARAM_INT);

        $mform->addElement('hidden', 'action', 'saveandclose');
        $mform->setType('action', PARAM_TEXT);

        foreach (['yml', 'html', 'css', 'json', 'partials'] as $type) {
            $mform->addElement('textarea', "widget_$type", '', ['class' => 'd-none', 'id' => "id_widget_$type"]);
            $mform->setType("widget_$type", PARAM_RAW);
        }

        // Add buttons bar.
        // Open the sticky wrapper.
        $mform->addElement('html', '<div class="fixed-bottom bg-white border-top p-3 shadow-lg d-flex align-items-center">');

        // Left Spacer.
        $mform->addElement('html', '<div class="flex-fill" style="flex-basis: 0;"></div>');

        // Center Group (Save/Cancel).
        $mform->addElement('html', '<div class="d-flex justify-content-center">');

        // Save Button.
        $savebtn = $mform->createElement(
            'submit',
            'save',
            get_string('save', 'core'),
            ['class' => 'mx-1 btn btn-primary']
        );
        $mform->addElement('html', $savebtn->toHtml());

        // Save and Close.
        $saveclosebtn = $mform->createElement(
            'submit',
            'saveandclose',
            get_string('saveandclose', 'tiny_widgethub'),
            ['class' => 'mx-1 btn btn-secondary']
        );
        $mform->addElement('html', $saveclosebtn->toHtml());

        // Cancel - Use the native element but render its HTML directly.
        $cancelbtn = $mform->createElement(
            'cancel',
            'cancel',
            get_string('cancel', 'core'),
            ['class' => 'mx-1 btn btn-outline-secondary']
        );
        $mform->addElement('html', $cancelbtn->toHtml());

        $mform->addElement('html', '</div>');

        // Close Wrapper.
        $mform->addElement('html', '</div>');
    }
}
