<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  computed,
} from "vue";
import {
  EditorView as CodeMirror,
  ViewUpdate,
  keymap as cmKeymap,
  type KeyBinding,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import { autocompletion } from "@codemirror/autocomplete";
import { PreviewRenderer } from "./preview-renderer";
import { VButton } from "@halo-dev/components";
import {
  Selection,
  TextSelection,
  exitCode,
  undo,
  redo,
  isActive,
  NodeViewWrapper,
  nodeViewProps,
} from "@halo-dev/richtext-editor";
import MingcuteRightSmallFill from "~icons/mingcute/right-small-fill";
import type { EditorSelection, Line, SelectionRange } from "@codemirror/state";

const props = defineProps(nodeViewProps);

const editorContainerRef = ref<HTMLElement>();
const previewContainerRef = ref<HTMLElement>();

const isPreviewMode = ref(true);
const isSplitMode = ref(true);

const collapsed = computed<boolean>({
  get: () => {
    return props.node.attrs.collapsed || false;
  },
  set: (collapsed: boolean) => {
    props.updateAttributes({ collapsed: collapsed });
  },
});
const blockType = computed<string>(
  () => props.extension.options.blockType || "html"
);
const blockLabel = computed<string>(() => {
  switch (blockType.value) {
    case "html":
      return "HTML";
    case "markdown":
      return "Markdown";
    default:
      return blockType.value;
  }
});

let cm: CodeMirror | undefined;
let updating = false;
let previewRenderer: PreviewRenderer | undefined;

const togglePreviewMode = () => {
  if (isSplitMode.value) {
    toggleSplitMode();
  }

  if (isPreviewMode.value) {
    isPreviewMode.value = false;
    nextTick(() => {
      selectNode();
    });
  } else {
    isPreviewMode.value = true;
    destroyCodeMirror();
    nextTick(() => {
      updateStandalonePreview();
    });
    props.editor.view.focus();
  }
};

const toggleSplitMode = () => {
  if (isSplitMode.value) {
    isSplitMode.value = false;
    isPreviewMode.value = true;

    destroyCodeMirror();

    nextTick(() => {
      updateStandalonePreview();
    });
  } else {
    isSplitMode.value = true;
    isPreviewMode.value = false;

    nextTick(() => {
      setupSplitView();
    });
  }
};

const handleDoubleClick = () => {
  if (!cm && isPreviewMode.value && !isSplitMode.value) {
    togglePreviewMode();
  }
};

const setupSplitView = () => {
  if (!editorContainerRef.value || !previewContainerRef.value) {
    return;
  }

  const currentText = cm?.state.doc.toString() || props.node.textContent;

  destroyCodeMirror();

  cm = new CodeMirror({
    doc: currentText,
    extensions: [
      autocompletion(),
      cmKeymap.of([...codeMirrorKeymap(), ...defaultKeymap]),
      drawSelection(),
      syntaxHighlighting(defaultHighlightStyle),
      CodeMirror.updateListener.of((update) => {
        forwardUpdate(update);
        updateSplitPreview();
      }),
      ...(props.extension.options.extensions || []),
    ],
  });

  editorContainerRef.value.innerHTML = "";
  editorContainerRef.value.appendChild(cm.dom);

  previewRenderer = new PreviewRenderer(
    blockType.value,
    previewContainerRef.value
  );
  updateSplitPreview();

  cm.focus();
};

const updateSplitPreview = () => {
  if (!isSplitMode.value || !cm || !previewRenderer) return;

  const currentText = cm.state.doc.toString();
  previewRenderer.render(currentText);
};

const updateStandalonePreview = () => {
  if (!previewContainerRef.value) return;

  const currentText = cm?.state.doc.toString() || props.node.textContent;

  previewRenderer = new PreviewRenderer(
    blockType.value,
    previewContainerRef.value
  );

  previewRenderer.render(currentText);
};

const createCodeMirror = () => {
  if (!editorContainerRef.value) return;

  cm = new CodeMirror({
    doc: props.node.textContent,
    extensions: [
      autocompletion(),
      cmKeymap.of([...codeMirrorKeymap(), ...defaultKeymap]),
      drawSelection(),
      syntaxHighlighting(defaultHighlightStyle),
      CodeMirror.updateListener.of((update) => {
        forwardUpdate(update);
        if (isSplitMode.value) {
          updateSplitPreview();
        }
      }),
      ...(props.extension.options.extensions || []),
    ],
  });

  editorContainerRef.value.innerHTML = "";
  editorContainerRef.value.appendChild(cm.dom);
  updating = false;
};

const destroyCodeMirror = () => {
  if (cm) {
    cm.destroy();
    cm = undefined;
  }
};

const codeMirrorKeymap = (): KeyBinding[] => {
  const view = props.editor.view;
  return [
    { key: "ArrowUp", run: () => maybeEscape("line", -1) },
    { key: "ArrowLeft", run: () => maybeEscape("char", -1) },
    { key: "ArrowDown", run: () => maybeEscape("line", 1) },
    { key: "ArrowRight", run: () => maybeEscape("char", 1) },
    {
      key: "Ctrl-Enter",
      run: () => {
        if (!exitCode()) {
          return false;
        }
        view.focus();
        return true;
      },
    },
    {
      key: "Ctrl-z",
      mac: "Cmd-z",
      run: () => undo(view.state, view.dispatch),
    },
    {
      key: "Shift-Ctrl-z",
      mac: "Shift-Cmd-z",
      run: () => redo(view.state, view.dispatch),
    },
    {
      key: "Ctrl-y",
      mac: "Cmd-y",
      run: () => redo(view.state, view.dispatch),
    },
  ];
};

const maybeEscape = (unit: string, dir: number): boolean => {
  if (!cm) {
    return false;
  }
  const { state } = cm;
  const { main } = state.selection;
  let stateMain: SelectionRange | Line = main;
  if (!main.empty) {
    return false;
  }
  if (unit == "line") {
    stateMain = state.doc.lineAt(main.head);
  }
  if (dir < 0 ? stateMain.from > 0 : stateMain.to < state.doc.length) {
    return false;
  }
  const pos = props.getPos?.();
  if (pos === undefined) {
    return false;
  }
  const targetPos = pos + (dir < 0 ? 0 : props.node.nodeSize);
  const selection = Selection.near(
    props.editor.view.state.doc.resolve(targetPos),
    dir
  );
  const tr = props.editor.view.state.tr
    .setSelection(selection)
    .scrollIntoView();
  props.editor.view.dispatch(tr);
  props.editor.view.focus();
  return true;
};

const forwardUpdate = (update: ViewUpdate) => {
  if (!cm) {
    return;
  }
  if (updating || !cm.hasFocus) {
    return;
  }
  const pos = props.getPos?.();
  if (pos === undefined) {
    return;
  }

  const nodeStart = pos;
  const nodeEnd = pos + props.node.nodeSize;
  const pmSel = props.editor.view.state.selection;

  if (pmSel.from < nodeStart || pmSel.from > nodeEnd) {
    return;
  }

  let offset = pos + 1;
  const { main } = update.state.selection;
  const selFrom = offset + main.from;
  const selTo = offset + main.to;
  if (update.docChanged || pmSel.from != selFrom || pmSel.to != selTo) {
    const tr = props.editor.view.state.tr;
    update.changes.iterChanges((fromA, toA, fromB, toB, text) => {
      if (text.length) {
        tr.replaceWith(
          offset + fromA,
          offset + toA,
          props.editor.view.state.schema.text(text.toString())
        );
      } else {
        tr.delete(offset + fromA, offset + toA);
      }
      offset += toB - fromB - (toA - fromA);
    });
    tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo));
    props.editor.view.dispatch(tr);
  }
};

const selectNode = () => {
  if (!cm) {
    createCodeMirror();
  }
  props.editor.chain().scrollIntoView().run();
  if (cm) {
    cm.focus();
  }
};

watch(
  () => props.node,
  (newNode) => {
    const nodeCollapsed = newNode.attrs.collapsed || false;
    if (collapsed.value !== nodeCollapsed) {
      collapsed.value = nodeCollapsed;
    }

    if (!isActive(props.editor.view.state, props.node.type.name)) {
      if (props.node.textContent.length === 0) {
        props.editor.chain().deleteCurrentNode().run();
      }
      if (cm) {
        isPreviewMode.value = true;
      }
      destroyCodeMirror();
      return;
    }

    if (!cm) {
      return;
    }

    const newText = newNode.textContent;
    const curText = cm.state.doc.toString();
    if (newText !== curText) {
      let start = 0;
      let curEnd = curText.length;
      let newEnd = newText.length;
      while (
        start < curEnd &&
        curText.charCodeAt(start) === newText.charCodeAt(start)
      ) {
        ++start;
      }
      while (
        curEnd > start &&
        newEnd > start &&
        curText.charCodeAt(curEnd - 1) === newText.charCodeAt(newEnd - 1)
      ) {
        curEnd--;
        newEnd--;
      }
      updating = true;
      cm.dispatch({
        changes: {
          from: start,
          to: curEnd,
          insert: newText.slice(start, newEnd),
        },
      });
      updating = false;
    }
  },
  { deep: true }
);

watch(
  () => props.selected,
  (selected) => {
    if (selected) {
      selectNode();
    }
  }
);

onMounted(() => {
  setupSplitView();
});

onBeforeUnmount(() => {
  destroyCodeMirror();
  previewRenderer = undefined;
});
</script>
<template>
  <node-view-wrapper
    class=":uno: mt-3 outline outline-1 outline-[#ccc] rounded overflow-hidden hover:outline-[#55c6a0] transition-all"
  >
    <div
      class=":uno: flex items-center justify-between px-3 py-2 bg-[#f5f7fa] border-b border-[#e4e7ed]"
      :class="{ ':uno: border-b-0': collapsed }"
    >
      <div
        class=":uno: flex items-center gap-2"
        @click.self="collapsed ? (collapsed = false) : null"
      >
        <button
          class=":uno: flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded cursor-pointer transition-all duration-200 text-[#606266] hover:bg-black/6 active:bg-black/10"
          @click.stop="collapsed = !collapsed"
        >
          <MingcuteRightSmallFill
            class=":uno: w-6 h-6 transition-transform duration-200"
            :class="{ ':uno: rotate-90': !collapsed }"
          />
        </button>
        <span class=":uno: text-sm font-medium text-[#606266]"
          >{{ blockLabel }} 编辑块</span
        >
      </div>

      <div class=":uno: flex gap-2">
        <VButton ghost type="secondary" size="sm" @click="toggleSplitMode">
          {{ isSplitMode ? "退出分屏" : "分屏" }}
        </VButton>
        <VButton v-if="!isSplitMode" size="sm" @click="togglePreviewMode">
          {{ isPreviewMode ? "编辑" : "预览" }}
        </VButton>
      </div>
    </div>

    <div
      class=":uno: min-h-[2em]"
      :class="[
        isSplitMode
          ? ':uno: flex flex-row gap-[1px] bg-[#e4e7ed] min-h-[400px]'
          : '',
        isPreviewMode && !isSplitMode ? ':uno: p-3' : '',
      ]"
      :style="{ display: collapsed ? 'none' : '' }"
      @dblclick="handleDoubleClick"
    >
      <template v-if="isSplitMode">
        <div
          ref="editorContainerRef"
          class=":uno: flex-1 min-w-0 bg-white overflow-auto flex flex-col"
        ></div>
        <div
          ref="previewContainerRef"
          class=":uno: flex-1 min-w-0 bg-white overflow-auto p-3 [&_.html-edited]:pointer-events-none [&_.markdown-edited]:pointer-events-none"
        ></div>
      </template>

      <template v-else>
        <div v-if="!isPreviewMode" ref="editorContainerRef"></div>
        <div v-else ref="previewContainerRef"></div>
      </template>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
:deep(.cm-editor) {
  min-height: 10em;
  height: 100%;
  flex: 1;
}

:deep(.cm-editor.cm-focused) {
  outline: none;
}

:deep(.cm-line) {
  color: #394047;
  line-height: 1.5rem;
}

:deep(.cm-gutters) {
  background: none;
  border: none;
  color: #ced4d9;
  line-height: 1.5rem;
  min-width: 2em;
}

:deep(.cm-lineNumbers) {
  min-width: 2em;
}

:deep(.cm-gutterElement) {
  min-width: 2em;
  text-align: right;
  padding-right: 0.5em;
  background-color: white;
}
</style>
