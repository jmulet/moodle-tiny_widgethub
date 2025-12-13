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
 * @package     tiny_widgethub
 * @copyright   2024 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub;

defined('MOODLE_INTERNAL') || die();

require_once("$CFG->libdir/externallib.php");

class external extends \external_api {

    /**
     * Defineix els paràmetres d'entrada (els arguments que rebràs del JS).
     * @return \external_function_parameters
     */
    public static function delete_widgets_parameters() {
        return new \external_function_parameters([
            // Rebrem una llista d'IDs numèrics.
            'ids' => new \external_multiple_structure(
                new \external_value(PARAM_INT, 'Widget ID to delete')
            )
        ]);
    }

    /**
     * La funció que executa la lògica real.
     * @param array $ids List of widget IDs to delete.
     * @return array List of deleted widget IDs.
     */
    public static function delete_widgets($ids) {
        global $CFG;

        // 1. Validació de paràmetres.
        $params = self::validate_parameters(self::delete_widgets_parameters(), ['ids' => $ids]);
        
        // 2. Comprovacions de seguretat (Context i Permisos).
        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('moodle/site:config', $context); // Només admins

        // 3. Executar l'esborrat.
        $deletedids = \tiny_widgethub\settingsutil::delete_widgets($params['ids']);

        return [
            'ids' => $deletedids,
        ];
    }

    /**
     * Defineix què retorna la funció al JS.
     * @return \external_single_structure
     */
    public static function delete_widgets_returns() {
        return new \external_single_structure([
            'ids' => new \external_multiple_structure(
                new \external_value(PARAM_INT, 'Deleted widget ID')
            )
        ]);
    }
}