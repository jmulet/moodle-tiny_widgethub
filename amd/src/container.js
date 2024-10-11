/**
 * Determines if something is a class or not
 * @param {*} obj
 * @returns {boolean}
 */
function isClass(obj) {
    const isCtorClass = obj.constructor?.toString()?.substring(0, 5) === 'class';
    if (obj.prototype === undefined) {
        return isCtorClass;
    }
    const isPrototypeCtorClass = obj.prototype?.constructor?.toString()?.substring(0, 5) === 'class';
    return isCtorClass || isPrototypeCtorClass;
}

/**
 * Container for dependency injection
 * @typedef {{name: string, type: 'singleton' | 'service' | 'factory', obj: *, deps: string[]}} DIRegistryEntry
 */
export class DIContainer {
    static clear() {
        DIContainer.#containerInstances = new Map();
        DIContainer.#registry = new Map();
        DIContainer.#singletonInstances = new Map();
    }
    /**
     * @type {Map<import("./plugin").TinyMCE, DIContainer>}
     */
    static #containerInstances = new Map();
    /**
     * @type {Map<string, DIRegistryEntry>}
     */
    static #registry = new Map();
    /**
     * @type {Map<string, *>}
     */
    static #singletonInstances = new Map();
    /**
     * @type {Map<string, *>}
     */
    #serviceInstances = new Map();

    /**
     * @param {*} editor
     * @returns {DIContainer}
     */
    static init(editor) {
        // There should be an instance of the container for each editor in page
        let instance = DIContainer.#containerInstances.get(editor);
        if (!instance) {
            instance = new DIContainer();
            instance.registerInstance("editor", editor);
            DIContainer.#containerInstances.set(editor, instance);
        }
        return instance;
    }

    /**
     * @param {string=} dependencies
     * @returns {string[]}
     */
    static #parseDeps(dependencies) {
        if (!dependencies?.trim()) {
            return [];
        }
        return dependencies.split(',').map(e => e.trim());
    }

    /**
     * @param {string} name
     * @param {*} obj
     * @param {string=} dependencies
     */
    static registerSingleton(name, obj, dependencies) {
        this.#registry.set(name, {name, type: 'singleton', obj, deps: DIContainer.#parseDeps(dependencies)});
    }

    /**
     * @param {string} name
     * @param {*} obj
     * @param {string=} dependencies
     */
    static registerService(name, obj, dependencies) {
        this.#registry.set(name, {name, type: 'service', obj, deps: DIContainer.#parseDeps(dependencies)});
    }

    /**
     * @param {string} name
     * @param {*} obj
     * @param {string=} dependencies
     */
    static registerFactory(name, obj, dependencies) {
        this.#registry.set(name, {name, type: 'factory', obj, deps: DIContainer.#parseDeps(dependencies)});
    }

    /**
     * Register a instance in the container
     * @param {string} name
     * @param {*} obj
     */
    registerInstance(name, obj) {
        this.#serviceInstances.set(name, obj);
    }

    /**
     * Allow to retrieve singleton instances without having to instantiate the container
     * @param {string} name
     * @param {string[]=} path
     * @returns {*}
     */
    static get(name, path) {
        path = path || [];
        if (name.indexOf(",") > 0) {
            return name.split(",").map(e => DIContainer.get(e.trim(), path));
        }
        if (path.indexOf(name) >= 0) {
            throw new Error(`Circular dependency detected on ${name}`);
        }
        path.push(name);
        const reg = DIContainer.#registry.get(name);
        if (!reg) {
            throw new Error(`Cannot find a registry for dependency ${name}`);
        } else if (reg.type !== 'singleton') {
            throw new Error(`Non singleton dependency ${name} must be invoked from an instance of the container.`);
        }
        if (DIContainer.#singletonInstances.has(reg.name)) {
            return DIContainer.#singletonInstances.get(reg.name);
        }
        // Create an instance
        const deps = (reg.deps ?? []).map(name => DIContainer.get(name, path));
        let resolved;
        if (isClass(reg.obj)) {
            // Has to instantiate a class.
            resolved = new reg.obj(...deps);
        } else if (typeof (reg.obj) === 'function' && deps.length) {
            // Prevent from calling functions like jQuery if no dependencies are passed
            // Has to call the function.
            resolved = reg.obj(...deps);
        } else {
            resolved = reg.obj;
        }
        DIContainer.#singletonInstances.set(name, resolved);
        return resolved;
    }

    /**
     * @param {string} name
     * @param {string[]=} path
     * @returns {*} - An instance of the "name" in the correct scope
     */
    get(name, path) {
        path = path || [];
        if (name.indexOf(",") > 0) {
            return name.split(",").map(e => this.get(e.trim(), path));
        }
        if (path.indexOf(name) >= 0) {
            throw new Error(`Circular dependency detected on ${name}`);
        }
        path.push(name);
        // Check if already exists an instance with this name.
        if (this.#serviceInstances.has(name)) {
            return this.#serviceInstances.get(name);
        }
        const reg = DIContainer.#registry.get(name);
        if (!reg) {
            throw new Error(`Cannot find a registry for dependency ${name}`);
        }
        switch (reg.type) {
            case ('singleton'): return this.#getInstance(DIContainer.#singletonInstances, reg, path);
            case ('service'): return this.#getInstance(this.#serviceInstances, reg, path);
            case ('factory'): {
                const deps = (reg.deps ?? []).map(name => this.get(name, path));
                if (isClass(reg.obj)) {
                    // Has to instantiate a class.
                    /** @param {*[]} args */
                    return (...args) => {
                        return new reg.obj(...deps, ...args);
                    };
                } else if (typeof (reg.obj) === 'function') {
                    // Has to call the function.
                    /** @param {*[]} args */
                    return (...args) => {
                        return reg.obj(...deps, ...args);
                    };
                }
            }
        }
        throw new Error(`Invalid registry type ${reg.type}`);
    }

    /**
     * @param {Map<string, *>} map
     * @param {DIRegistryEntry} reg
     * @param {string[]} path
     * @returns {*}
     */
    #getInstance(map, reg, path) {
        if (map.has(reg.name)) {
            return map.get(reg.name);
        }
        // Create an instance
        const instance = this.#createInstance(reg, path);
        map.set(reg.name, instance);
        return instance;
    }

    /**
     * @param {DIRegistryEntry} reg
     * @param {string[]} path
     * @returns {*}
     */
    #createInstance(reg, path) {
        // Need to get all the dependencies.
        const deps = (reg.deps ?? []).map(name => this.get(name, path));
        if (isClass(reg.obj)) {
            // Has to instantiate a class.
            return new reg.obj(...deps);
        } else if (typeof (reg.obj) === 'function' && deps.length) {
            // Prevent from calling functions like jQuery if no dependencies are passed
            // Has to call the function.
            return reg.obj(...deps);
        } else {
            // Return directly.
            return reg.obj;
        }
    }
}
