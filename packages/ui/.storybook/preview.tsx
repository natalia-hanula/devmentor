import type { Preview } from "@storybook/react-vite";
import { GLOBALS_UPDATED, SET_GLOBALS } from "storybook/internal/core-events";
import { addons } from "storybook/preview-api";
import { create } from "storybook/theming";
import { applyTheme } from "./theme";
import "./preview.css";

// Strony MDX nie mają dekoratorów — motyw dla nich ustawiamy z kanału globals.
const channel = addons.getChannel();
const onGlobals = ({ globals }: { globals: Record<string, unknown> }) => applyTheme(globals.theme);
channel.on(SET_GLOBALS, onGlobals);
channel.on(GLOBALS_UPDATED, onGlobals);

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => {
      applyTheme(context.globals.theme);
      return <Story />;
    },
  ],
  parameters: {
    // Naruszenie dostępności kończy test błędem (prompt, etap 1).
    a11y: { test: "error" },
    controls: { expanded: true },
    // Strony dokumentacji tym samym krojem co produkt (W02).
    docs: {
      theme: create({
        base: "light",
        fontBase: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
        fontCode: '"IBM Plex Mono", ui-monospace, monospace',
      }),
    },
    // Szerokości z promptu (etap 1): 320, 768, 1440 px.
    viewport: {
      options: {
        narrow: { name: "320 px", styles: { width: "320px", height: "640px" }, type: "mobile" },
        tablet: { name: "768 px", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        desktop: { name: "1440 px", styles: { width: "1440px", height: "900px" }, type: "desktop" },
      },
    },
    options: {
      storySort: {
        order: [
          "Design system",
          ["Start here", "Components", "How to choose", "Usage and accessibility", "Content", "What to avoid", "What is missing", "Contributing", "Epics"],
          "Foundations",
          ["Color", "Typography", "Spacing and layout", "Shape and depth", "Motion", "Icons", "Themes"],
          "Primitives",
          "Product",
          "Patterns",
        ],
      },
    },
  },
};

export default preview;
