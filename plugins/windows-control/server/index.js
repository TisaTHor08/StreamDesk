// @ts-check
/**
 * Server-side component of `windows-control`: declares every action, data
 * source and widget this plugin contributes. All actions execute on the
 * Connect (Windows machine) — see connect/index.js for the actual
 * PowerShell-backed implementations. This file only registers *contracts*
 * (input/output schemas, display names); it never talks to the OS itself,
 * per the "Server never references specific third-party software" rule —
 * the schemas below are generic shapes (a level, a boolean, a path), not
 * anything Windows-specific.
 *
 * @param {import("@streamdesk/server-sdk").ServerPluginContext} context
 */
export async function activate(context) {
  const PLUGIN_ID = "windows-control";

  /** @param {{id:string,displayName:string,description?:string,inputSchema?:object,outputSchema?:object}} def */
  const registerConnectAction = (def) =>
    context.actions.register({
      id: def.id,
      pluginId: PLUGIN_ID,
      displayName: def.displayName,
      description: def.description,
      inputSchema: def.inputSchema ?? { type: "object", additionalProperties: false },
      outputSchema: def.outputSchema,
      executionLocation: "connect",
    });

  /** @param {{id:string,displayName:string,description?:string,valueSchema:object}} def */
  const registerDataSource = (def) =>
    context.dataSources.register({
      id: def.id,
      pluginId: PLUGIN_ID,
      displayName: def.displayName,
      description: def.description,
      valueSchema: def.valueSchema,
      updateMode: "push",
    });

  const percentSchema = { type: "number", minimum: 0, maximum: 100 };

  /* ---------------------------- Fenêtre / applications ---------------------------- */

  registerDataSource({
    id: "windows.activeWindow.title",
    displayName: "Titre de la fenêtre active",
    valueSchema: { type: "string" },
  });
  registerDataSource({
    id: "windows.activeWindow.processName",
    displayName: "Application active",
    valueSchema: { type: "string" },
  });
  registerDataSource({
    id: "windows.runningApps",
    displayName: "Applications en cours (fenêtres visibles)",
    valueSchema: { type: "array", items: { type: "string" } },
  });

  registerConnectAction({
    id: "windows.open",
    displayName: "Ouvrir un fichier / une application / une URL",
    description: "Lance Start-Process sur le chemin donné : exécutable, document, dossier ou URL.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", minLength: 1, description: "Chemin, exécutable, ou URL à ouvrir." },
        args: { type: "string", description: "Arguments optionnels passés au programme." },
      },
      required: ["path"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", properties: { opened: { type: "boolean" } } },
  });

  registerConnectAction({
    id: "windows.app.focus",
    displayName: "Basculer vers une application",
    description: "Ramène au premier plan la première fenêtre trouvée pour ce nom de processus.",
    inputSchema: {
      type: "object",
      properties: { processName: { type: "string", minLength: 1 } },
      required: ["processName"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", properties: { focused: { type: "boolean" } } },
  });

  registerConnectAction({
    id: "windows.app.close",
    displayName: "Fermer une application",
    description: "Termine tous les processus correspondant à ce nom (sans confirmation).",
    inputSchema: {
      type: "object",
      properties: { processName: { type: "string", minLength: 1 } },
      required: ["processName"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", properties: { closed: { type: "boolean" } } },
  });

  /* --------------------------------- Audio (sortie) -------------------------------- */

  registerDataSource({ id: "windows.audio.volume", displayName: "Volume (sortie)", valueSchema: percentSchema });
  registerDataSource({ id: "windows.audio.muted", displayName: "Sourdine (sortie)", valueSchema: { type: "boolean" } });

  registerConnectAction({
    id: "windows.volume.set",
    displayName: "Régler le volume",
    description: "Fixe le volume de sortie par défaut (0-100).",
    inputSchema: { type: "object", properties: { level: percentSchema }, required: ["level"], additionalProperties: false },
    outputSchema: { type: "object", properties: { level: percentSchema } },
  });

  registerConnectAction({
    id: "windows.volume.mute.toggle",
    displayName: "Muet / son (basculer)",
    description: "Bascule la sourdine du périphérique de sortie par défaut.",
    outputSchema: { type: "object", properties: { muted: { type: "boolean" } } },
  });

  /* --------------------------------- Audio (micro) ---------------------------------- */

  registerDataSource({ id: "windows.mic.volume", displayName: "Volume (micro)", valueSchema: percentSchema });
  registerDataSource({ id: "windows.mic.muted", displayName: "Micro coupé", valueSchema: { type: "boolean" } });

  registerConnectAction({
    id: "windows.mic.volume.set",
    displayName: "Régler le volume du micro",
    inputSchema: { type: "object", properties: { level: percentSchema }, required: ["level"], additionalProperties: false },
    outputSchema: { type: "object", properties: { level: percentSchema } },
  });

  registerConnectAction({
    id: "windows.mic.mute.toggle",
    displayName: "Couper / activer le micro",
    outputSchema: { type: "object", properties: { muted: { type: "boolean" } } },
  });

  /* ----------------------------------- Luminosité ------------------------------------ */

  registerDataSource({
    id: "windows.brightness",
    displayName: "Luminosité de l'écran",
    description: "Écran interne uniquement (WMI). Les écrans externes ne sont généralement pas pilotables sans DDC/CI.",
    valueSchema: percentSchema,
  });

  registerConnectAction({
    id: "windows.brightness.set",
    displayName: "Régler la luminosité",
    description: "Écran interne uniquement — voir la limitation ci-dessus.",
    inputSchema: { type: "object", properties: { level: percentSchema }, required: ["level"], additionalProperties: false },
    outputSchema: { type: "object", properties: { level: percentSchema } },
  });

  /* -------------------------------------- Wi-Fi --------------------------------------- */

  registerDataSource({ id: "windows.wifi.enabled", displayName: "Wi-Fi activé", valueSchema: { type: "boolean" } });
  registerDataSource({ id: "windows.wifi.connected", displayName: "Wi-Fi connecté", valueSchema: { type: "boolean" } });
  registerDataSource({ id: "windows.wifi.ssid", displayName: "Réseau Wi-Fi (SSID)", valueSchema: { type: "string" } });

  registerConnectAction({
    id: "windows.wifi.set",
    displayName: "Activer / désactiver le Wi-Fi",
    description: "Nécessite généralement des droits administrateur sur le Connect.",
    inputSchema: { type: "object", properties: { enabled: { type: "boolean" } }, required: ["enabled"], additionalProperties: false },
    outputSchema: { type: "object", properties: { enabled: { type: "boolean" } } },
  });
  registerConnectAction({
    id: "windows.wifi.toggle",
    displayName: "Wi-Fi (basculer)",
    description: "Nécessite généralement des droits administrateur sur le Connect.",
    outputSchema: { type: "object", properties: { enabled: { type: "boolean" } } },
  });

  /* --------------------------------- Périphériques audio -------------------------------- */

  registerConnectAction({
    id: "windows.audioDevice.setEnabled",
    displayName: "Activer / désactiver un périphérique audio",
    description:
      "Active ou désactive (Gestionnaire de périphériques) le premier périphérique audio dont le nom contient " +
      "le texte donné — casque, micro, haut-parleurs... Nécessite les droits administrateur.",
    inputSchema: {
      type: "object",
      properties: { nameContains: { type: "string", minLength: 1 }, enabled: { type: "boolean" } },
      required: ["nameContains", "enabled"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", properties: { enabled: { type: "boolean" }, deviceName: { type: "string" } } },
  });
  registerConnectAction({
    id: "windows.audioDevice.toggle",
    displayName: "Périphérique audio (basculer)",
    description: "Comme ci-dessus, mais bascule l'état actuel. Nécessite les droits administrateur.",
    inputSchema: {
      type: "object",
      properties: { nameContains: { type: "string", minLength: 1 } },
      required: ["nameContains"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", properties: { enabled: { type: "boolean" }, deviceName: { type: "string" } } },
  });

  /* ------------------------------------ Alimentation ------------------------------------ */

  registerConnectAction({ id: "windows.power.lock", displayName: "Verrouiller la session" });
  registerConnectAction({ id: "windows.power.sleep", displayName: "Mettre en veille" });
  registerConnectAction({
    id: "windows.power.shutdown",
    displayName: "Éteindre",
    inputSchema: { type: "object", properties: { delaySeconds: { type: "integer", minimum: 0, maximum: 3600 } }, additionalProperties: false },
  });
  registerConnectAction({
    id: "windows.power.restart",
    displayName: "Redémarrer",
    inputSchema: { type: "object", properties: { delaySeconds: { type: "integer", minimum: 0, maximum: 3600 } }, additionalProperties: false },
  });
  registerConnectAction({ id: "windows.power.signOut", displayName: "Fermer la session" });

  /* --------------------------------------- Média ----------------------------------------- */

  registerConnectAction({ id: "windows.media.playPause", displayName: "Lecture / Pause" });
  registerConnectAction({ id: "windows.media.next", displayName: "Piste suivante" });
  registerConnectAction({ id: "windows.media.previous", displayName: "Piste précédente" });
  registerConnectAction({ id: "windows.media.stop", displayName: "Stop" });

  /* --------------------------------- Divers / productivité -------------------------------- */

  registerConnectAction({
    id: "windows.clipboard.setText",
    displayName: "Copier du texte dans le presse-papier",
    inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false },
  });

  registerConnectAction({
    id: "windows.notification.show",
    displayName: "Afficher une notification Windows",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string", minLength: 1 }, message: { type: "string", minLength: 1 } },
      required: ["title", "message"],
      additionalProperties: false,
    },
  });

  /* ------------------------------------- Système (jauges) -------------------------------- */

  registerDataSource({ id: "windows.system.cpuUsage", displayName: "Utilisation CPU", valueSchema: percentSchema });
  registerDataSource({
    id: "windows.system.gpuUsage",
    displayName: "Utilisation GPU",
    description: "Somme des compteurs de performance \"GPU Engine\" (moteurs 3D) — approximatif, dépend du pilote.",
    valueSchema: percentSchema,
  });
  registerDataSource({ id: "windows.system.ramUsage", displayName: "Utilisation RAM", valueSchema: percentSchema });
  registerDataSource({
    id: "windows.system.diskUsage",
    displayName: "Utilisation disque système",
    valueSchema: percentSchema,
  });

  context.logger.info("windows-control server component activated");
}
