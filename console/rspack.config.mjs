// ⚠️ IMPORTANT: Using rspack to build Halo plugins is just an attempt by the Halo team.
// Currently, it is still recommended to refer to https://github.com/halo-dev/plugin-starter
// Using Vite

import { defineConfig } from "@rspack/cli";
import path from "path";
import Icons from "unplugin-icons/rspack";
import * as sassEmbedded from "sass-embedded";
import process from "process";

const isProduction = process.env.NODE_ENV === "production";

const outDir = isProduction
  ? "../src/main/resources/console"
  : "../build/resources/main/console";

export default defineConfig({
  mode: isProduction ? "production" : "development",
  entry: {
    main: "./src/index.ts",
  },
  plugins: [
    Icons({
      compiler: "vue3",
    }),
  ],
  output: {
    publicPath: "/plugins/hybrid-edit-block/assets/console/",
    chunkFilename: "[id]-[hash:8].js",
    cssFilename: "style.css",
    path: path.resolve(outDir),
    library: {
      type: "window",
      export: "default",
      name: "hybrid-edit-block",
    },
    clean: true,
    iife: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  optimization: {
    providedExports: false,
  },
  experiments: {
    css: true,
  },
  devtool: false,
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: {
              syntax: "typescript",
            },
          },
        },
        type: "javascript/auto",
      },
      {
        test: /\.(sass|scss)$/,
        use: [
          {
            loader: "sass-loader",
            options: {
              api: "modern-compiler",
              implementation: sassEmbedded,
            },
          },
        ],
        type: "css/auto",
      },
    ],
  },
  externals: {
    vue: "Vue",
    "vue-router": "VueRouter",
    "@vueuse/core": "VueUse",
    "@vueuse/components": "VueUse",
    "@vueuse/router": "VueUse",
    "@halo-dev/console-shared": "HaloConsoleShared",
    "@halo-dev/components": "HaloComponents",
    "@halo-dev/api-client": "HaloApiClient",
    "@halo-dev/richtext-editor": "RichTextEditor",
    axios: "axios",
  },
});
