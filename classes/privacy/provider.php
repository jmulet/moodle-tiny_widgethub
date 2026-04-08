<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

namespace tiny_widgethub\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\metadata\provider as metadata_provider;
use core_privacy\local\request\user_preference_provider;
use core_privacy\local\request\writer;

/**
 * Local WidgetHub plugin privacy details.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements
    metadata_provider,
    user_preference_provider {
    /**
     * Returns metadata of this plugin.
     *
     * @param collection $collection The initialised metadata collection to add items to.
     * @return collection The collection after adding this plugin's items to it.
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_user_preference(
            'tiny_widgethub_userprefs',
            'privacy:metadata:userpreference:tiny_widgethub_userprefs'
        );
        return $collection;
    }

    /**
     * Get the user preferences for a user.
     *
     * @param int $userid The user ID.
     * @return void
     */
    public static function export_user_preferences(int $userid): void {
        $preference = get_user_preferences('tiny_widgethub_userprefs', null, $userid);
        if ($preference !== null) {
            $description = get_string('privacy:metadata:userpreference:tiny_widgethub_userprefs', 'tiny_widgethub');
            /** @var \context $context */
            $context = \context_system::instance();
            writer::with_context($context)
                ->export_user_preference(
                    'tiny_widgethub',
                    'tiny_widgethub_userprefs',
                    $preference,
                    $description
                );
        }
    }
}
