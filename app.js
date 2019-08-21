import reconnectingWS from "reconnecting-websocket"
import ShareDB from "sharedb/lib/client"

import CodeMirror from "codemirror/lib/codemirror";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/fold/xml-fold";
import "codemirror/mode/htmlmixed/htmlmixed";
import "codemirror/mode/xml/xml";
import "codemirror/mode/css/css";
import "codemirror/mode/javascript/javascript";

import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import textType from "ot-text";
import shareCodeMirror from "share-codemirror";

function drawToCanvas(html) {
  document.querySelector("#canvas").contentDocument.documentElement.innerHTML = html
}

function init () {
  ShareDB.types.register(textType.type)

  const socket = new WebSocket(`ws://${window.location.host}/sharedb`)
  const connection = new ShareDB.Connection(socket)

  const doc = connection.get("examples", "codemirror")
  const cursors = connection.get("examples", "cursors3")

  const userId = 'collin'//prompt("What is your user name?")

  const editor = CodeMirror(document.querySelector("#editor"), {
    //...this.props.editorConfig,
    mode: "text/html",
    theme: "default",
    matchTags: { bothTags: true },
    autoCloseTags: true,
    tabSize: 2,
    lineNumbers: true
  })

  cursors.subscribe(function(err) {
    if (err) throw err
    if (!cursors.type) {
      cursors.create(new Object, 'json0', err => {
        if (err) console.error('create failed!', err.stack)
        else {
          console.log("cursors", cursors)
        }
      })
    }
    if (cursors.type && cursors.type.name === 'json0') {
      let lastCursor = cursors.data[userId]
      editor.on('cursorActivity', () => {
        return
        const cursor = editor.getCursor()
        if (lastCursor) {
          cursors.submitOp({
            p: [userId],
            od: lastCursor,
            oi: cursor
          })
        }
        else {
          cursors.submitOp({
            p: [userId],
            oi: cursor
          })
        }
        lastCursor = cursor;
      })
    }
  })

  doc.subscribe(function(err) {
    if (err) throw err
    if (!doc.type) doc.create('text', 'text', err => {
      if (err) {
        console.log('create failed!', err.stack)
      }
    })

    if (doc.type && doc.type.name === 'text') {
      editor.setValue(doc.data)
      function changeToOp (editor, change) {
        let op = []

        let startPos = editor.indexFromPos(change.from)
        if (startPos > 0) {
          op.push(startPos)
        }

        if (!(change.to.line == change.from.line && change.to.ch == change.from.ch)) {
          let delLen = 0;
          change.removed.forEach(removal => delLen += removal.length)
          delLen += change.removed.length - 1
          op.push({ d: delLen })
        }

        if (change.text) {
          let insert = change.text.join('\n')
          if (insert !== '') {
            op.push(insert)
          }
        }

        return op
      }

      editor.on("changes", function (editor, changes) {
        changes.reverse().forEach(change => {
          if (change.origin === "sharedb") { return }
          const op = changeToOp(editor, change)
          doc.submitOp(op)
        })
        drawToCanvas(doc.data)
      })
      drawToCanvas(doc.data)

      doc.on("op", (op, local) => {
        if (local) { return }
        let pos = 0
        let spos = 0
        op.forEach(component => {
          switch (typeof component) {
            case 'number':
              pos += component
              spos += component
              break
            case 'string':
              editor.replaceRange(component, editor.posFromIndex(pos), undefined, 'sharedb');
              pos += component.length
              break
            case 'object':
              const from = editor.posFromIndex(pos);
              const to = editor.posFromIndex(pos + component.d);
              editor.replaceRange('', from, to, 'sharedb');
              spos += component.d
          }
        })
        drawToCanvas(doc.data)
      })
    }
  })
}
window.onload = init
