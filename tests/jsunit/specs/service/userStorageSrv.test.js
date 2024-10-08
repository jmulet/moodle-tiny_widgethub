import { UserStorageSrv } from "../../src/service/userStorageSrv";

/** @type {*} */
const mockEditorOptions = {
    userId: 1,
    courseId: 50
};

/** @type {import('../../src/service/userStorageSrv').UserStorageSrv} */
let userStorageSrv;
/** @type{*} */
let mockStorage;

describe("UserStorageSrv", () => {
    beforeEach(() => {
        /** @type {Record<string, *>} */
        let LOCAL = {};
        /** @type {Record<string, *>} */
        let SESSION = {};
        const localStorageMock = {
            getItem: jest.fn().mockImplementation(
                (key) => LOCAL[key]),
            setItem: jest.fn().mockImplementation((key, value)=>LOCAL[key]=value),
            clear: jest.fn().mockImplementation(() => LOCAL={})
        };
        
        const sessionStorageMock = {
            getItem: jest.fn().mockImplementation((key)=>SESSION[key]),
            setItem: jest.fn().mockImplementation((key, value)=>SESSION[key]=value),
            clear: jest.fn().mockImplementation(() => SESSION={})
        };

        mockStorage = {
            localStorage: localStorageMock,
            sessionStorage: sessionStorageMock
        };

        userStorageSrv = new UserStorageSrv(mockEditorOptions, mockStorage);
    });

    it("Work with an empty storage", () => {
        expect(userStorageSrv.getFromLocal("searchtext", "b")).toBe("b");
        expect(userStorageSrv.getFromSession("notfound", "a")).toBe("a");
        userStorageSrv.setToLocal("searchtext", "capses");
        expect(userStorageSrv.getFromLocal("searchtext", "")).toBe("capses");
    });

    it("Saves the store", () => {
        userStorageSrv.saveStore();
        expect(mockStorage.localStorage.setItem).toHaveBeenCalled();
        expect(mockStorage.sessionStorage.setItem).toHaveBeenCalled();
    });

    it("Work with local store", ()=>{
        userStorageSrv.setToLocal("searchtext", "capses");
        userStorageSrv.setToLocal("anumber", 5);
        userStorageSrv.setToLocal("abool", true);
        userStorageSrv.setToLocal("anobj", {a:1, b:"post", c: false});
        expect(userStorageSrv.getFromLocal("searchtext", "")).toBe("capses");
        expect(userStorageSrv.getFromLocal("anumber", 0)).toBe(5);
        expect(userStorageSrv.getFromLocal("abool", false)).toBe(true);
        expect(userStorageSrv.getFromLocal("anobj", {})).toEqual({a:1, b:"post", c: false});
        expect(mockStorage.localStorage.setItem).not.toHaveBeenCalled();
        expect(mockStorage.sessionStorage.setItem).not.toHaveBeenCalled();
        userStorageSrv.setToLocal("anobj", {a:5, b:"post", c: false}, true);
        expect(mockStorage.localStorage.setItem).toHaveBeenCalled();
        expect(mockStorage.sessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("Work with session store", ()=> {
        userStorageSrv.setToSession("searchtext", "boxes");
        userStorageSrv.setToSession("anumber", 5);
        userStorageSrv.setToSession("abool", true);
        userStorageSrv.setToSession("anobj", {a:1, b:"post", c: false});
        expect(userStorageSrv.getFromSession("searchtext", "")).toBe("boxes");
        expect(userStorageSrv.getFromSession("anumber", 0)).toBe(5);
        expect(userStorageSrv.getFromSession("abool", false)).toBe(true);
        expect(userStorageSrv.getFromSession("anobj", {})).toEqual({a:1, b:"post", c: false});
    });


})