import { Title } from "@solidjs/meta";
import { createEffect, createSignal, For, onMount, useContext } from "solid-js";
import { SocketContext, SocketProvider } from "~/components/socket";
import './Home.css'

export default function Home() {

  return (
    <main class='home'>
      <Title>Hello World</Title>
      <h1>Hello world!</h1>
      <SocketProvider path='lobby'>
        <WithSocketConnection>

        </WithSocketConnection>
      </SocketProvider>
    </main>
  );
}

type ChatMessage = {
  name: string,
  text: string
}

const WithSocketConnection = () => {


  const [name, set_name] = createSignal(`Guest ${Math.floor(Math.random() * 10)}`)
  const [messages, set_messages] = createSignal<ChatMessage[]>([], { equals: false })


  let handlers = {
    chat: (msg: { name: string, text: string }) => {
      let msgs = messages()
      msgs.unshift(msg)
      set_messages(msgs)

    }
  }

  let socket = useContext(SocketContext)
  onMount(() => {
    console.log('socket is ', socket)

    socket?.connect(handlers)

  })

  let $ref_chat: HTMLInputElement

  const on_send_chat = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      let chat = $ref_chat.value
      socket?.send({t: 'chat', d: { name: name(), text: chat}})
      $ref_chat.value = ''
    }
  }

  createEffect(() => {
    console.log(name())
  })

  return (<>
    <div class='chat'>
      <input title='name' type='text' placeholder="Set Name" value={name()}></input>
      <div class='messages'>
      <For each={messages()}>{message =>
        <div class='message'><span>{message.name}</span>: <span>{message.text}</span></div>
      }</For>
      </div>
      <input ref={_ => $ref_chat = _} title='send' type='text' placeholder="Send Chat" onKeyUp={e => on_send_chat(e)}></input>
    </div>
  </>)
}