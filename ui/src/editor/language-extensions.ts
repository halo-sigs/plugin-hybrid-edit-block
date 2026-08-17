import type { Extension } from "@codemirror/state";

export interface HtmlLanguageOptions {
  matchClosingTags?: boolean;
  autoCloseTags?: boolean;
  selfClosingTags?: boolean;
}

/**
 * Lazy-load the CodeMirror language extensions for the given block type.
 *
 * CodeMirror and its language packages are heavy, so they are only loaded
 * when a hybrid edit block actually needs to mount its embedded editor.
 */
export async function loadLanguageExtensions(
  blockType: string,
  htmlOptions: HtmlLanguageOptions = {}
): Promise<Extension[]> {
  if (blockType === "markdown") {
    const [{ markdown }, { markdownTableExtension }] = await Promise.all([
      import("@codemirror/lang-markdown"),
      import("./markdown-table"),
    ]);
    return [markdown(), markdownTableExtension()];
  }

  const [{ html }, { lineNumbers }] = await Promise.all([
    import("@codemirror/lang-html"),
    import("@codemirror/view"),
  ]);
  return [html(htmlOptions), lineNumbers()];
}
