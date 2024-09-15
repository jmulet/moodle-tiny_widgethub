/**
 * @jest-environment jsdom
 */
require('./module.mocks')(jest);

let LOCAL = {};
const localStorageMock = {
    getItem: jest.fn().mockImplementation(
        // @ts-ignore
        (key) => LOCAL[key]),
    // @ts-ignore
    setItem: jest.fn().mockImplementation((key, value)=>LOCAL[key]=value),
    clear: jest.fn().mockImplementation(() => LOCAL={})
};
let SESSION = {};
const sessionStorageMock = {
    // @ts-ignore
    getItem: jest.fn().mockImplementation((key)=>SESSION[key]),
    // @ts-ignore
    setItem: jest.fn().mockImplementation((key, value)=>SESSION[key]=value),
    // @ts-ignore
    clear: jest.fn().mockImplementation(SESSION={})
};
const window = {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
}
// @ts-ignore
global.window = window;

const { UserStorage } = require("../src/util");

describe("User storage tests", ()=> {
    it("Get empty storage", ()=>{
        const st = UserStorage.getInstance(31, 5);
        expect(st).not.toBe(null);
        const st2 = UserStorage.getInstance(31, 5);
        expect(st).toBe(st2);
        expect(st2.getFromLocal("searchtext", "b")).toBe("b");
        expect(st2.getFromSession("notfound", "a")).toBe("a");
        st2.setToLocal("searchtext", "capses");
        expect(st2.getFromLocal("searchtext", "")).toBe("capses");
    });

    it("Add to local store", ()=>{
        const st = UserStorage.getInstance(31, 5);
        expect(st).not.toBe(null);
        st.setToLocal("searchtext", "capses");
        st.setToLocal("anumber", 5);
        st.setToLocal("abool", true);
        st.setToLocal("anobj", {a:1, b:"post", c: false});
        expect(st.getFromLocal("searchtext", "")).toBe("capses");
        expect(st.getFromLocal("anumber", 0)).toBe(5);
        expect(st.getFromLocal("abool", false)).toBe(true);
        expect(st.getFromLocal("anobj", {})).toEqual({a:1, b:"post", c: false});
    });
});
