/* Barebones And Reactive Framework */
export type Observable<T> = {
    (...v: T[]): T;
    watch: (f: (v: T) => void, immediate?: boolean) => void;
}
type Kvp = { [k: string]: any };
export type IElement = {
    tag: string | Function;
    props: Kvp;
    children: (Element | any)[];
};
type Element = IElement | (() => Element);

const isFunction = (obj: any): obj is Function => typeof obj === 'function';
const isObservable = <T>(obj: any): obj is Observable<T> => isFunction(obj) && 'watch' in obj;
const isElement = (obj: any): obj is IElement => obj && typeof obj === 'object' && 'tag' in obj;

const computation = [];
export const $ = <T extends any>(v: T | Function): Observable<T> => {
    let value: T;
    const subscribers = new Set<(v: any) => void>();

    const watch = (fn: (v: any) => void, immediate: boolean = false) => {
        subscribers.add(fn);
        if (immediate)
            fn(value);
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

        try {
            _func(v());
        } catch (e) {
            throw e;
        } finally {
            computation.pop();
        }
    } else
        value = v;

    return _func;
};

export const h = (tag: string | Function, props: Kvp, ...children: (Element | any)[]) => ({ tag, props, children });

const _d = document;
const createElement = (tag: string) => _d.createElement(tag);
const appendChild = (parent: HTMLElement, child: HTMLElement | Text) => parent.appendChild(child);
const setNodeAttribute = (node: HTMLElement, key: string, value: any | Function): void => {
    node[({
        for: 'htmlFor',
        class: 'className'
    })[key] ?? key] = value;
};

const createArrayNode = (previousNode: HTMLElement | Text, values: (IElement | any)[]): HTMLElement => {
    if (!previousNode || previousNode instanceof Text)
        previousNode = createElement('fr');

    const children = new Map<string, ChildNode>();
    const childrenNodes = previousNode.childNodes;
    for (let i = 0; i < childrenNodes.length; i += 1) {
        const child = childrenNodes.item(i);
        // @ts-ignore
        const key = child.key;
        if (key) {
            if (children.has(key))
                console.warn('Rendering elements with duplicated keys');

            children.set(key, child);
        }
    }

    previousNode.replaceChildren(
        ...values.map(v => isElement(v) && children.has(v.props?.key)
            ? children.get(v.props.key)
            : createNode(v)
        )
    );

    return previousNode;
};

const createNode = (element: Element | any) => {
    if (isElement(element)) {
        const { tag, props, children } = element;
        if (isFunction(tag))
            return createNode(tag(props, children));

        const node = createElement(tag);

        //Set props and children
        for (const key in props) {
            const value = props[key];

            if (isObservable(value))
                value.watch(v => setNodeAttribute(node, key, v), true);
            else
                setNodeAttribute(node, key, value);
        }

        for (const child of children) {
            if (isObservable(child)) {
                let childNode = null;
                child.watch(value => {
                    const newChildNode = Array.isArray(value)
                        ? createArrayNode(childNode, value)
                        : createNode(value);

                    childNode
                        ? node.replaceChild(newChildNode, childNode)
                        : appendChild(node, newChildNode);
                    childNode = newChildNode;
                }, true);
            } else
                appendChild(node, createNode(child));
        }

        return node;
    }

    return _d.createTextNode(element ?? '');
};

export const mount = (parent: HTMLElement, element: Element | any) => appendChild(parent, createNode(element));