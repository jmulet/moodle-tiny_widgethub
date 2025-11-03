import path from 'path';
import fs from 'fs';
import yaml from 'yaml';

/**
 * 
 * @param {'bs-alert' | 'bs-badge'} widgetName 
 * @returns {import('./src/options').RawWidget}
 */
function loadWidget(widgetName) {
  return yaml.parse(fs.readFileSync(path.resolve(`./mocks/data/${widgetName}.yml`), 'utf-8'));
}

/** @type {any} */
const editorFactory = require('./mocks/editor.mock');
/** @type {any} */
const modalSrv = require('./mocks/modal_service.mock');

global.Mocks = {
  loadWidget,
  editorFactory,
  modalSrv
}

// Mock virtual modules
require('./mocks/module.mocks')();
