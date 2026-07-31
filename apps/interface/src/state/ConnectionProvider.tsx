import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DeckPage, WidgetInteractionTrigger } from "@streamdesk/shared-types";
import type { ServerNotificationPayload } from "@streamdesk/protocol";
import { ServerConnection, type BoundValues, type ConnectionState } from "../ws/connection.js";
import { uuid } from "../lib/uuid.js";

export type Notification = ServerNotificationPayload & { id: string };

type ConnectionContextValue = {
  state: ConnectionState;
  page: DeckPage | null;
  boundValues: BoundValues;
  notifications: Notification[];
  requestPage(request: { pageId?: string; slug?: string }): void;
  interact(widgetId: string, trigger: WidgetInteractionTrigger, inputOverride?: Record<string, unknown>): void;
  dismissNotification(id: string): void;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function useConnection(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection must be used within <ConnectionProvider>");
  return ctx;
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const connectionRef = useRef<ServerConnection>();
  if (!connectionRef.current) connectionRef.current = new ServerConnection();
  const connection = connectionRef.current;

  const [state, setState] = useState<ConnectionState>("connecting");
  const [page, setPage] = useState<DeckPage | null>(null);
  const [boundValues, setBoundValues] = useState<BoundValues>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    connection.setListener({
      onStateChange: (nextState) => {
        setState(nextState);
        // On every (re)connect, the Server already sends the admin-configured
        // default page automatically (see server's registerInterface ->
        // sendPageSnapshot). A "?page=<slug>" in the URL — e.g. the admin's
        // "Aperçu" link, or a bookmark/QR code aimed at a specific page —
        // overrides that default. Re-checked on every reconnect (not just
        // once) so a network blip doesn't bounce the operator back to the
        // default page.
        if (nextState === "connected") {
          const slug = new URLSearchParams(window.location.search).get("page");
          if (slug) connection.requestPage({ slug });
        }
      },
      onPage: (nextPage) => {
        setPage(nextPage);
        setBoundValues({});
      },
      onWidgetValue: (widgetId, property, value) => {
        setBoundValues((prev) => ({ ...prev, [widgetId]: { ...prev[widgetId], [property]: value } }));
      },
      onNotification: (notification) => {
        const id = uuid();
        setNotifications((prev) => [...prev, { ...notification, id }]);
        window.setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 5000);
      },
    });
    connection.connect();

    const onResize = () => connection.updateViewport();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      // React 18 StrictMode runs this effect's setup, then this cleanup,
      // then the setup again, once, in dev — specifically to catch a
      // missing "undo what setup just did" cleanup like this one used to
      // be. Without it, the mount->cleanup->remount cycle left the first
      // WebSocket open but orphaned (this.socket had already moved on to a
      // second one), which then closed on its own and triggered an
      // automatic reconnect — a loop visible in the Server's own logs as
      // the same Interface registering over and over. connect()'s own
      // idempotency guard (see connection.ts) means calling close() here
      // and connect() again on remount just cleanly replaces the socket
      // instead of leaking one.
      connection.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ConnectionContextValue>(
    () => ({
      state,
      page,
      boundValues,
      notifications,
      requestPage: (request) => connection.requestPage(request),
      interact: (widgetId, trigger, inputOverride) => {
        if (!page) return;
        connection.interact(page.id, widgetId, trigger, inputOverride);
      },
      dismissNotification: (id) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
    }),
    [state, page, boundValues, notifications, connection],
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}
