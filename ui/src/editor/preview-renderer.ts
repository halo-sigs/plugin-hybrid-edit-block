import marked from "../utils/markdown";

/**
 * 预览渲染器
 * 负责将 HTML 或 Markdown 内容渲染为预览
 */
export class PreviewRenderer {
  private blockType: string;
  private shadowRoot: ShadowRoot;

  constructor(blockType: string, container: HTMLElement) {
    this.blockType = blockType;
    // 创建 Shadow DOM 用于内容隔离
    this.shadowRoot = container.attachShadow({ mode: "closed" });
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

    this.shadowRoot.appendChild(previewNode);
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

  private clearContainer(): void {
    while (this.shadowRoot.firstChild) {
      this.shadowRoot.removeChild(this.shadowRoot.firstChild);
    }
  }

  setBlockType(blockType: string): void {
    this.blockType = blockType;
  }
}
