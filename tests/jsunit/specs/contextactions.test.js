/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
jest.mock('../src/controller/widgetproperties_ctrl', () => ({
    __esModule: true,
    getWidgetPropertiesCtrl: () => ({
        show: jest.fn().mockResolvedValue('')
    })
}));

jest.mock('../src/extension', () => ({
    __esModule: true,
    getListeners: jest.fn().mockReturnValue([]),
    getMenuItemProviders: jest.fn().mockReturnValue([])
}));

const getListeners = require('../src/extension').getListeners;

const { predefinedActionsFactory, matchesCondition, ContextActionsManager } = require('../src/contextactions');
const { getDomSrv } = require('../src/service/dom_service');
const { component, componentName } = require('../src/common').default;

/** @type {import('../src/options').RawWidget} */
const rawSnpt1 = global.Mocks.loadWidget('bs-badge');

/** @type {import('../src/options').RawWidget} */
const rawSnpt2 = global.Mocks.loadWidget('bs-alert');


describe('matchesCondition', () => {
    it('returns true if string condition includes value', () => {
        expect(matchesCondition('foo,bar,baz', 'bar')).toBe(true);
        expect(matchesCondition('foo, bar ,baz', 'bar')).toBe(true); // trims spaces
    });

    it('returns false if string condition does not include value', () => {
        expect(matchesCondition('foo,bar,baz', 'qux')).toBe(false);
    });

    it('returns true if RegExp matches value', () => {
        expect(matchesCondition(/foo/, 'foobar')).toBe(true);
        expect(matchesCondition(/^bar$/, 'bar')).toBe(true);
    });

    it('returns false if RegExp does not match value', () => {
        expect(matchesCondition(/foo/, 'baz')).toBe(false);
    });

    it('returns the function result if condition is a function', () => {
        expect(matchesCondition(() => true, 'anything')).toBe(true);
        expect(matchesCondition(() => false, 'anything')).toBe(false);
    });

    it('returns false if condition is undefined', () => {
        expect(matchesCondition(undefined, 'foo')).toBe(false);
    });

    it('returns false if condition is an unexpected type', () => {
        // @ts-ignore
        expect(matchesCondition(123, '123')).toBe(false);
        // @ts-ignore
        expect(matchesCondition(null, 'foo')).toBe(false);
        // @ts-ignore
        expect(matchesCondition([], 'foo')).toBe(false);
    });
});

describe('Context Actions Manager', () => {
    /** @type {any} */
    let mockTranslateSrv;
    /** @type {import('../src/service/dom_service').DomSrv} */
    let domSrv;
    /** @type {any} */
    let widgetCutClipboard;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        mockTranslateSrv = {
            get_strings: jest.fn().mockImplementation((/** @type {{key: string, component: string}[]} */ arg) => {
                return Promise.resolve(arg.map(e => e.key));
            })
        }
        domSrv = getDomSrv();
        widgetCutClipboard = { widget: undefined, html: undefined };
    });

    it('It creates a context menu with only modal and unwrap item', async () => {
        // @ts-ignore
        const editor = global.Mocks.editorFactory();
        editor.options.get = jest.fn().mockImplementation(() => [rawSnpt1]);
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv, widgetCutClipboard);
        await contextActionsManager.init();
        expect(editor.ui.registry.addIcon).toHaveBeenCalled();
        // Test context menus
        expect(editor.ui.registry.addContextMenu).toHaveBeenCalledWith(component, expect.any(Object));
        const contextMenuUpdate = editor.ui.registry.addContextMenu.mock.calls[0][1].update;
        expect(typeof contextMenuUpdate).toBe('function');

        editor.setContent(`<p>ok</p>
            <div class="someclass" role="somerole">
                <span class="badge badge-primary">This is a badge</span>
                <div class="iedib-central">
                    <span>hello</span>
                </div>
            </div>`);
        let nodeSelected = editor.getBody().querySelector('p');
        editor.selection.getNode = jest.fn().mockReturnValue(nodeSelected);
        let menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe('');
        const ctx = contextActionsManager.ctx;
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.widget).toBeFalsy();
        expect(ctx.path?.elem).toBeFalsy();

        nodeSelected = editor.getBody().querySelector('span');
        editor.selection.getNode = jest.fn().mockReturnValue(nodeSelected);
        menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toContain(`${componentName}_unwrap_item`);
        expect(menuItems).toContain(`${componentName}_modal_item`);
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.elem).toBe(editor.getBody().querySelector('span.badge'));
        expect(ctx.path?.widget?.key).toBe('bs-badge');

        // Test context toolbar
        expect(editor.ui.registry.addContextToolbar).not.toHaveBeenCalled();
    });

    it('It creates a context menu with only unwrap, cut, printable item', async () => {
        // @ts-ignore
        const editor = global.Mocks.editorFactory();
        editor.options.get = jest.fn().mockImplementation(() => [rawSnpt2]);
        const  {ContextActionsManager } = require('../src/contextactions');
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv, widgetCutClipboard);
        await contextActionsManager.init();
        // Test context menus
        expect(editor.ui.registry.addContextMenu).toHaveBeenCalledWith(component, expect.any(Object));
        const contextMenuUpdate = editor.ui.registry.addContextMenu.mock.calls[0][1].update;
        expect(typeof contextMenuUpdate).toBe('function');

        editor.setContent(`<p>ok</p>
            <div class="alert" role="alert">
                <div class="iedib-central">
                    <span>hello</span>
                </div>
            </div>`);
        let nodeSelected = editor.getBody().querySelector('p');
        editor.selection.getNode = jest.fn().mockReturnValue(nodeSelected);
        let menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe('');
        const ctx = contextActionsManager.ctx;
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.widget).toBeFalsy();
        expect(ctx.path?.elem).toBeFalsy();

        nodeSelected = editor.getBody().querySelector('.iedib-central');
        editor.selection.getNode = jest.fn().mockReturnValue(nodeSelected);
        menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toContain(`${componentName}_unwrap_item`);
        expect(menuItems).toContain(`${componentName}_printable_item`);
        expect(menuItems).toContain(`${componentName}_cut_item`);
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.elem).toBe(editor.getBody().querySelector('div[role="alert"]'));
        expect(ctx.path?.widget?.key).toBe('bs-alert');

        // Test context toolbar
        expect(editor.ui.registry.addContextToolbar).not.toHaveBeenCalled();
    });

    it('unwrap should replace element content or call widgetRemoved', () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<div class="w1"><p><span>Hello</span></p></div>')
        const widgetRoot = editor.getBody().querySelector('div.w1');

        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard);

        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const path = { elem: widgetRoot, selectedElement: widgetRoot, widget };
        actions.unwrap(path);
        // inner node should replace root
        expect(editor.getBody().contains(widgetRoot)).toBe(false);
        expect(editor.getBody().innerHTML).toBe('<p><span>Hello</span></p>');

        expect(getListeners).toHaveBeenCalledWith('widgetRemoved');
    });

    it('movebefore should reorder elements and references', () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<div class="w1"><p data-c="1">1</p><p data-c="2">2</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="2"]');
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard);

        const spyFindReferences = jest.spyOn(domSrv, 'findReferences').mockReturnValue([]);
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };
        actions.movebefore(path);
        expect(getListeners).not.toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<div class="w1"><p data-c="2">2</p><p data-c="1">1</p><p data-c="3">3</p></div>')
        expect(spyFindReferences).not.toHaveBeenCalled();

    });

    it('moveafter should reorder elements and references', () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<div class="w1"><p data-c="1">1</p><p data-c="2">2</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="2"]');
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard);

        const spyFindReferences = jest.spyOn(domSrv, 'findReferences').mockReturnValue([]);
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };
        actions.moveafter(path);
        expect(getListeners).not.toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<div class="w1"><p data-c="1">1</p><p data-c="3">3</p><p data-c="2">2</p></div>')
        expect(spyFindReferences).not.toHaveBeenCalled();

    });

    it('insertafter should clone element and remove active/show classes', () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="1"]');
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard);

        const spyFindReferences = jest.spyOn(domSrv, 'findReferences').mockReturnValue([]);
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };
        actions.insertafter(path);
        expect(getListeners).not.toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="1" class="">1</p><p data-c="3">3</p></div>')
    });

    it('remove should delete element and call widgetRemoved listeners', () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="2"]');
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard);

        const spyFindReferences = jest.spyOn(domSrv, 'findReferences').mockReturnValue([]);
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };

        actions.remove(path);
        expect(getListeners).not.toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="3">3</p></div>')

    });

    it('cut should fill clipboard and call widgetRemoved listeners', () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<p>before</p><div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="2"]');
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard);

        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };

        actions.cut(path);
        expect(editor.nodeChanged).toHaveBeenCalled();
        expect(editor.undoManager.add).toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<p>before</p>');
        expect(widgetCutClipboard.widget).toBe(widget);
        expect(widgetCutClipboard.html).toBe('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>');
    
        expect(getListeners).toHaveBeenCalledWith('widgetRemoved');
    });

    it('paste should include the widget back and call widgetAdded listeners', () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<p>before</p>');
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        widgetCutClipboard.widget = widget;
        widgetCutClipboard.html = '<div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>';
       const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard);

        const path = { elem: undefined, undefined, targetElement: undefined, widget: undefined };

        actions.paste(path);
        expect(getListeners).toHaveBeenCalledWith('widgetInserted');
        expect(editor.insertContent).toHaveBeenCalled();
        expect(editor.undoManager.add).toHaveBeenCalled();
        expect(widgetCutClipboard.widget).toBe(undefined);
        expect(widgetCutClipboard.html).toBe(undefined);
        expect(editor.getBody().innerHTML).toBe('<p>before</p><div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>');
    });

    it('showProperties action should identify the correct widget from selected editor node and open dialog', async () => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<div class="alert alert-danger" role="alert"><p data-c="1" class="active show">1</p></div>');
        const selection = editor.getBody().querySelector('[data-c="1"]');
        editor.options.get = jest.fn().mockImplementation(() => [rawSnpt2]);
        editor.selection.getNode = jest.fn().mockReturnValue(selection);
        const { getWidgetPropertiesCtrl } = require('../src/controller/widgetproperties_ctrl');
        const widgetPropertiesCtrl = getWidgetPropertiesCtrl(editor);
        const  {ContextActionsManager } = require('../src/contextactions');
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv, widgetCutClipboard);
        expect(contextActionsManager.ctx.path).toBeFalsy();

        await contextActionsManager.showPropertiesAction();
        expect(editor.selection.getNode).toHaveBeenCalled();
        expect(contextActionsManager.ctx.path).toBeTruthy();
        expect(contextActionsManager.ctx.path?.widget?.key).toBe(rawSnpt2.key);
        // expect(widgetPropertiesCtrl.show).toHaveBeenCalled();
    });


    it('Generic Action should return an action which determines path if not in current context. It should also call listeners.', async() => {
        const editor = global.Mocks.editorFactory();
        editor.setContent('<div class="alert alert-danger" role="alert"><p data-c="1" class="active show">1</p></div>');
        const selection = editor.getBody().querySelector('[data-c="1"]');
        editor.options.get = jest.fn().mockImplementation(() => [rawSnpt2]);
        editor.selection.getNode = jest.fn().mockReturnValue(selection);
        const  {ContextActionsManager } = require('../src/contextactions');
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv, widgetCutClipboard);
        await contextActionsManager.init();
        expect(contextActionsManager.ctx.path).toBeFalsy();
        const spyFindWidgetOnEventPath = jest.spyOn(domSrv, 'findWidgetOnEventPath');
        const action = contextActionsManager.genericAction('insertafter');
        expect(typeof action).toBe('function');

        // Call without any path
        action();
        expect(spyFindWidgetOnEventPath).toHaveBeenCalledTimes(1);
        const path = spyFindWidgetOnEventPath.mock.results[0].value;
        expect(path).toBeTruthy();
        expect(path.widget.key).toBe(rawSnpt2.key);
        expect(path.elem).toBe(editor.getBody().querySelector('.alert'));
        
        // Call without any path
        spyFindWidgetOnEventPath.mockClear();
        // @ts-ignore
        getListeners.mockClear();
        action(path);
        expect(spyFindWidgetOnEventPath).not.toHaveBeenCalled();
    });
})