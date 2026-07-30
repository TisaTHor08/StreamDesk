import type Database from "better-sqlite3";
import { PagesRepository } from "./pages.repo.js";
import { InterfacesRepository } from "./interfaces.repo.js";
import { ConnectsRepository } from "./connects.repo.js";
import { PluginsRepository } from "./plugins.repo.js";
import { PluginStorageRepository, PluginSettingsRepository } from "./plugin-storage.repo.js";
import { ExecutionsRepository } from "./executions.repo.js";
import { EventsRepository } from "./events.repo.js";
import { DataSourcesRepository } from "./datasources.repo.js";
import { PairingRepository } from "./pairing.repo.js";

export type Repositories = {
  pages: PagesRepository;
  interfaces: InterfacesRepository;
  connects: ConnectsRepository;
  plugins: PluginsRepository;
  pluginStorage: PluginStorageRepository;
  pluginSettings: PluginSettingsRepository;
  executions: ExecutionsRepository;
  events: EventsRepository;
  dataSources: DataSourcesRepository;
  pairing: PairingRepository;
};

export function createRepositories(db: Database.Database): Repositories {
  return {
    pages: new PagesRepository(db),
    interfaces: new InterfacesRepository(db),
    connects: new ConnectsRepository(db),
    plugins: new PluginsRepository(db),
    pluginStorage: new PluginStorageRepository(db),
    pluginSettings: new PluginSettingsRepository(db),
    executions: new ExecutionsRepository(db),
    events: new EventsRepository(db),
    dataSources: new DataSourcesRepository(db),
    pairing: new PairingRepository(db),
  };
}

export * from "./pages.repo.js";
export * from "./interfaces.repo.js";
export * from "./connects.repo.js";
export * from "./plugins.repo.js";
export * from "./plugin-storage.repo.js";
export * from "./executions.repo.js";
export * from "./events.repo.js";
export * from "./datasources.repo.js";
export * from "./pairing.repo.js";
