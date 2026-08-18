import type { Editor } from "@halo-dev/richtext-editor";
import { getHybridBlockRange } from "../editor/hybrid-block-selection";

export const deleteNode = (nodeType: string, editor: Editor) => {
  const { state } = editor;
  const range = getHybridBlockRange(state, nodeType);
  if (!range) {
    return false;
  }

  editor.view.dispatch(state.tr.delete(range.from, range.to).scrollIntoView());
  return true;
};
