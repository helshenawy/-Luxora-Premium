import { defineConfig } from "vite";
import { resolve } from "path";

const entry = process.env.ENTRY || "main";

const entries = {
  main: {
    entry: resolve(__dirname, "assets/js/main.js"),
    name: "VitrinTheme",
    fileName: "theme"
  },
  cart: {
    entry: resolve(__dirname, "assets/js/cart/controller.js"),
    name: "CartController",
    fileName: "cart-controller"
  }
};

const config = entries[entry] || entries.main;

export default defineConfig({
  build: {
    outDir: "assets/dist",
    emptyOutDir: entry === "main",
    sourcemap: process.env.NODE_ENV !== "production",
    minify: process.env.NODE_ENV === "production",
    lib: {
      entry: config.entry,
      name: config.name,
      formats: ["iife"],
      fileName: () => `${config.fileName}.js`
    }
  }
});
