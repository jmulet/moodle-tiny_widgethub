/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
jest.mock('../../src/options', () => ({
  getGlobalConfig: jest.fn(),
}));
jest.mock('../../src/extension', () => ({
  subscribe: jest.fn(),
}));

const refractor = require('../../src/extension/refractorbs5');

describe('bs5Refractor', () => {
  /** @type {any} */
  let editor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    editor = global.Mocks.editorFactory();
    editor.setContent('<div data-toggle="modal" data-target="#myModal"></div>');
  });

  it('should update data attributes from bs4 to bs5', () => {
    const result = refractor.bs5Refractor(editor);

    expect(result).toBe(true);

    /** @type {HTMLElement} */
    const element = editor.getBody().querySelector('div');
    expect(element.getAttribute('data-bs-toggle')).toBe('modal');
    expect(element.getAttribute('data-bs-target')).toBe('#myModal');
  });

  it('should return false if no changes are needed', () => {
    editor.setContent('<div data-toggle="modal" data-bs-toggle="modal" data-target="#myModal" data-bs-target="#myModal"></div>');
   
    const result = refractor.bs5Refractor(editor);

    expect(result).toBe(false);
  });
});
