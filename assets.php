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

/**
 * Optimized assets loader for Local WidgetHub.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Micro-Bootstrap (The "Optimized" Moodle Load).
define('NO_DEBUG_DISPLAY', true);
define('ABORT_AFTER_CONFIG', true);
require_once(__DIR__ . '/../../../../../config.php');
require_once("$CFG->dirroot/lib/jslib.php"); // Provides min_ functions.

$slashargument = min_get_slash_argument();

if ($slashargument) {
    $slashargument = ltrim($slashargument, '/');
    $args = explode('/', $slashargument, 3);
} else {
    // Fallback if slash arguments are disabled in Site Admin > Server > HTTP.
    $args = [
        min_optional_param('type', '', 'SAFEDIR'),
        min_optional_param('rev', 1, 'INT'),
        min_optional_param('name', 'bundle', 'SAFEDIR'),
    ];
}

if (count($args) < 3 || empty($args[0])) {
    header("HTTP/1.1 404 Not Found");
    die('Invalid path');
}

$type = min_clean_param($args[0], 'SAFEDIR');
$rev  = min_clean_param($args[1], 'INT');
$name = min_clean_param($args[2], 'SAFEDIR');

// Verification.
if ($rev < -1 || empty($name)) {
    header("HTTP/1.1 400 Bad Request");
    die('Security violation');
}

// Performance Headers & Security.
if ($type === 'css') {
    $mimetype = 'text/css';
} else if ($type === 'js') {
    $mimetype = 'application/javascript';
} else if ($type === 'html') {
    $mimetype = 'text/html';
} else {
    header("HTTP/1.1 400 Bad Request");
    die('Invalid type');
}

header("Content-Type: {$mimetype}; charset=utf-8");
header("X-Content-Type-Options: nosniff");
$expires = 31536000; // 1 Year.
header("Cache-Control: public, max-age=$expires, immutable");
header("Expires: " . gmdate("D, d M Y H:i:s", time() + $expires) . " GMT");

// Dynamic content from cache.
$cachefile = __DIR__ . '/libs/' . $type . '/' . $name . '.' . $type;

if (file_exists($cachefile)) {
    // Check ETag for 304 Not Modified.
    $mtime = filemtime($cachefile);
    $etag = '"' . $mtime . '-' . md5($cachefile) . '"';
    header("ETag: $etag");

    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        header("HTTP/1.1 304 Not Modified");
        die;
    }

    readfile($cachefile);
    die;
}
header("HTTP/1.1 404 Not Found");
die('Static asset not found');
