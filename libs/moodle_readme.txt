===========================================
WidgetHub - Third-Party Library Information
===========================================

The WidgetHub plugin relies on several third-party libraries to enhance its functionality.

JS-YAML
=======

Widgets are presented to administrators in YAML syntax, but for optimization purposes, 
they are stored internally in JSON format. A client-side library is required to convert 
between these two formats.

Repository: https://github.com/nodeca/js-yaml
Version: 4.1.0

Instructions:
Download the file from:
https://github.com/nodeca/js-yaml/blob/master/dist/js-yaml.mjs

Rename it to js_yaml-lazy.js and move it to the directory amd/src/libs.

Add the following lines to the top of the file to disable linting errors:

```
// @ts-nocheck  
/* eslint-disable */  
```

EJS
===

Moodle uses Mustache as a rendering template system, available on both server and client sides.
While Mustache is designed to be logic-less, it has limitations with loops, math operations, 
and conditionals. To overcome these limitations, an optional rendering system called EJS has
been adopted. Although it can be more verbose, EJS offers greater flexibility since it can execute
arbritry javascript code. The widget designers have freedom to decide which template engine to choose.

Repository: https://github.com/mde/ejs/lib
Version: 3.1.10

Instructions:
The two files in the repository have been concatenated and refactored to mock path and fs requires.
The resulting file has been moved to amd/src/libs and renamed to ejs-lazy.ejs.


CODEMIRROR
==========

This plugin uses CodeMirror as the visual editor for editing the YAML definitions of widgets.

To generate the dependency on CodeMirror (version 6), use Rollup to convert the ES6 modules 
provided by the library into a UMD bundle. This process creates a wrapper around the CodeMirror
editor that is imported by the plugin.

Run the following steps:

`cd codemirror6`

Install the npm dependencies:

`npm install`  

Run the job defined in the rollup.config.js file:

`npm run build`  

If everything runs smoothly, the file amd/src/libs/ymleditor-lazy.js will be generated.

Open this file and ensure the following lines are added at the top:

/** @ts-ignore */  
/* eslint-disable */ 

This is a workaround for an issue that appears when using RequireJS in Moodle 4.1.2.

Search for define([ in the file and make the following replacement:

```
const defaultHighlightStyle = /*@__PURE__*/HighlightStyle.define([
```


make sure that is not present and it has been change it to:

```
const HighlightStyleDefs = HighlightStyle.define;  
const defaultHighlightStyle = /*@__PURE__*/HighlightStyleDefs([
```



After modifying any of the libraries, compile them using the command:

`npx grunt amd`

The resulting minified version (in amd/build) of every file will be lazy-loaded on demand 
when needed.