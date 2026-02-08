Building Libraries for AMD and Workers
=======================================

This folder contains the source code for the libraries used in the Tiny WidgetHub plugin, including
the CodeMirror editor and the Sandboxing environment (which uses Web Workers for rendering).

Pre-requisites
--------------
- Node.js and npm installed.
- Access to the internet to download external dependencies.

Build Steps
-----------

1. **Download the EJS browser version**
   The EJS library is used in a Web Worker and requires a specific browser-compatible minified version.
   Download an updated version from a CDN and place it in the workers source directory:
   
   ```bash
   curl -L https://cdn.jsdelivr.net/npm/ejs@3.1.10/ejs.min.js -o src/sandbox/workers/ejs.min.js
   ```

2. **Install Dependencies**
   From this directory (`libs`), run:
   
   ```bash
   npm install
   ```

3. **Build the Libraries**
   Run the build script to generate the AMD-compatible modules and minified worker scripts:
   
   ```bash
   npm run build
   ```

Outputs
-------
The build process generates files in the following locations:
- `../../amd/src/libs/`: AMD/ESM modules for Moodle (e.g., `cmeditor-lazy.js`, `yaml-lazy.js`).
- `../js/`: Minified scripts for the sandbox and workers (e.g., `render_sandbox.min.js`, `ejs_worker.min.js`).

Note for Developers
-------------------
If you modify any files in `src/`, you MUST run `npm run build` to update the files used by the Moodle plugin. 
After that, you need to run `npx grunt amd` to update the AMD modules and update `thirdpartylibs.xml` if needed.
