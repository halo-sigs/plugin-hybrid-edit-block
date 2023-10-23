import { findParentNode, mergeAttributes, Node } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { markRaw } from "vue";
import MdiLanguageMarkdown from "~icons/mdi/language-markdown";
import { CodeMirrorView } from "./code-mirror-view";
import { Fragment } from "@tiptap/pm/model";
import { markdown } from "@codemirror/lang-markdown";
import { marked } from "marked";
import TurndownService from "turndown";
import { ToolboxItem } from "@halo-dev/richtext-editor";
const temporaryDocument = document.implementation.createHTMLDocument();
const turndownService = new TurndownService();

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    MarkdownEdited: {
      addMarkdownEdited: () => ReturnType;
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
          title: "Markdown 编辑",
          keywords: ["markdown"],
          command: ({ editor, range }: { editor: Editor; range: Range }) => {
            editor.chain().focus().deleteRange(range).addMarkdownEdited().run();
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
              title: "HTML 编辑",
              action: () => {
                editor.chain().focus().addMarkdownEdited().run();
              },
            },
          },
        ];
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
