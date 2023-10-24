import { findParentNode, isActive, mergeAttributes, Node } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { markRaw } from "vue";
import MdiLanguageHtml5 from "~icons/mdi/language-html5";
import MdiPencilOutline from "~icons/mdi/pencil-outline";
import { CodeMirrorView } from "./code-mirror-view";
import { Fragment } from "@tiptap/pm/model";
import { html } from "@codemirror/lang-html";
import { ToolboxItem } from "@halo-dev/richtext-editor";
import type { EditorState } from "@tiptap/pm/state";
import MdiDeleteForeverOutline from "~icons/mdi/delete-forever-outline?color=red";
import { deleteNode } from "../utils/delete-node";
import { lineNumbers } from "@codemirror/view";

const temporaryDocument = document.implementation.createHTMLDocument();
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlEdited: {
      addHtmlEdited: () => ReturnType;
      setSelectHtmlNode: () => ReturnType;
    };
  }
}

const HtmlEdited = Node.create({
  name: "html_edited",

  content: "text*",

  group: "block",

  defining: true,

  addOptions() {
    return {
      getCommandMenuItems() {
        return {
          priority: 81,
          icon: markRaw(MdiLanguageHtml5),
          title: "HTML 编辑",
          keywords: ["html", "编辑器"],
          command: ({ editor, range }: { editor: Editor; range: Range }) => {
            editor.chain().deleteRange(range).addHtmlEdited().run();
            editor.chain().setSelectHtmlNode().run();
          },
        };
      },
      getToolboxItems({ editor }: { editor: Editor }) {
        return [
          {
            priority: 51,
            component: markRaw(ToolboxItem),
            props: {
              editor,
              icon: markRaw(MdiLanguageHtml5),
              title: "HTML 编辑",
              action: () => {
                editor.chain().addHtmlEdited().run();
                editor.chain().setSelectHtmlNode().run();
              },
            },
          },
        ];
      },
      getBubbleMenu({ editor }: { editor: Editor }) {
        return {
          pluginKey: "htmlEditedBubbleMenu",
          shouldShow: ({ state }: { state: EditorState }): boolean => {
            return isActive(state, HtmlEdited.name);
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
                  editor.chain().setSelectHtmlNode().run();
                },
              },
            },
            {
              priority: 100,
              props: {
                icon: markRaw(MdiDeleteForeverOutline),
                title: "删除",
                action: ({ editor }: { editor: Editor }) => {
                  deleteNode(HtmlEdited.name, editor);
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
      new CodeMirrorView(editor, node, getPos as () => number, [
        html({
          matchClosingTags: true,
          autoCloseTags: true,
          selfClosingTags: true,
        }),
        lineNumbers(),
      ]);
  },

  addCommands() {
    return {
      addHtmlEdited:
        () =>
        ({ chain }) => {
          return chain().setNode(this.type).run();
        },
      setSelectHtmlNode:
        () =>
        ({ chain, state }) => {
          const htmlEditedNode = findParentNode(
            (node) => node.type.name === HtmlEdited.name
          )(state.selection) as
            | {
                pos: number;
                start: number;
                depth: number;
              }
            | undefined;
          if (!htmlEditedNode) {
            return false;
          }
          return chain().setNodeSelection(htmlEditedNode.pos).run();
        },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[class=html-edited]",
        getContent: (node, schema) => {
          const htmlNode = node as HTMLElement;
          if (!htmlNode) {
            return Fragment.empty;
          }
          const textNode = schema.text(htmlNode.innerHTML);
          return Fragment.from(textNode);
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const content = node.content;
    if (content.size === 0) {
      return ["div", mergeAttributes(HTMLAttributes, {})];
    }
    const container = temporaryDocument.createElement("div");
    container.classList.add("html-edited");
    container.innerHTML = content.toJSON()[0].text;
    return {
      dom: container,
    };
  },
});

export default HtmlEdited;
