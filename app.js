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

  const editor = CodeMirror(document.querySelector("#editor"), {
    //...this.props.editorConfig,
    mode: "text/html",
    theme: "default",
    matchTags: { bothTags: true },
    autoCloseTags: true,
    tabSize: 2,
    lineNumbers: true
  })

  doc.subscribe(function(err) {
    let suppress = false
    if (err) throw err
    if (!doc.type) doc.create('text', 'text', err => {
      console.log('create failed!', err.stack)
    })
    if (doc.type && doc.type.name === 'text') {
      editor.setValue(doc.data)
      const api = textType.type.api(
        () => doc.data,
        (...args) => doc.submitOp(...args)
      )
      api.onInsert = function (pos, text) {
        suppress = true;
        editor.replaceRange(text, editor.posFromIndex(pos), undefined,'sharedb');
        suppress = false;
      };

      api.onRemove = function (pos, length) {
        suppress = true;
        var from = editor.posFromIndex(pos);
        var to = editor.posFromIndex(pos + length);
        editor.replaceRange('', from, to, 'sharedb');
        suppress = false;
      };
      function applyToShareJS (editor, change) {

        let startPos = 0;  // Get character position from # of chars in each line.
        let i = 0;         // i goes through all lines.

        while (i < change.from.line) {
          startPos += editor.lineInfo(i).text.length + 1;   // Add 1 for '\n'
          i++;
        }

        startPos += change.from.ch;

        if (change.to.line == change.from.line && change.to.ch == change.from.ch) {
          // nothing was removed.
        } else {
          // delete.removed contains an array of removed lines as strings, so this adds
          // all the lengths. Later change.removed.length - 1 is added for the \n-chars
          // (-1 because the linebreak on the last line won't get deleted)
          let delLen = 0;
          for (let rm = 0; rm < change.removed.length; rm++) {
            delLen += change.removed[rm].length;
          }
          delLen += change.removed.length - 1;
          api.remove(startPos, delLen);
        }
        if (change.text) {
          api.insert(startPos, change.text.join('\n'));
        }
        if (change.next) {
          applyToShareJS(editor, change.next);
        }
      }
      editor.on("change", function (editor, change) {
        if (change.origin === "sharedb") { return }
        applyToShareJS(editor, change)
        drawToCanvas(doc.data)
      })
      drawToCanvas(doc.data)
      doc.on("op", (op, local) => {
        if (local) { return }
        api._onOp(op, local)
        drawToCanvas(doc.data)
      })
    }
  })
}
window.onload = init
