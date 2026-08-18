import {
  GapCursor,
  getGapCursorTarget,
  isActive,
  NodeSelection,
  resolveGapCursorSide,
  type Editor,
  type EditorState,
  type GapCursorSide,
  type PMNode,
} from "@halo-dev/richtext-editor";

export interface HybridBlockRange {
  node: PMNode;
  from: number;
  to: number;
}

export const getHybridBlockRange = (
  state: EditorState,
  nodeType: string
): HybridBlockRange | undefined => {
  const { selection } = state;

  if (selection instanceof GapCursor) {
    const preferredSide = (selection as GapCursor & { side?: GapCursorSide })
      .side;
    const side = resolveGapCursorSide(selection.$from, preferredSide);
    const target = side ? getGapCursorTarget(selection.$from, side) : undefined;

    if (target?.node.type.name === nodeType) {
      return {
        node: target.node,
        from: target.pos,
        to: target.pos + target.node.nodeSize,
      };
    }
  }

  if (selection instanceof NodeSelection) {
    const node = state.doc.nodeAt(selection.from);
    if (node?.type.name === nodeType) {
      return {
        node,
        from: selection.from,
        to: selection.from + node.nodeSize,
      };
    }
  }

  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === nodeType) {
      const from = $from.before(depth);
      return { node, from, to: from + node.nodeSize };
    }
  }
};

export const isHybridBlockActive = (state: EditorState, nodeType: string) =>
  isActive(state, nodeType) || !!getHybridBlockRange(state, nodeType);

export const isHybridBlockNodeSelection = (
  state: EditorState,
  nodeType: string,
  nodePos: number
) => {
  const { selection } = state;
  return (
    selection instanceof NodeSelection &&
    selection.from === nodePos &&
    selection.node.type.name === nodeType
  );
};

export const getHybridBlockVirtualElement = (
  editor: Editor,
  nodeType: string
) => {
  const range = getHybridBlockRange(editor.state, nodeType);
  if (!range) {
    return null;
  }

  const nodeDom = editor.view.nodeDOM(range.from);
  if (!(nodeDom instanceof HTMLElement)) {
    return null;
  }

  const element = nodeDom.matches("[data-node-view-wrapper]")
    ? nodeDom
    : nodeDom.querySelector<HTMLElement>("[data-node-view-wrapper]") ?? nodeDom;

  return {
    getBoundingClientRect: () => element.getBoundingClientRect(),
    getClientRects: () => [element.getBoundingClientRect()],
  };
};
