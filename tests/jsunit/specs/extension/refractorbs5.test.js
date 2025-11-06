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
/** @type {any} */
const { getGlobalConfig } = require('../../src/options');

describe('bs5Refractor', () => {
  /** @type {any} */
  let editor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    editor = Mocks.editorFactory();
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

describe('refractoring', () => {
  /** @type {any} */
  let editor;
  /** @type {{get_string: any}} */
  let {get_string} = require('core/str');
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    editor = Mocks.editorFactory();
    editor.setContent('<div data-toggle="modal" data-target="#myModal"></div>');
  });

  it('should do nothing if refractor is inactive', async () => {
    // @ts-ignore
    getGlobalConfig.mockReturnValue('0');

    await refractor.refractoring(editor);

    expect(editor.notificationManager.open).not.toHaveBeenCalled();
  });

  it('should call bs5Refractor and show notification if changes occur', async () => {
    // @ts-ignore
    getGlobalConfig.mockReturnValue('1');
    // @ts-ignore
    get_string.mockResolvedValue('Save required');

    await refractor.refractoring(editor);

    expect(get_string).toHaveBeenCalledWith('saverequired', expect.any(String));
    expect(editor.notificationManager.open).toHaveBeenCalledWith({
      text: 'Save required',
      type: 'warning',
      timeout: 4000,
    });

    
    // @ts-ignore
    get_string.mockReset();
    editor.notificationManager.open.mockReset();

    editor.setContent('<p>nothing to change</p>');
    await refractor.refractoring(editor);

    expect(get_string).not.toHaveBeenCalled();
    expect(editor.notificationManager.open).not.toHaveBeenCalled();
  });

});

