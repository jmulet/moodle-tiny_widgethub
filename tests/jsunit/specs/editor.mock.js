module.exports = function(editorId=1, userInfo={id:1, username: 'joe', roles: ['student']}, selection="") {
    return {
        id: editorId, 
        selection: {
            getContent: jest.fn().mockImplementation(() => selection),
            setContent: jest.fn()
        },
        options: {
            get: jest.fn().mockImplementation(() => userInfo),
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