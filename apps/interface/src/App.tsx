import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@streamdesk/ui-kit";
import { ConnectionProvider } from "./state/ConnectionProvider.js";
import { DeckView } from "./deck/DeckView.js";
import { AdminLayout } from "./admin/AdminLayout.js";
import { OverviewView } from "./admin/OverviewView.js";
import { PagesListView } from "./admin/PagesListView.js";
import { PageEditorView } from "./admin/PageEditorView.js";
import { PluginsView } from "./admin/PluginsView.js";
import { DevicesView } from "./admin/DevicesView.js";

export function App() {
  return (
    <ThemeProvider mode="dark">
      <ConnectionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DeckView />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<OverviewView />} />
              <Route path="pages" element={<PagesListView />} />
              <Route path="pages/:id" element={<PageEditorView />} />
              <Route path="plugins" element={<PluginsView />} />
              <Route path="devices" element={<DevicesView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConnectionProvider>
    </ThemeProvider>
  );
}
