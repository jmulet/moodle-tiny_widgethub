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
jest.mock('core/str', () => ({
  get_string: jest.fn(),
}));

const refractor = require('../../src/extension/refractorbs5');
/** @type {any} */
const getGlobalConfig = require('../../src/options').getGlobalConfig;
/** @type {any} */
const coreStr = require('core/str');
const { component } = require('../../src/common').default;


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

describe('refractorListener', () => {
  /** @type {any} */
  let editor;
  /** @type {any} */
  let notificationManagerOpen;
  /** @type {any} */
  let setDirty;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    notificationManagerOpen = jest.fn();
    setDirty = jest.fn();
    editor = {
      ...global.Mocks.editorFactory(),
      notificationManager: {
        open: notificationManagerOpen
      },
      setDirty: setDirty,
      getBody: () => document.createElement('body')
    };
  });

  it('should not do anything if refractor is disabled', async () => {
    getGlobalConfig.mockReturnValue('0');

    await refractor.refractorListener(editor);

    expect(getGlobalConfig).toHaveBeenCalledWith(editor, 'oninit.refractor.bs5', '0');
    expect(notificationManagerOpen).not.toHaveBeenCalled();
    expect(setDirty).not.toHaveBeenCalled();
  });

  it('should run refractor and notify if changes are made', async () => {
    getGlobalConfig.mockReturnValue('1');

    const body = document.createElement('body');
    body.innerHTML = '<div data-toggle="modal"></div>';
    editor.getBody = () => body;

    coreStr.get_string.mockResolvedValue('Save required');

    await refractor.refractorListener(editor);

    expect(getGlobalConfig).toHaveBeenCalledWith(editor, 'oninit.refractor.bs5', '0');
    expect(coreStr.get_string).toHaveBeenCalledWith('saverequired', component);
    expect(notificationManagerOpen).toHaveBeenCalledWith({
      text: 'Save required',
      type: 'warning',
      timeout: 4000
    });
    expect(setDirty).toHaveBeenCalledWith(true);
  });

  it('should run refractor and NOT notify if NO changes are made', async () => {
    getGlobalConfig.mockReturnValue('1');

    const body = document.createElement('body');
    body.innerHTML = '<div></div>';
    editor.getBody = () => body;

    await refractor.refractorListener(editor);

    expect(notificationManagerOpen).not.toHaveBeenCalled();
    expect(setDirty).not.toHaveBeenCalled();
  });

  it('should catch exceptions', async () => {
    getGlobalConfig.mockImplementation(() => {
      throw new Error('Test error');
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

    await refractor.refractorListener(editor);

    expect(consoleError).toHaveBeenCalledWith("Error while applying bs5 refractor:", expect.any(Error));
    consoleError.mockRestore();
  });
});
