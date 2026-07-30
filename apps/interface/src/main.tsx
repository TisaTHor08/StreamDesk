import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import { registerBuiltinWidgets } from "./widgets/builtin/index.js";
import { registerInterfacePlugins } from "./widgets/plugins.js";
import { App } from "./App.js";

registerBuiltinWidgets();
registerInterfacePlugins();

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
