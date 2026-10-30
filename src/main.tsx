import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./styles.css"
import { initAuth } from "./services/auth"

async function start() {
  await initAuth()
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode><App/></React.StrictMode>
  )
}
start()
