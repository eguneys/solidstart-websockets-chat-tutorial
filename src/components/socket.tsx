import { createContext, JSX } from "solid-js";

type Handlers = Record<string, (d: any) => void>

class StrongSocket {

    static create = (path: string) => {
        return new StrongSocket(path)
    }

    get href() {
        let protocol = location.protocol === 'https' ? 'wss': 'ws'
        return `${protocol}://${location.host}/_ws/${this.path}`
    }


    private default_handlers: Handlers = {}
    private set_handlers: Handlers = {}

    get handlers(): Handlers {
        return {...this.default_handlers, ...this.set_handlers }
    }

    private constructor(readonly path: string) {}

    ws?: WebSocket

    ping_interval?: NodeJS.Timeout

    connect(handlers: Handlers) {
        clearInterval(this.ping_interval)

        let ws = new WebSocket(this.href)

        ws.addEventListener('message', this.on_message)
        ws.addEventListener('open', () => {

            this.set_handlers = handlers

            this.ws = ws
            this.log('Connected at: ' + this.path)

            this.ping_interval = setInterval(this.ping_now, 4000)
        })
    }

    ping_now = () => {
        this.send('ping')
    }

    send(msg: any) {
        if (typeof msg === 'object') {
            this.ws?.send(JSON.stringify(msg))
        } else {
          this.ws?.send(msg)
        }
    }

    on_message = (msg: MessageEvent) => {
        if (msg.data === 'pong') {
            return
        }
        let { t, d } = JSON.parse(msg.data)

        if (this.handlers[t]) {
            this.handlers[t](d)
        }

    }

    log = (msg: string) => {
        console.log(`[StrongSocket] `, msg)
    }

}


export const SocketContext = createContext<StrongSocket>()


export const SocketProvider = (props: { path: string, children: JSX.Element }) => {
    return (<SocketContext.Provider value={StrongSocket.create(props.path)}>
        {props.children}
    </SocketContext.Provider>)
}