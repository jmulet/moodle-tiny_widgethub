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
 * @package     local_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Micro-Bootstrap (The "Optimized" Moodle Load).
define('ABORT_AFTER_CONFIG', true);  // Stop Moodle immediately after config.php.
define('NO_DEBUG_DISPLAY', true);    // Silence errors.
require_once(__DIR__ . '/../../../../../config.php');

// The Most Robust Path Parser (No assumptions on $_SERVER).
$rawpath = $_SERVER['PATH_INFO'] ?? '';

// Fallback for servers that don't support PATH_INFO (e.g. some CGI/FastCGI).
if (empty($rawpath) && isset($_SERVER['REQUEST_URI'])) {
    $scriptname = $_SERVER['SCRIPT_NAME'];
    // Get everything after the script name.
    $pos = strpos($_SERVER['REQUEST_URI'], $scriptname);
    if ($pos !== false) {
        $rawpath = substr($_SERVER['REQUEST_URI'], $pos + strlen($scriptname));
        // Strip query string if present.
        $rawpath = explode('?', $rawpath)[0];
    }
}

$args = explode('/', trim($rawpath, '/'));

// Validation & Strict Security.
if (count($args) < 3) {
    header("HTTP/1.1 400 Bad Request");
    die('Invalid path');
}

// Whitelist and Sanitization.
$type = $args[0];
$rev  = preg_replace('/[^0-9]/', '', $args[1]) ?? 1;
$name = preg_replace('/[^a-zA-Z0-9_\-]/', '', $args[2]) ?? 'bundle';

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
