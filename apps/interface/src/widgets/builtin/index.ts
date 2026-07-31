import { createInterfacePluginContext } from "../context.js";
import { ButtonWidget } from "./ButtonWidget.js";
import { TextWidget } from "./TextWidget.js";
import { NavigationWidget } from "./NavigationWidget.js";
import { ContainerWidget } from "./ContainerWidget.js";

/** Registers StreamDesk's standard widgets (section 4.2 of the spec). */
export function registerBuiltinWidgets(): void {
  const context = createInterfacePluginContext("core", "0.1.0");

  context.widgets.register({
    type: "core.button",
    pluginId: "core",
    displayName: "Bouton",
    propertiesSchema: {
      type: "object",
      properties: { label: { type: "string" }, icon: { type: "object", format: "icon" } },
    },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: ButtonWidget,
  });

  context.widgets.register({
    type: "core.text",
    pluginId: "core",
    displayName: "Texte",
    propertiesSchema: {
      type: "object",
      properties: { label: { type: "string" }, format: { type: "string" } },
    },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: TextWidget,
  });

  context.widgets.register({
    type: "core.navigation",
    pluginId: "core",
    displayName: "Navigation",
    propertiesSchema: {
      type: "object",
      properties: { label: { type: "string" }, targetSlug: { type: "string" } },
      required: ["targetSlug"],
    },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: NavigationWidget,
  });

  context.widgets.register({
    type: "core.container",
    pluginId: "core",
    displayName: "Conteneur",
    propertiesSchema: {
      type: "object",
      properties: { label: { type: "string" } },
    },
    defaultSize: { columnSpan: 2, rowSpan: 2 },
    component: ContainerWidget,
  });
}
