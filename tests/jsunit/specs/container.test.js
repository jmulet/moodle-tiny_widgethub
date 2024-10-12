import { DIContainer } from "../src/container";

describe("DIContainer", () => {
    beforeEach(() => {
        DIContainer.clear();
    });

    it("Can acccess singleton from static context", () => {
        DIContainer.registerSingleton("cte", 12345);
        expect(DIContainer.get("cte")).toBe(12345);
    });

    it("Can acccess multiple singleton from static context", () => {
        DIContainer.registerSingleton("cte", 12345);
        DIContainer.registerSingleton("foo", "bar");
        expect(DIContainer.get("cte, foo")).toStrictEqual([12345, "bar"]);
    });

    it("Can acccess singleton from static context with dependencies", () => {
        DIContainer.registerSingleton("cte", 12345);
        DIContainer.registerSingleton("fun", (/** @type {number} */ cte) => cte + 1, "cte");
        class Cls {
            /**
             * @param {*} cte 
             * @param {*} fun 
             */
            constructor(cte, fun) {
                this.cte = cte;
                this.fun = fun;
            }
            print() {
                return this.cte + "---" + this.fun;
            }
        }
        DIContainer.registerSingleton("cls", Cls, "cte, fun");
        expect(DIContainer.get("cte")).toBe(12345);
        expect(DIContainer.get("fun")).toBe(12346);
        expect(DIContainer.get("cls")).toBeTruthy();
        expect(DIContainer.get("cls").print()).toBe("12345---12346");
    });

    it("Throw error on missing registry", () => {
        expect(() => DIContainer.get("unk")).toThrow(`Cannot find a registry for dependency unk`);
        DIContainer.registerSingleton("fun", (/** @type {number} */ cte) => cte + 1, "cte");
        expect(() => DIContainer.get("fun")).toThrow(`Cannot find a registry for dependency cte`);        
    });

    it("Breaks circular dependency", () => {
        DIContainer.registerSingleton("fun1", (/** @type {Function} */ f2) => ((/** @type {number} */ x) => f2(x) + 1), "fun2");
        DIContainer.registerSingleton("fun2", (/** @type {Function} */ f3) => ((/** @type {number} */ x) => f3(x) * 2), "fun3");
        DIContainer.registerSingleton("fun3", (/** @type {Function} */ f1) => ((/** @type {number} */ x) => f1(x) / 3), "fun1");
        expect(() => DIContainer.get("fun1")).toThrow(`Circular dependency detected on fun1`);     
    });

    it("It should not detect circular dependency", () => {
        DIContainer.registerSingleton("fun1", () => ((/** @type {number} */ x) => x + 1));
        DIContainer.registerSingleton("fun2", (/** @type {Function} */ f1) => ((/** @type {number} */ x) => f1(x) * 2), "fun3");
        DIContainer.registerSingleton("fun3", (/** @type {Function} */ f1, /** @type {Function} */ f2) => ((/** @type {number} */ x) => f1(f2(x)) / 3), "fun1, fun2");
        expect(() => DIContainer.get("fun3")).not.toThrow(expect.any(String));     
    });

    it("It cannot access to a service from a static context", () => {
        class Cls {
            /** 
             * @param {number} cte 
            */
            constructor(cte) {
                this.cte = cte;
            }
            increment() {
                return this.cte + 1;
            }
        }
        DIContainer.registerSingleton("cte", 1000);
        DIContainer.registerService("cls", Cls, "cte");
        expect(() => DIContainer.get("cls")).toThrow('Non singleton dependency cls must be invoked from an instance of the container.');
    });

    it("Can init and access to a container instance", () => {
        const editor = {id: 123};
        const container = DIContainer.init(editor);
        expect(container.get("editor")).toStrictEqual(editor);
        const container2 = DIContainer.init(editor);
        expect(Object.is(container, container2)).toBe(true);
        expect(container2.get("editor")).toStrictEqual(editor);
    });

    it("Fails to find dependency from a container instance", () => {
        const editor = {id: 123};
        const container = DIContainer.init(editor);
        expect(() => container.get("cte")).toThrow(`Cannot find a registry for dependency cte`);
    });

    it("Can access singleton from a container instance", () => {
        const obj = {v: 12345};
        DIContainer.registerSingleton("cte", obj);
        const editor = {id: 123};
        const container = DIContainer.init(editor);
        const found1 = container.get("cte");
        const found2 = container.get("cte");
        expect(found1).toStrictEqual(obj);
        expect(Object.is(found1, found2)).toBe(true);
    });

    it("Can acccess multiple singleton from a container instance", () => {
        DIContainer.registerSingleton("cte", 12345);
        DIContainer.registerSingleton("foo", "bar");
        const editor = {id: 123};
        const container = DIContainer.init(editor);
        expect(container.get("cte, foo")).toStrictEqual([12345, "bar"]);
    });

    it("Resolves service dependencies from a container instance", () => {
        DIContainer.registerSingleton("cte", 12345);
        class Cls {
            /** 
             * @param {number} cte 
             * @param {{id: number}} editor
            */
            constructor(cte, editor) {
                this.cte = cte;
                this.editor = editor;
            }
            add() {
                return this.cte + this.editor.id;
            }
        }
        DIContainer.registerService("srv", Cls, "cte, editor");
        const editor = {id: 123};
        const container = DIContainer.init(editor);
        expect(container.get("srv").add()).toStrictEqual(12468);
    });

    it("Resolves factory (type class) dependencies from a container instance", () => {
        DIContainer.registerSingleton("cte", 12345);
        class Cls {
            /** 
             * @param {number} cte 
             * @param {{id: number}} editor
             * @param {number} param
            */
            constructor(cte, editor, param) {
                this.cte = cte;
                this.editor = editor;
                this.param = param;
            }
            op() {
                return this.param * (this.cte + this.editor.id);
            }
        }
        DIContainer.registerFactory("srv", Cls, "cte, editor");
        const editor = {id: 123};
        const container = DIContainer.init(editor);
        const factory = container.get("srv");
        expect(factory).toBeTruthy();
        expect(typeof factory).toBe("function");
        expect(factory.prototype?.constructor).toBe(undefined);
        expect(factory(0).op()).toBe(0);
        expect(factory(1).op()).toBe(12345+123);
        expect(factory(-2).op()).toBe(-2*(12345+123));
    });

    it("Resolves factory (type function) dependencies from a container instance", () => {
        DIContainer.registerSingleton("cte", 12345);
        /** 
         * @param {number} cte 
         * @param {{id: number}} editor
         * @param {number} param
         */
        function Cls(cte, editor, param) {
            return param * (cte + editor.id);             
        }
        DIContainer.registerFactory("fact", Cls, "cte, editor");
        const editor = {id: 123};
        const container = DIContainer.init(editor);
        const factory = container.get("fact");
        expect(factory).toBeTruthy();
        expect(typeof factory).toBe("function");
        expect(factory.prototype?.constructor).toBe(undefined);
        expect(factory(0)).toBe(0);
        expect(factory(1)).toBe(12345+123);
        expect(factory(-2)).toBe(-2*(12345+123));
    });

    it("Detect circular dependency from a container instance", () => {
        DIContainer.registerSingleton("cte", 12345);
        DIContainer.registerSingleton("fun1", (/** @type {Function} */ f2) => ((/** @type {number} */ x) => f2(x) + 1), "fun2");
        DIContainer.registerSingleton("fun2", (/** @type {Function} */ f3) => ((/** @type {number} */ x) => f3(x) * 2), "fun3");
        DIContainer.registerSingleton("fun3", (/** @type {Function} */ f1) => ((/** @type {number} */ x) => f1(x) / 3), "fun1");
        const ed = {id: 123};
        const container = DIContainer.init(ed);
        expect(() => container.get("fun1")).toThrow(`Circular dependency detected on fun1`);     
    });

    it("It should not detect circular dependency", () => {
        DIContainer.registerSingleton("fun1", () => ((/** @type {number} */ x) => x + 1));
        DIContainer.registerSingleton("fun2", (/** @type {Function} */ f1) => ((/** @type {number} */ x) => f1(x) * 2), "fun3");
        DIContainer.registerSingleton("fun3", (/** @type {Function} */ f1, /** @type {Function} */ f2) => ((/** @type {number} */ x) => f1(f2(x)) / 3), "fun1, fun2");
        const ed = {id: 123};
        const container = DIContainer.init(ed);
        expect(() => container.get("fun3")).not.toThrow(expect.any(String));     
    });
 
});