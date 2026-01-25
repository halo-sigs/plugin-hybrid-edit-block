import type { Editor } from "@halo-dev/richtext-editor";

export const deleteNode = (nodeType: string, editor: Editor) => {
  const { state } = editor;
  const $pos = state.selection.$anchor;
  let done = false;

  if ($pos.depth) {
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === nodeType) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (editor.dispatchTransaction)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          editor.dispatchTransaction(
            state.tr.delete($pos.before(d), $pos.after(d)).scrollIntoView()
          );
        done = true;
      }
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const node = state.selection.node;
    if (node && node.type.name === nodeType) {
      editor.chain().deleteSelection().run();
      done = true;
    }
  }

  if (!done) {
    const pos = $pos.pos;

    if (pos) {
      const node = state.tr.doc.nodeAt(pos);

      if (node && node.type.name === nodeType) {
        // @ts-ignore
        if (editor.dispatchTransaction)
          // @ts-ignore
          editor.dispatchTransaction(state.tr.delete(pos, pos + node.nodeSize));
        done = true;
      }
    }
  }

  return done;
};
