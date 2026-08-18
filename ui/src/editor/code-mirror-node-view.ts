const INTERACTIVE_NODE_VIEW_SELECTOR =
  ".cm-editor, button, input, select, textarea";

export const codeMirrorNodeViewOptions = {
  // The ProseMirror document is updated explicitly from CodeMirror changes.
  // DOM and selection mutations inside the embedded editor should stay private.
  ignoreMutation: () => true,
  stopEvent: ({ event }: { event: Event }) => {
    const target = event.target;

    return (
      target instanceof Element &&
      !!target.closest(INTERACTIVE_NODE_VIEW_SELECTOR)
    );
  },
};
