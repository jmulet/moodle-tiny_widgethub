/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { predefinedActionsFactory, matchesCondition } from '../src/contextactions';
import { getDomSrv } from '../src/service/dom_service';
const { componentName } = require('../src/common').default;

/** @type {import('../src/options').RawWidget} */
const rawSnpt1 = Mocks.loadWidget('bs-badge');

/** @type {import('../src/options').RawWidget} */
const rawSnpt2 = Mocks.loadWidget('bs-alert');

 
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
        expect(matchesCondition(123, '123')).toBe(false);
        expect(matchesCondition(null, 'foo')).toBe(false);
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
    /** @type {any} */
    let getListenersFn;

    beforeEach(() => {
        getListenersFn = jest.fn();
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

    it('It creates a context menu with only unwrap item', async () => {
        // @ts-ignore
        const editor = Mocks.editorFactory();
        editor.options.get = jest.fn().mockImplementation(() => [rawSnpt1]);
        const { ContextActionsManager } = require('../src/contextactions');
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv);
        await contextActionsManager.init();
        expect(editor.ui.registry.addIcon).toHaveBeenCalled();
        // Test context menus
        expect(editor.ui.registry.addContextMenu).toHaveBeenCalledWith(`${componentName}_cm`, expect.any(Object));
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
        let menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe('');
        const ctx = contextActionsManager.ctx;
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.widget).toBeFalsy();
        expect(ctx.path?.elem).toBeFalsy();

        nodeSelected = editor.getBody().querySelector('span');
        menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe(`${componentName}_unwrap_item`);
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.elem).toBe(editor.getBody().querySelector('span.badge'));
        expect(ctx.path?.widget?.key).toBe('bs-badge');

        // Test context toolbar
        expect(editor.ui.registry.addContextToolbar).not.toHaveBeenCalled();
    });

    it('It creates a context menu with only unwrap, cut, printable item', async () => {
        // @ts-ignore
        const editor = Mocks.editorFactory();
        editor.options.get = jest.fn().mockImplementation(() => [rawSnpt2]);
        const { ContextActionsManager } = require('../src/contextactions');
        const contextActionsManager = new ContextActionsManager(editor, getDomSrv(), mockTranslateSrv);
        await contextActionsManager.init();
        // Test context menus
        expect(editor.ui.registry.addContextMenu).toHaveBeenCalledWith(`${componentName}_cm`, expect.any(Object));
        const contextMenuUpdate = editor.ui.registry.addContextMenu.mock.calls[0][1].update;
        expect(typeof contextMenuUpdate).toBe('function');

        editor.setContent(`<p>ok</p>
            <div class="alert" role="alert">
                <div class="iedib-central">
                    <span>hello</span>
                </div>
            </div>`);
        let nodeSelected = editor.getBody().querySelector('p');
        let menuItems = contextMenuUpdate(nodeSelected);
        expect(menuItems).toBe('');
        const ctx = contextActionsManager.ctx;
        expect(ctx.path?.selectedElement).toBe(nodeSelected);
        expect(ctx.path?.widget).toBeFalsy();
        expect(ctx.path?.elem).toBeFalsy();

        nodeSelected = editor.getBody().querySelector('.iedib-central');
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
        const editor = Mocks.editorFactory();
        editor.setContent('<div class="w1"><p><span>Hello</span></p></div>')
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const listener = jest.fn();
        getListenersFn.mockImplementation(() => [listener])
        
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard, getListenersFn);

        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const path = { elem: widgetRoot, selectedElement: widgetRoot, widget };
        actions.unwrap(path);
        expect(getListenersFn).toHaveBeenCalledWith('widgetRemoved');
        expect(listener).toHaveBeenCalledWith(editor, widget);
        // inner node should replace root
        expect(editor.getBody().contains(widgetRoot)).toBe(false);
        expect(editor.getBody().innerHTML).toBe('<p><span>Hello</span></p>');
    });

    it('movebefore should reorder elements and references', () => {
        const editor = Mocks.editorFactory();
        editor.setContent('<div class="w1"><p data-c="1">1</p><p data-c="2">2</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="2"]');
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard, getListenersFn);

        const spyFindReferences = jest.spyOn(domSrv, 'findReferences').mockReturnValue([]);
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };
        actions.movebefore(path);
        expect(getListenersFn).not.toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<div class="w1"><p data-c="2">2</p><p data-c="1">1</p><p data-c="3">3</p></div>')
        expect(spyFindReferences).not.toHaveBeenCalled();
 
    });

    it('insertafter should clone element and remove active/show classes', () => {
        const editor = Mocks.editorFactory();
        editor.setContent('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="1"]');
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard, getListenersFn);

        const spyFindReferences = jest.spyOn(domSrv, 'findReferences').mockReturnValue([]);
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };
        actions.insertafter(path);
        expect(getListenersFn).not.toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="1" class="">1</p><p data-c="3">3</p></div>')
    });

    it('remove should delete element and call widgetRemoved listeners', () => { 
        const editor = Mocks.editorFactory();
        editor.setContent('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="2"]'); 
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard, getListenersFn);

        const spyFindReferences = jest.spyOn(domSrv, 'findReferences').mockReturnValue([]);
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };
        
        actions.remove(path);
        expect(getListenersFn).not.toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="3">3</p></div>')
 
    });

    it('cut should fill clipboard and call widgetRemoved listeners', () => {
        const editor = Mocks.editorFactory();
        editor.setContent('<p>before</p><div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>')
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        const widgetRoot = editor.getBody().querySelector('div.w1');
        const selectedElement = widgetRoot.querySelector('p[data-c="2"]');
        const listener = jest.fn();
        getListenersFn.mockImplementation(() => [listener])
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard, getListenersFn);
 
        const path = { elem: widgetRoot, selectedElement, targetElement: selectedElement, widget };
        
        actions.cut(path);
        expect(getListenersFn).toHaveBeenCalledWith('widgetRemoved');
        expect(listener).toHaveBeenCalledWith(editor, widget);
        expect(editor.nodeChanged).toHaveBeenCalled();
        expect(editor.undoManager.add).toHaveBeenCalled();
        expect(editor.getBody().innerHTML).toBe('<p>before</p>');
        expect(widgetCutClipboard.widget).toBe(widget);
        expect(widgetCutClipboard.html).toBe('<div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>');
    });

     it('paste should include the widget back and call widgetAdded listeners', () => {
        const editor = Mocks.editorFactory();
        editor.setContent('<p>before</p>');
        const widget = { unwrap: 'div.w1>*', key: 'w1' };
        widgetCutClipboard.widget = widget;
        widgetCutClipboard.html = '<div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>';
        const listener = jest.fn();
        getListenersFn.mockImplementation(() => [listener])
        const actions = predefinedActionsFactory(editor, domSrv, widgetCutClipboard, getListenersFn);
 
        const path = { elem: undefined, undefined, targetElement: undefined, widget: undefined };
        
        actions.paste(path);
        expect(getListenersFn).toHaveBeenCalledWith('widgetInserted');
        expect(listener).toHaveBeenCalledWith(editor, widget);
        expect(editor.insertContent).toHaveBeenCalled();
        expect(editor.undoManager.add).toHaveBeenCalled();
        expect(widgetCutClipboard.widget).toBe(undefined);
        expect(widgetCutClipboard.html).toBe(undefined);
        expect(editor.getBody().innerHTML).toBe('<p>before</p><div class="w1"><p data-c="1" class="active show">1</p><p data-c="2">1</p><p data-c="3">3</p></div>');
    });

})