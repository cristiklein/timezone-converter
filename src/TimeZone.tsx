import { useEffect, useMemo, useState } from "react";
import { DateTime, IANAZone } from "luxon";
import ZoneSelect from "./ZoneSelect";
import TimezoneTable from "./TimezoneTable";

/**
 * TimeZ — single-file React timezone converter
 * Tailwind CSS recommended. No backend required.
 *
 * Features
 * - Source time + zone → live conversions to a chosen set of zones
 * - Add/remove zones, reorder via keyboard, 12/24h toggle, copy share-link
 * - Handles DST, ambiguous/invalid times, and date rollover (+1 / -1 day)
 * - Persists UI state to URL query params
 */

const DEFAULT_ZONES = [
  "Europe/Stockholm",
  "America/Phoenix",
  "Europe/Bucharest",
];

const safeSupportedTimeZones = (): string[] => {
  // Chrome/Edge/Safari/Firefox support Intl.supportedValuesOf('timeZone').
  // If not available, fall back to a short curated list.
  // We also filter invalid zones (per luxon) just in case.
  // @ts-ignore
  const list: string[] = typeof Intl.supportedValuesOf === "function"
    ? // @ts-ignore
      (Intl.supportedValuesOf("timeZone") as string[])
    : [
        "UTC",
        "Europe/Stockholm",
        "Europe/London",
        "America/New_York",
        "America/Los_Angeles",
        "Asia/Tokyo",
        "Asia/Singapore",
        "Australia/Sydney",
        "Europe/Berlin",
        "Europe/Paris",
      ];
  return list.filter((z) => IANAZone.isValidZone(z));
};

function useQueryState<T>(key: string, initial: T, encode: (v: T) => string, decode: (s: string | null) => T) {
  const [state, setState] = useState<T>(() => decode(new URLSearchParams(location.search).get(key)));
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = encode(state);
    if (v) params.set(key, v); else params.delete(key);
    const qs = params.toString();
    const url = qs ? `${location.pathname}?${qs}` : location.pathname;
    window.history.replaceState(null, "", url);
  }, [key, state]);
  return [state, setState] as const;
}

const fmtTime = (dt: DateTime, use12h: boolean) => dt.toFormat(use12h ? "hh:mm a" : "HH:mm");

function useLiveUTC() {
  const [nowUTC, setNowUTC] = useState(DateTime.utc());

  useEffect(() => {
    const id = setInterval(() => setNowUTC(DateTime.utc()), 10_000);
    return () => clearInterval(id);
  }, []);

  return nowUTC;
}

export default function TimeZ() {
  const allZones = useMemo(() => safeSupportedTimeZones(), []);

  // --- URL-backed state ---
  const [use12h] = useQueryState<boolean>(
    "h12",
    false,
    (v) => (v ? "1" : ""),
    (s) => s === "1"
  );

  const [zones, setZones] = useQueryState<string[]>(
    "zones",
    DEFAULT_ZONES,
    (arr) => arr.join(","),
    (s) => {
      const parsed = (s?.split(",") || DEFAULT_ZONES).filter((z) => IANAZone.isValidZone(z));
      return parsed.length ? parsed : DEFAULT_ZONES;
    }
  );

  // --- Clock ---
  const nowUTC = useLiveUTC();

  // Precompute conversions for the header list
  const conversions = useMemo(() => {
    return zones.map((z) => {
      const inZone = nowUTC.setZone(z, { keepLocalTime: false });
      const dayDelta = inZone.startOf("day").diff(nowUTC.startOf("day"), "days").days;
      return { zone: z, dt: inZone, dayDelta: Math.trunc(dayDelta) };
    });
  }, [zones]);

  // --- Actions ---
  const addZone = (z: string) => setZones([...new Set([...zones, z])]);
  const removeZone = (z: string) => setZones(zones.filter((x) => x !== z));
  const moveZone = (z: string, dir: -1 | 1) => {
    const i = zones.indexOf(z);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= zones.length) return;
    const copy = zones.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setZones(copy);
  };

  const copyLink = async () => {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard");
    } catch {
      // fallback UI-less
    }
  };

  return (
    <div style={{
      padding: '5px',
    }}>
      <header>
        <h1 style={{
          fontSize: '24px',
        }}>Timezone Converter</h1>
      </header>

      <section>
        <TimezoneTable now={nowUTC} zones={zones} />
        <button onClick={copyLink}>
          Copy link to clipboard
        </button>
      </section>

      <section>
        <h2>Configure timezones</h2>
        <ZoneSelect
          value=""
          onChange={(z) => z && addZone(z)}
          zones={allZones.filter((z) => !zones.includes(z))}
          placeholder="Search…"
        />

        <div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr>
                <th>Timezone</th>
                <th>Local time</th>
                <th>Offset</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map(({ zone, dt, dayDelta }) => (
                <tr key={zone} style={{
                  borderTop: "1px solid #444",
                }}>
                  <td>
                    <div>{zone}</div>
                  </td>
                  <td style={{ padding: "0px 10px" }}>
                    <div>{fmtTime(dt, use12h)}</div>
                    <div>{dt.toFormat("ccc, dd LLL yyyy")}{dayDelta === 0 ? "" : dayDelta > 0 ? "  (+1 day)" : "  (−1 day)"}</div>
                  </td>
                  <td style={{ padding: "0px 10px" }}>UTC{dt.toFormat("ZZ")}</td>
                  <td>
                    <div>
                      <button title="Move up" onClick={() => moveZone(zone, -1)}>↑</button>
                      <button title="Move down" onClick={() => moveZone(zone, 1)}>↓</button>
                       <button title="Remove" onClick={() => removeZone(zone)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        Built with <a href="https://moment.github.io/luxon/" target="_blank" rel="noreferrer">Luxon</a> & Intl API. No tracking.
      </footer>
    </div>
  );
}
