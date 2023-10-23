import "./styles/index.css";
import { definePlugin } from "@halo-dev/console-shared";
import { TestEditedExtension, MarkdownEditedExtension } from "./editor";

export default definePlugin({
  components: {},
  routes: [],
  extensionPoints: {
    "default:editor:extension:create": () => {
      return [TestEditedExtension, MarkdownEditedExtension];
    },
  },
});
