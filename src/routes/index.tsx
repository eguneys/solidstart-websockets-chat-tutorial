import { Title } from "@solidjs/meta";
import { createSignal, For, onMount, useContext } from "solid-js";
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
  const [messages, set_messages] = createSignal<ChatMessage[]>([])


  let socket = useContext(SocketContext)
  onMount(() => {
    console.log('socket is ', socket)
    socket?.connect()
  })


  return (<>
    <div class='chat'>
      <input title='name' type='text' placeholder="Set Name" value={name()}></input>
      <div class='messages'>
      <For each={messages()}>{message =>
        <div class='message'><span>{message.name}</span>: <span>{message.text}</span></div>
      }</For>
      </div>
      <input title='send' type='text' placeholder="Send Chat"></input>
       
    </div>
  </>)
}