## Working With WebSockets in SolidStart

In this tutorial, we will introduce how to work with WebSocket's by building a simple chat application in SolidStart.

First install SolidStart by using:

`pnpm create solid`

or you can use a similar alternative command as described in [Getting Started](https://docs.solidjs.com/solid-start/getting-started) documentation for SolidStart.


You can select a `basic` template with `Typescript` enabled.

Now when we run

`pnpm dev` we can see the template working code at `localhost:3000`. The port number is configurable by setting 
```
...
"scripts": {
    "dev": "vinxi dev --port=3000",
...
```
I prefer to use 3000 as port number.


In the template we will start by removing the boilerplate first.

Remove `~/components/Counter.css` and `~/components/Counter.tsx`.

Remove the extra code in `~/routes/index.tsx`, leaving only this:

```tsx
import { Title } from "@solidjs/meta";

export default function Home() {
  return (
    <main>
      <Title>Hello World</Title>
      <h1>Hello world!</h1>
    </main>
  );
}
```


Now locate to our application at `localhost:3000`, and see everything still works without errors.

## createContext for a SocketContext

We will provide a way to access our Socket from anywhere in our application, so it's a good idea to wrap it in a [Context](https://docs.solidjs.com/reference/component-apis/create-context)

create a file in `~/components/socket.tsx`: (mind the tsx extension)
```tsx
import { createContext } from "solid-js";

class StrongSocket {

    static create = (path: string) => {
        return new StrongSocket(path)
    }

    private constructor(readonly path: string) {}

    connect() {
        console.log('websocket connecting at ' + this.path)
    }


    send() {
        console.log('websocket send at', this.path)
    }
}


export const SocketContext = createContext<StrongSocket>()
```


So `StrongSocket` is where we actually work with a WebSocket object a simple wrapper. and `SocketContext` is a context that provides a `StrongSocket` object.

Before we write a `SocketContext.Provider` for this, let's try to use it without one:

Let's write a component, and put it in the `~/index.tsx` Home route:

```tsx
const WithSocketConnection = () => {

  let socket = useContext(SocketContext)

  console.log('socket is ', socket)
  socket?.connect()

  return (<>
  </>)
}
```

and use this component from `Home` function:
```tsx
export default function Home() {
  return (
    <main>
      <Title>Hello World</Title>
      <h1>Hello world!</h1>
      <WithSocketConnection>

      </WithSocketConnection>
    </main>
  );
}
```

Go to browser's console, and note the log: `socket is undefined`.


So we will need this `SocketContext.Provider` so socket will be defined through that.

`~/components/socket.tsx`
```tsx
export const SocketProvider = (props: { path: string, children: JSX.Element }) => {
    return (<SocketContext.Provider value={StrongSocket.create(props.path)}>
        {props.children}
    </SocketContext.Provider>)
}
```

Now use this `SocketProvider` by wrapping `WithSocketConnection` with it:

`~/routes/index.tsx`
```tsx
      <SocketProvider path='lobby'>
        <WithSocketConnection>

        </WithSocketConnection>
      </SocketProvider>
```


and note the logs, that socket is defined, with out custom path `lobby`:
```
socket is  StrongSocket {path: 'lobby'}
socket.tsx:12 websocket connecting at lobby
```


Now we can create a `StrongSocket` at different routes, with a different SocketProvider, and a different path. Later we will see how to handle different routes on the server side. Now let's see how to create our first WebSocket connection and how to handle it on the server.

## Handle WebSocket Connection on the Server

First we will try to open a connection from the browser within `StrongSocket` class:

`~/components/socket.tsx`
```tsx
class StrongSocket {

    static create = (path: string) => {
        return new StrongSocket(path)
    }

    get href() {
        let protocol = location.protocol === 'https' ? 'wss': 'ws'
        return `${protocol}://${location.host}/_ws/#/${this.path}`
    }

    private constructor(readonly path: string) {}

    ws?: WebSocket

    connect() {
        let ws = new WebSocket(this.href)

        ws.addEventListener('message', this.on_message)
        ws.addEventListener('open', () => {
            this.ws = ws
            this.log('Connected at: ' + this.path)
        })
    }

    on_message = (msg: MessageEvent) => {
        console.log(msg)
    }

    log = (msg: string) => {
        console.log(`[StrongSocket] `, msg)
    }
}

```


Now when we look at the browser, we have this error:
`WebSocket is not defined`. This is because the `connect` code is run in the server, we need to put that usage code in an `onMount`:

`~/routes/index.tsx`
```tsx
const WithSocketConnection = () => {
  let socket = useContext(SocketContext)
  onMount(() => {
    console.log('socket is ', socket)
    socket?.connect()
  })

///...
```

Now the error is gone, and if you look at the network, the WebSocket connection is sent, but not opened yet.


Next, we create a route to handle the `localhost:3000/_ws/lobby` endpoint:
So create a dynamic route by creating this file:
`~/_ws/[path].tsx`
```tsx
import type { APIEvent } from '@solidjs/start/server'


export function GET(event: APIEvent) {
    let { path } = event.params

    console.log(path)
}
```

Now when you refresh the browser, note the log on the server console: `lobby`, which is passed as `event.params` named `path`.

Next, we need to actually handle this route as a websocket connection.

First install [crossws](https://crossws.unjs.io/guide#quick-start):

`pnpm i crossws`

Next Let's create some handlers:

`~/ws.ts`
```tsx
import crossws from 'crossws/adapters/node'


const ws = crossws({
    hooks: {
        open(peer) {
            console.log('open', peer)
        },
        message(peer, message) {
            console.log('message', peer, message)
            if (message.text().includes('ping')) {
                peer.send('pong')
            }
        },
        close(peer, event) {

            console.log('ws close', peer, event)
        },
        error(peer, error) {
            console.log('ws error', peer, error)
        }
    }
})

export { ws }
```

And put these into:
`~/entry-server.tsx`
```tsx
import { ws } from '~/ws'
import type { IncomingMessage } from 'node:http'

const emptyBuffer = Buffer.from('')
const handleUpgrade = (request: IncomingMessage) =>
  ws.handleUpgrade(request, request.socket, emptyBuffer)

export { handleUpgrade }
```

(I copied these code snippets from an example repository you can check out in the [References](#references).)

Now we're ready to upgrade our connection into a websocket and start exchanging messages.

### Routing Peers to Different Channels

I would like to point out the [Resolver API](https://crossws.unjs.io/guide/resolver), which claims to provide a mechanism to route requests. Please note that we had `lobby` as our path in the url of our websocket request. We would like to route this to some lobby handler, and for example another page routes to another handler. Unfortunately I couldn't make this `Resolver API` work, so I tried to roll my own routing mechanism. Which seems to work, but be fore-warned.

`~/routes/_ws/[path].tsx`
```tsx

let lobby: Peer[] = []

function publish_lobby(data: any) {
    lobby.forEach(_ => _.send(data))
}

function log_error(str: string) {
    console.error(str)
}

function nb_connected() {
    return lobby.length
}

interface IDispatch {
    join(): void,
    leave(): void,
    message(_: string): void
}

function dispatch_peer(peer: Peer) {
    let parts = peer.request?.url?.split('/')

    if (parts) {
        let path = parts[parts.length - 1]

        switch (path) {
            case 'lobby':
                return new Lobby(peer)
        }
    }
    peer.terminate()
    return undefined
}

class Lobby {

    constructor(readonly peer: Peer) {}

    join() {
        lobby.push(this.peer)
        this.publish({ n: nb_connected() })
    }

    leave() {
        let i = lobby.indexOf(this.peer)
        if (i !== -1) {
            lobby.splice(i, 1)
        }

        this.publish({ n: nb_connected() })
    }

    publish(data: any) {
        lobby.forEach(_ => _.send(data))
    }

    message(_: any) {

    }
}
```

You can see these helper classes helps dispatch the peer into relevant channels. Each channel is basically an array of peers we can publish broadcast messages to. Note that there is also [Pub Sub](https://crossws.unjs.io/guide/pubsub) mechanism in this library we are using, but I didn't understand why that would be useful if I rolled my own as I am showing now.


And finally the handlers:

`~/routes/_ws/[path].tsx`
```tsx
const ws = crossws({
    hooks: {
        open(peer) {
            let i = dispatch_peer(peer)
            i?.join()
        },
        message(peer, message) {
            if (message.text().includes('ping')) {
                peer.send('pong')
                return
            }

            let i = dispatch_peer(peer)
            i?.message(message.json())
        },
        close(peer, event) {
            let i = dispatch_peer(peer)
            i?.leave()
        },
        error(peer, error) {
            log_error(`{${peer?.request?.url}} ${error}`)
        },
    }

})
```

Here, we are keeping track of connected and disconnected users into lobby, by `join` and `leave` methods. The `lobby` array keeps the peers. And each time a peer join's or leaves, we publish a message to the `lobby` peers, `{n: nb_connected()}`, which designates the number of connected peers.

Note the logs for Network tab for our websocket connection and see `{n: 1}`, `{n: 2}` messages are sent to the browser as you open new tabs.

We successfully received messages from the server to the browser. Final part is sending messages from the browser to the server and building the actual app logic. Which we will demonstrate by building a simple chat application.

## Send And Receive Messages and Presentation

As seen previously server checks `ping` messages and sends a `pong` in return. Let's actually send a ping message every second, and see if server returns a pong everytime.

`~/components/socket.tsx`
```tsx
// ... class StrongSocket {

    ping_interval?: NodeJS.Timeout

    connect() {
        clearInterval(this.ping_interval)

        let ws = new WebSocket(this.href)

        ws.addEventListener('message', this.on_message)
        ws.addEventListener('open', () => {
            this.ws = ws
            this.log('Connected at: ' + this.path)

            this.ping_interval = setInterval(this.ping_now, 1000)
        })
    }

    ping_now = () => {
        this.send('ping')
    }

    send(msg: any) {
        this.ws?.send(msg)
    }

//...
```

And check the established `lobby` websocket connection and see the actual `ping` `pong` exchanges happening.

This should be enough to build upon and build a realtime web application. For the full chat application you can check out the source code of [this repository](https://github.com/eguneys/solidstart-websockets-chat-tutorial). Also you can clone it and run on your end if you like.

## References

- [lichess StrongSocket](https://github.com/lichess-org/lila/blob/1404ed1d5e96de14caea040498860ec22d56fb4d/ui/common/src/socket.ts#L49)
- [websockets in solidstart demo](https://github.com/peerreynders/solid-start-ws-demo/tree/main)