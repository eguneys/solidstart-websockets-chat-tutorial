import crossws from 'crossws/adapters/node'
import { Peer } from 'crossws/dist'


let lobby: Peer[] = []

function log_error(str: string) {
    console.error(str)
}

function nb_connected() {
    return lobby.length
}

function publish_lobby(data: any) {
    lobby.forEach(_ => _.send(data))
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

export { ws }