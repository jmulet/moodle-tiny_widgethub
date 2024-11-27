// Mock virtual modules
require('./module.mocks')(jest);

const cfg = require('../src/configuration');

describe('Configuration', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Adds widgethub to the configuration', () => {
        const instanceConfig = {
            menu: {
                file: {
                    items: 'open'
                },
                insert: {                    
                    items: 'image link h5p'
                },
            },
            toolbar: [
                {
                    name: 'file',
                    items: ['open']
                },
                {
                    name: 'content',
                    items: ['image']
                },
            ],
            contextmenu: 'bold image'
        };
        const instanceConfig2 = cfg.configure(instanceConfig);
        
        // Assert that the configuration has been added
        expect(instanceConfig2.menu.insert.items).toContain('tiny_widgethub');
        expect(instanceConfig2.toolbar.filter((/** @type {*} */ e) => e.name==='content')[0].items).toContain('tiny_widgethub');
        expect(instanceConfig2.contextmenu).toBe('bold image tiny_widgethub');
    });

});