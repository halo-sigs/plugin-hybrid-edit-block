import "./styles/index.scss";
import { definePlugin } from "@halo-dev/console-shared";
import { HTMLEditedExtension, MarkdownEditedExtension } from "./editor";

export default definePlugin({
  components: {},
  routes: [],
  extensionPoints: {
    "default:editor:extension:create": () => {
      return [HTMLEditedExtension, MarkdownEditedExtension];
    },
  },
});
