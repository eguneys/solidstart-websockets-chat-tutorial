import { createContext, JSX } from "solid-js";

type Handlers = Record<string, (d: string) => void>

class StrongSocket {

    static create = (path: string, h: Handlers) => {
        return new StrongSocket(path, h)
    }

    get href() {
        let protocol = location.protocol === 'https' ? 'wss': 'ws'
        return `${protocol}://${location.host}/_ws/${this.path}`
    }

    private constructor(readonly path: string, readonly handlers: Handlers) {}

    ws?: WebSocket

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

    on_message = (msg: MessageEvent) => {
    }

    log = (msg: string) => {
        console.log(`[StrongSocket] `, msg)
    }


    send(msg: any) {
        this.ws?.send(msg)
    }
}


export const SocketContext = createContext<StrongSocket>()


export const SocketProvider = (props: { path: string, children: JSX.Element }) => {
    return (<SocketContext.Provider value={StrongSocket.create(props.path)}>
        {props.children}
    </SocketContext.Provider>)
}