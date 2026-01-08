import {
  findParentNode,
  isActive,
  mergeAttributes,
  Node,
  Fragment,
  ToolboxItem,
  VueNodeViewRenderer,
  type Editor,
  type Range,
  type EditorState,
  type ExtensionOptions,
} from "@halo-dev/richtext-editor";
import { markRaw } from "vue";
import MdiLanguageMarkdown from "~icons/mdi/language-markdown";
import CodeMirrorView from "./CodeMirrorView.vue";
import { markdown } from "@codemirror/lang-markdown";
import marked from "../utils/markdown";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import MdiDeleteForeverOutline from "~icons/mdi/delete-forever-outline?color=red";
import { deleteNode } from "../utils/delete-node";
const temporaryDocument = document.implementation.createHTMLDocument();
const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  blankReplacement: function (content, node) {
    if (node instanceof HTMLElement) {
      return node.outerHTML;
    }
    return content;
  },
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

declare module "@halo-dev/richtext-editor" {
  interface Commands<ReturnType> {
    MarkdownEdited: {
      addMarkdownEdited: () => ReturnType;
      setSelectMarkdownNode: () => ReturnType;
    };
  }
}

const MarkdownEdited = Node.create<ExtensionOptions>({
  name: "markdown_edited",

  content: "text*",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: (element) => !!element.getAttribute("collapsed"),
        renderHTML: (attributes) => {
          if (attributes.collapsed) {
            return {
              collapsed: attributes.collapsed,
            };
          }
          return {};
        },
      },
    };
  },

  addOptions() {
    return {
      HTMLAttributes: {
        class: "markdown-edited",
      },
      blockType: "markdown",
      extensions: [markdown()],
      getCommandMenuItems() {
        return {
          priority: 82,
          icon: markRaw(MdiLanguageMarkdown),
          title: "Markdown 编辑块",
          keywords: ["markdown", "编辑块"],
          command: ({ editor, range }: { editor: Editor; range: Range }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .addMarkdownEdited()
              .setSelectMarkdownNode()
              .run();
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
                editor
                  .chain()
                  .focus()
                  .addMarkdownEdited()
                  .setSelectMarkdownNode()
                  .run();
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
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(CodeMirrorView);
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
          let markdown = turndownService.turndown(htmlNode.innerHTML);
          if (!markdown) {
            markdown = "<br>";
          }
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
