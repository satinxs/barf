type WatchFn = <T>(v: T) => void;

/* Barebones And Reactive Framework */
export type Observable<T> = {
    (...v: T[]): T;
    watch: (f: WatchFn, immediate?: boolean) => void;
    subs: Set<WatchFn>,
};

const isFunction = (obj: any): obj is Function => typeof obj == 'function';
const isObservable = <T>(obj: any): obj is Observable<T> => isFunction(obj) && 'watch' in obj;

const computation = [];
export const $ = <T extends any>(v: T | Function): Observable<T> => {
    let value: T;
    const subscribers = new Set<WatchFn>(); //Investigate using a FinalizationRegistry or WeakSet

    const watch = (fn: WatchFn, immediate: boolean = false) => {
        subscribers.add(fn);
        if (immediate) fn(value);
    };

    const _func = (...args: T[]) => {
        if (args.length > 0) {
            value = args[0];
            subscribers.forEach(f => f(value));
        } else if (computation.length > 0)
            watch(computation[computation.length - 1]);

        return value;
    };

    _func.watch = watch;
    _func.subs = subscribers;

    if (isFunction(v)) {
        computation.push(() => _func(v()));
        try { _func(v()); }
        finally { computation.pop(); }
    } else
        value = v;

    return _func;
};

type Kvp = { [k: string]: any };
export const h = (tag: string | Function, props: Kvp, ...children: any[]) => ({ tag, props, children });

type Element = HTMLElement | Text | DocumentFragment;
type Component = { tag: string | Function, props: Kvp, children: any[] };

type ParentNode = HTMLElement | DocumentFragment;

const _d = document; //Alias to reduce size when minified :P
export const mount = (el: Component, parent: HTMLElement = _d.body) => {
    const events = new Map<Node, [Function, Observable<any>][]>();

    const observe = (n: Node, o: Observable<any>, fn: Function) => {
        if (!events.has(n)) events.set(n, []);
        events.get(n).push([fn, o]);
        o.watch(fn as WatchFn, true);
    };

    const render = (el: Component, parent: ParentNode, previousElement?: Element): Element => {
        if (isFunction(el?.tag))
            return render(el.tag(el.props, el.children), parent, previousElement);

        let node: Element;

        if (typeof el?.tag == 'string') {
            node = _d.createElement(el.tag);

            if (el.props)
                for (const [key, value] of Object.entries(el.props)) {
                    if (isObservable(value))
                        observe(node, value, v => node[key] = v);
                    else
                        node[key] = value;
                }

            if (el.children)
                for (const child of el.children) {
                    if (isObservable(child)) {
                        let previousChild = null;
                        observe(node, child, v => previousChild = render(v, node as ParentNode, previousChild));
                    }
                    else
                        render(child, node as ParentNode);
                }
        } else if (Array.isArray(el)) {
            node = _d.createDocumentFragment();

            for (const child of el)
                render(child, node);

            parent.replaceChildren(); //Clear parent children
            previousElement = null;
        } else
            node = _d.createTextNode(`${el}`);

        if (previousElement)
            parent.replaceChild(node, previousElement);
        else
            parent.appendChild(node);

        return node;
    };

    render(el, parent);

    new MutationObserver(mutations => {
        mutations.forEach(m => m.removedNodes.forEach((node, key) => {
            if (events.has(node))
                events.get(node)
                    .forEach(([f, o]) => o.subs.delete(f as WatchFn));
        }));
    }).observe(parent, { childList: true });
};
