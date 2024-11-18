module.exports = function(editorId=1, userId=1, selection="") {
    return {
        id: editorId, 
        selection: {
            getContent: jest.fn().mockImplementation(() => selection),
            setContent: jest.fn()
        },
        options: {
            get: jest.fn().mockImplementation(() => userId),
            register: jest.fn()
        },
        windowManager: {
            confirm: jest.fn()
        },
        notificationManager: {
            open: jest.fn(),
        },
        setDirty: jest.fn(),
        focus: jest.fn(),
        dom: {
            window
        },
        getContent: jest.fn(),
        setContent: jest.fn()
    }
};