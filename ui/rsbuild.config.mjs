import { rsbuildConfig } from "@halo-dev/ui-plugin-bundler-kit";
import { pluginSass } from "@rsbuild/plugin-sass";
import Icons from "unplugin-icons/rspack";
import { pluginVue } from "@rsbuild/plugin-vue";
import { UnoCSSRspackPlugin } from "@unocss/webpack/rspack";

export default rsbuildConfig({
  rsbuild: {
    resolve: {
      alias: {
        "@": "./src",
      },
    },
    plugins: [pluginSass(), pluginVue()],
    tools: {
      rspack: {
        plugins: [
          Icons({ compiler: "vue3" }),
          UnoCSSRspackPlugin({ configFile: "./uno.config.ts" }),
        ],
      },
    },
  },
});
