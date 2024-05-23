import './style.css'
import { schema } from 'prosemirror-schema-basic';
import { EditorState } from 'prosemirror-state';
import { exampleSetup } from 'prosemirror-example-setup';
import { EditorView } from 'prosemirror-view';
import LunaDBAPIClientBridge from '@lunadb-io/lunadb-client-js';
import createLunaDBPlugin from '@lunadb-io/lunadb-prosemirror';

const documentName = "myDocument";
let lunadbClient = new LunaDBAPIClientBridge('https://db-p4phlb69d0sxhbb8.sf1.do.lunadb.io');

// Normally you'd want your backend to do something like this.
await lunadbClient.createDocument(documentName);
let currentContents = await lunadbClient.loadDocument(documentName);
if (!currentContents || !('contents' in currentContents.baseContent)) {
  await lunadbClient.client.v0betaSyncDocument(documentName, '0', [
    { op: 'insert', pointer: '/contents', content: schema.node('paragraph').toJSON() }
  ]);
}

let lunadbPlugin = createLunaDBPlugin(lunadbClient, documentName, "/contents");

let state = EditorState.create({
  schema,
  plugins: exampleSetup({ schema }).concat(lunadbPlugin),
});

let view = new EditorView(document.querySelector('#editor'), {
  state,
  editable: () => false
});

async function loadDocument() {
  let pluginState = lunadbPlugin.getState(view.state);
  try {
    let newContents = await pluginState?.loadDocument(schema);
    let txn = view.state.tr;
    txn.replaceWith(0, view.state.doc.content.size, newContents);
    view.dispatch(txn);
    view.setProps({
      editable: () => true
    });
  } catch (e) {
    console.error(e);
  }
}

async function syncChanges() {
  let pluginState = lunadbPlugin.getState(view.state);
  try {
    let newContents = await pluginState?.syncDocument(schema, view.state);
    let txn = view.state.tr;
    txn.replaceWith(0, view.state.doc.content.size, newContents);
    view.dispatch(txn);
  } catch (e) {
    console.error(e);
  }
}

await loadDocument();

window.setInterval(syncChanges, 1000);