import { FilterXSS, escapeAttrValue } from "xss";
import marked from "../utils/markdown";

const editorViewXSS = new FilterXSS({
  onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
    if (isWhiteAttr) {
      return `${name}="${value}"`;
    }
    if (name == "href" || name == "src" || name == "style") {
      return `${name}="${escapeAttrValue(value)}"`;
    }
    return `${name}="${value}"`;
  },
});

/**
 * 预览渲染器
 * 负责将 HTML 或 Markdown 内容渲染为预览
 */
export class PreviewRenderer {
  private blockType: string;
  private container: HTMLElement;

  constructor(blockType: string, container: HTMLElement) {
    this.blockType = blockType;
    this.container = container;
  }

  /**
   * 渲染内容到预览容器
   *
   * @param content 要渲染的内容（文本或 DOM 节点）
   */
  render(content: string | Node): void {
    this.clearContainer();

    let previewNode: HTMLElement;

    if (typeof content === "string") {
      previewNode = this.createPreviewFromText(content);
    } else {
      previewNode = content.cloneNode(true) as HTMLElement;
    }

    this.cleanupPreview(previewNode);

    this.container.appendChild(previewNode);
  }

  private createPreviewFromText(text: string): HTMLElement {
    const container = document.createElement("div");

    if (this.blockType === "markdown") {
      container.classList.add("markdown-edited");
      const htmlContent = marked.parse(text || "");
      container.innerHTML = htmlContent;
    } else {
      container.classList.add("html-edited");
      container.innerHTML = text;
    }

    return container;
  }

  /**
   * 清理预览内容（移除危险标签和 XSS 过滤）
   */
  private cleanupPreview(node: HTMLElement): void {
    // 移除 script 和 style 标签
    Array.from(node.querySelectorAll("script, style")).forEach((element) => {
      element.remove();
    });

    // 防止编辑器执行 xss 相关代码
    const filterHTML = editorViewXSS.process(node.innerHTML);
    node.innerHTML = filterHTML;
  }

  private clearContainer(): void {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  setBlockType(blockType: string): void {
    this.blockType = blockType;
  }
}
