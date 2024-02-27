/* Barebones And Reactive Framework */
export type Observable<T> = {
    (...v: T[]): T;
    watch: (f: (v: T) => void, immediate?: boolean) => void;
}

const isFunction = (obj: any): obj is Function => typeof obj === 'function';
const isObservable = <T>(obj: any): obj is Observable<T> => isFunction(obj) && 'watch' in obj;

const computation = [];
export const $ = <T extends any>(v: T | Function): Observable<T> => {
    let value: T;
    const subscribers = new Set<(v: any) => void>();

    const watch = (fn: (v: any) => void, immediate: boolean = false) => {
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

    if (isFunction(v)) {
        const trigger = () => _func(v());

        if (computation.includes(trigger))
            throw new Error('Circular dependency');

        computation.push(trigger);

        try { _func(v()); }
        finally { computation.pop(); }
    } else
        value = v;

    return _func;
};

type Kvp = { [k: string]: any };
export const h = (tag: any, props: Kvp, ...children: any[]) => ({ tag, props, children });

type Element = HTMLElement | Text | DocumentFragment;

export const render = (el: any, parent: HTMLElement | DocumentFragment, previousElement?: Element): Element => {
    let node: Element;

    if (typeof el === 'object' && 'tag' in el) {
        node = document.createElement(el.tag);

        if (el.props)
            for (const [key, value] of Object.entries(el.props)) {
                if (isObservable(value))
                    value.watch(v => node[key] = v, true);
                else
                    node[key] = value;
            }

        if (el.children)
            for (const child of el.children) {
                if (isObservable(child)) {
                    let previousChild = null;
                    child.watch((v: any) => {
                        previousChild = render(v, node as HTMLElement | DocumentFragment, previousChild);
                    }, true);
                }
                else
                    render(child, node as HTMLElement);
            }
    } else if (Array.isArray(el)) {
        node = document.createDocumentFragment();

        for (const child of el)
            render(child, node);

        parent.replaceChildren(); //Clear parent children
        previousElement = null;
    } else
        node = document.createTextNode(`${el}`);

    if (previousElement)
        parent.replaceChild(node, previousElement);
    else
        parent.appendChild(node);

    return node;
};
