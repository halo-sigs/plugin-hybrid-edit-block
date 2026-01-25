import {
  defineConfig,
  presetIcons,
  presetWind3,
  transformerCompileClass,
} from "unocss";
export default defineConfig({
  presets: [presetWind3(), presetIcons()],
  transformers: [transformerCompileClass()],
});
