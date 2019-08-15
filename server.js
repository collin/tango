const express = require("express")
const volleyball = require("volleyball")
const Bundler = require("parcel-bundler")
const websocketify = require("express-ws")
const WebSocketJSONStream = require("@teamwork/websocket-json-stream")
const ShareDB = require("sharedb")
const textType = require("ot-text");

ShareDB.types.register(textType.type)

const shareBackend = new ShareDB({
  /* no options yet */
})

function createDoc(callback) {
  const connection = shareBackend.connect();
  const doc = connection.get("examples", "textarea");
  doc.fetch(function(err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create({content: ""}, callback);
      return;
    }
    callback();
  });
}

createDoc(startServer)

const app = express()

websocketify(app)

const path = require("path")
const entrypoint = path.join(__dirname, "index.html")

app.ws("/sharedb", (ws, req) => {
  console.log("GOT A CONNECTION")
  const stream = new WebSocketJSONStream(ws)
  shareBackend.listen(stream)
})

const parcelOptions = {}
const bundler = new Bundler(entrypoint, parcelOptions)

app.use(bundler.middleware())
app.use(volleyball)

function startServer () {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
  })
}
