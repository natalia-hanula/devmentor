import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "DevMentor",
    brandUrl: "./",
    brandTarget: "_self",
    fontBase: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
    fontCode: '"IBM Plex Mono", ui-monospace, monospace',
  }),
});
