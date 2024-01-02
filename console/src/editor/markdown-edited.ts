import { findParentNode, isActive, mergeAttributes, Node } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { markRaw } from "vue";
import MdiLanguageMarkdown from "~icons/mdi/language-markdown";
import { CodeMirrorView } from "./code-mirror-view";
import { Fragment } from "@tiptap/pm/model";
import { markdown } from "@codemirror/lang-markdown";
import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { ToolboxItem } from "@halo-dev/richtext-editor";
import type { EditorState } from "@tiptap/pm/state";
import MdiPencilOutline from "~icons/mdi/pencil-outline";
import MdiDeleteForeverOutline from "~icons/mdi/delete-forever-outline?color=red";
import { deleteNode } from "@/utils/delete-node";
const temporaryDocument = document.implementation.createHTMLDocument();
const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
turndownService.keep([
  "audio",
  "button",
  "canvas",
  "cite",
  "datalist",
  "div",
  "figure",
  "iframe",
  "script",
  "source",
  "span",
  "style",
  "summary",
  "textarea",
  "video",
]);
turndownService.use(gfm);

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    MarkdownEdited: {
      addMarkdownEdited: () => ReturnType;
      setSelectMarkdownNode: () => ReturnType;
    };
  }
}

const MarkdownEdited = Node.create({
  name: "markdown_edited",

  content: "text*",

  group: "block",

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "markdown-edited",
      },
      getCommandMenuItems() {
        return {
          priority: 82,
          icon: markRaw(MdiLanguageMarkdown),
          title: "Markdown 编辑块",
          keywords: ["markdown", "编辑块"],
          command: ({ editor, range }: { editor: Editor; range: Range }) => {
            editor.chain().focus().deleteRange(range).addMarkdownEdited().run();
            editor.chain().setSelectMarkdownNode().run();
          },
        };
      },
      getToolboxItems({ editor }: { editor: Editor }) {
        return [
          {
            priority: 52,
            component: markRaw(ToolboxItem),
            props: {
              editor,
              icon: markRaw(MdiLanguageMarkdown),
              title: "Markdown 编辑块",
              action: () => {
                editor.chain().focus().addMarkdownEdited().run();
                editor.chain().setSelectMarkdownNode().run();
              },
            },
          },
        ];
      },
      getBubbleMenu() {
        return {
          pluginKey: "htmlEditedBubbleMenu",
          shouldShow: ({ state }: { state: EditorState }): boolean => {
            return isActive(state, MarkdownEdited.name);
          },
          items: [
            {
              priority: 10,
              props: {
                visible: ({ editor }: { editor: Editor }) => {
                  const { pos, parentOffset } =
                    editor.view.state.selection.$anchor;
                  const dom = editor.view.nodeDOM(pos - 1 - parentOffset);
                  if (!dom) {
                    return false;
                  }
                  return (dom as Element).classList.contains("preview");
                },
                icon: markRaw(MdiPencilOutline),
                title: "编辑",
                action: ({ editor }: { editor: Editor }) => {
                  editor.chain().setSelectMarkdownNode().run();
                },
              },
            },
            {
              priority: 100,
              props: {
                icon: markRaw(MdiDeleteForeverOutline),
                title: "删除",
                action: ({ editor }: { editor: Editor }) => {
                  deleteNode(MarkdownEdited.name, editor);
                },
              },
            },
          ],
        };
      },
      getDraggable() {
        return {
          getRenderContainer({ dom }: { dom: HTMLElement }) {
            let container = dom;
            while (
              container &&
              !container.classList.contains("hybrid-edit-block")
            ) {
              container = container.parentElement as HTMLElement;
            }
            return {
              el: container,
              dragDomOffset: {
                y: -5,
              },
            };
          },
          allowPropagationDownward: true,
        };
      },
    };
  },

  addNodeView() {
    return ({ editor, node, getPos }) =>
      new CodeMirrorView(editor, node, getPos as () => number, [markdown()]);
  },

  addCommands() {
    return {
      addMarkdownEdited:
        () =>
        ({ chain }) => {
          return chain().setNode(this.type).run();
        },
      setSelectMarkdownNode:
        () =>
        ({ chain, state }) => {
          const markdownNode = findParentNode(
            (node) => node.type.name === MarkdownEdited.name
          )(state.selection) as
            | {
                pos: number;
                start: number;
                depth: number;
              }
            | undefined;
          if (!markdownNode) {
            return false;
          }

          return chain().setNodeSelection(markdownNode.pos).run();
        },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[class=markdown-edited]",
        getContent: (node, schema) => {
          const htmlNode = node as HTMLElement;
          if (!htmlNode) {
            return Fragment.empty;
          }
          // html covert to markdown
          const markdown = turndownService.turndown(htmlNode.innerHTML);
          const textNode = schema.text(markdown);
          return Fragment.from(textNode);
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const content = node.content;
    if (!content.firstChild) {
      return ["div", mergeAttributes(HTMLAttributes, {})];
    }
    const container = temporaryDocument.createElement("div");
    container.classList.add("markdown-edited");
    // markdown covert to html
    container.innerHTML = marked.parse(content.firstChild.text || "");
    return {
      dom: container,
    };
  },
});

export default MarkdownEdited;
