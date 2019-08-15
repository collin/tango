const reconnectingWS = require("reconnecting-websocket")
const ShareDB = require("sharedb/lib/client")
const socket = new WebSocket(`ws://${window.location.host}/sharedb`)
const connection = new ShareDB.Connection(socket)
const StringBinding = require("sharedb-string-binding")


const element = document.querySelector("textarea")
const statusSpan = document.getElementById("status-span")
statusSpan.innerHTML = "Not Connected"

element.style.backgroundColor = "gray"
socket.onopen = function() {
  statusSpan.innerHTML = "Connected"
  element.style.backgroundColor = "white"
}

socket.onclose = function() {
  statusSpan.innerHTML = "Closed"
  element.style.backgroundColor = "gray"
}

socket.onerror = function() {
  statusSpan.innerHTML = "Error"
  element.style.backgroundColor = "red"
}

// Create local Doc instance mapped to "examples" collection document with id "textarea"
const doc = connection.get("examples", "textarea")
doc.subscribe(function(err) {
  if (err) throw err

  const binding = new StringBinding(element, doc, ["content"])
  binding.setup()
})
