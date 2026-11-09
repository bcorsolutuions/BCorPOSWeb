"use client";

import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Generic SignalR hub connector shared by KDS, live dashboard tiles, and
 * the notifications hub (see 07-api-structure.md). Reconnects
 * automatically and re-attaches the current JWT on each (re)negotiation
 * so a token refresh mid-session doesn't kill the socket.
 */
/**
 * NEXT_PUBLIC_SIGNALR_URL is fixed at build/start time, but the same dev server can be opened from more than one address
 * (http://127.0.0.17:3000 on the PC itself, http://192.168.1.38:3000 from a phone). When the configured host is the machine
 * (loopback / LAN), use the host the page was actually opened from, so the live connection follows the page. A real server
 * address (e.g. production's 157.10.99.82) is used exactly as configured.
 */
function hubBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SIGNALR_URL ?? "";
  if (!configured || typeof window === "undefined") return configured;
  try {
    const u = new URL(configured);
    if (/^(localhost$|127\.|192\.168\.|10\.)/.test(u.hostname)) {
      u.hostname = window.location.hostname;
      return u.toString().replace(/\/$/, "");
    }
  } catch {
    /* not an absolute URL - use as is */
  }
  return configured;
}

export function useSignalRHub(
  hubPath: string,
  handlers: Record<string, (...args: unknown[]) => void>,
  /** Called once per (re)connect — e.g. `(conn) => conn.invoke("JoinKitchen", compId, siteId, kitchenCode)`. */
  onConnected?: (connection: signalR.HubConnection) => void,
) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // React StrictMode (next.config.mjs: reactStrictMode) double-invokes
    // this effect in dev — mount, cleanup, mount — to catch missing
    // cleanup. The first mount's connection gets stop()ped by the
    // StrictMode cleanup before start() resolves; SignalR's own internal
    // logger reports that as an Error-level "stopped during negotiation"
    // message regardless of what our own .catch() does with it. Dropping
    // its internal log level to Critical silences that dev-only artifact
    // (the second, surviving connection still logs real failures via our
    // own .catch() below) — StrictMode's double-invoke doesn't happen in
    // production builds, so this race doesn't occur there either.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${hubBaseUrl()}${hubPath}`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
        // Auth here is the bearer token above, not cookies — the SignalR JS
        // client otherwise defaults to withCredentials: true, which the
        // backend's AllowAnyOrigin() CORS policy can't satisfy (browsers
        // block credentialed cross-origin responses under AllowAnyOrigin,
        // surfacing as an opaque "Failed to fetch" on negotiate).
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Critical)
      .build();

    let cancelled = false;

    Object.entries(handlers).forEach(([event, handler]) => connection.on(event, handler));
    // Re-join the group on every reconnect, not just the first connect —
    // a dropped/restored connection loses prior group membership server-side.
    connection.onreconnected(() => onConnected?.(connection));

    connection
      .start()
      .then(() => {
        if (!cancelled) onConnected?.(connection);
      })
      .catch((err) => {
        if (!cancelled) console.error(`SignalR connection to ${hubPath} failed`, err);
      });
    connectionRef.current = connection;

    return () => {
      cancelled = true;
      connection.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubPath, accessToken]);

  return connectionRef;
}
