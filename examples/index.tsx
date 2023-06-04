import { $, h, mount, IElement, Observable } from '../barf';
import { HashRouter } from "@satinxs/router";
import "simpledotcss/simple.css";

class ToDoItem {
    title: Observable<string>;
    done: Observable<boolean>;

    constructor(title: string, done: boolean = false) {
        this.title = $(title);
        this.done = $(done);
    }

    toElement() {
        return <li
            key={this.title()} //Here we call the observable because the key has to be a string
            class={$(() => this.done() ? 'strikethrough' : '')}
        >
            <span style="margin-right:1rem">{this.title}</span>
            <button
                onclick={() => { console.log(this, this.done()); this.done(!this.done()); }}
            >
                {$(() => this.done() ? '☑' : '☐')}
            </button>
        </li>;
    }
}

function ToDo() {
    const todos = $<ToDoItem[]>([]);

    const todoTitle = $('');

    const addTodo = () => {
        const title = todoTitle();

        if (todos().find(t => t.title() === title))
            return alert('A todo with that title already exists');

        todos([...todos(), new ToDoItem(title)]);
        todoTitle('');
    };

    return <div style="padding:1rem">
        <input type="text"
            value={todoTitle}
            oninput={ev => todoTitle(ev.target.value)}
            onkeydown={ev => ev.key === 'Enter' ? addTodo() : 0}
            placeholder="Write your todo here..."
        />
        <button onclick={addTodo}>Add</button>
        <ul>
            {$(() => todos().map(t => t.toElement()))}
        </ul>
    </div>;
}

function HelloWorld() {
    const name = $('');
    const nameOrWorld = $<string>(() => name().length > 0 ? name() : 'World');

    return <div>
        <h1>Hello {nameOrWorld}!</h1>
        <label for="name">Name</label>
        <br />
        <input type="text" id="name" value={name} oninput={ev => name(ev.target.value)} />
    </div>;
}

function Index() {
    return <ul>
        <li><a href="#/hello-world">Hello World</a></li>
        <li><a href="#/todos">To do</a></li>
    </ul>;
}

function ErrorView({ error }: { error: any }) {
    return <div>
        <p>Error: {error}</p>
    </div>;
}

function App() {
    const element = $<IElement>(<Index />);

    const router = new HashRouter<IElement>()
        .build({
            '/': <Index />,
            '/todos': <ToDo />,
            '/hello-world': <HelloWorld />
        })
        .onRouting(el => element(el), true)
        .onRoutingError(error => element(<ErrorView error={error} />));

    return <div>
        {element}
        {$(() => (element().tag === Index)
            ? null
            : <button onclick={() => HashRouter.setRoute('/')}>Go back</button>
        )}
    </div>;
}

mount(document.getElementById('root'), <App />);