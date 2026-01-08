import "uno.css";
import { definePlugin } from "@halo-dev/console-shared";

export default definePlugin({
  components: {},
  routes: [],
  extensionPoints: {
    "default:editor:extension:create": async () => {
      const { HTMLEditedExtension, MarkdownEditedExtension } = await import(
        "./editor/index"
      );
      return [HTMLEditedExtension, MarkdownEditedExtension];
    },
  },
});
