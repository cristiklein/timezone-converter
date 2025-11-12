import React, { useEffect, useId, useMemo, useState } from "react";
import { DateTime, IANAZone } from "luxon";
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

const parseISOish = (s: string) => {
  // Accepts "YYYY-MM-DDTHH:mm" from <input type="datetime-local">
  // Returns Luxon DateTime in the browser's zone (plain wall time)
  const dt = DateTime.fromISO(s);
  return dt.isValid ? dt : DateTime.local();
};

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
  const [use12h, setUse12h] = useQueryState<boolean>(
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-start md:items-center flex-col md:flex-row gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Timezone Converter</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button onClick={copyLink} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm shadow">
              Copy link
            </button>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={use12h} onChange={(e) => setUse12h(e.target.checked)} />
              12‑hour clock
            </label>
          </div>
        </header>

        <section className="mt-6 grid md:grid-cols-[1fr_320px] gap-6">
          <aside className="bg-slate-900 rounded-2xl p-4 shadow space-y-4">
            <div>
              <h2 className="text-base font-semibold mb-2">Configure timezones</h2>
              <ZoneSelect
                value=""
                onChange={(z) => z && addZone(z)}
                zones={allZones.filter((z) => !zones.includes(z))}
                placeholder="Search…"
              />
            </div>
          </aside>

          <div className="bg-slate-900 rounded-2xl p-4 shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="text-left font-medium py-2">Timezone</th>
                  <th className="text-left font-medium py-2">Local time</th>
                  <th className="text-left font-medium py-2">Offset</th>
                  <th className="text-left font-medium py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map(({ zone, dt, dayDelta }) => (
                  <tr key={zone} className="border-b border-slate-800">
                    <td className="py-2 align-middle">
                      <div className="font-medium">{zone}</div>
                      <div className="text-xs text-slate-400">{dt.offsetNameShort || dt.toFormat("ZZ")}</div>
                    </td>
                    <td className="py-2 align-middle">
                      <div className="font-mono text-base">{fmtTime(dt, use12h)}</div>
                      <div className="text-xs text-slate-400">{dt.toFormat("ccc, dd LLL yyyy")}{dayDelta === 0 ? "" : dayDelta > 0 ? "  (+1 day)" : "  (−1 day)"}</div>
                    </td>
                    <td className="py-2 align-middle">UTC{dt.toFormat("ZZ")}</td>
                    <td className="py-2 align-middle">
                      <div className="flex items-center gap-1">
                        <button title="Move up" onClick={() => moveZone(zone, -1)} className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700">↑</button>
                        <button title="Move down" onClick={() => moveZone(zone, 1)} className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700">↓</button>
                         <button title="Remove" onClick={() => removeZone(zone)} className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-700/70">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">Current Time</h2>
          <TimezoneTable now={nowUTC} zones={zones} />
        </section>

        <footer className="mt-8 text-xs text-slate-500">
          Built with <a className="underline" href="https://moment.github.io/luxon/" target="_blank" rel="noreferrer">Luxon</a> & Intl API. No tracking.
        </footer>
      </div>
    </div>
  );
}

function ZoneSelect({ value, onChange, zones, placeholder }: { value: string; onChange: (z: string) => void; zones: string[]; placeholder?: string; }) {
  const [query, setQuery] = useState("");
  const id = useId(); // unique per component instance
  const inputId = `${id}-add-timezone`;
  const options = useMemo(() =>
    zones
      .filter((z) => z.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 200), [zones, query]
  );

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
        Add Timezone:
      </label>
      <input
        id={inputId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || "Search…"}
        className="w-full bg-slate-800 rounded-xl px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-slate-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const first = options[0];
            if (first) {
              onChange(first);
              setQuery("");
            }
          }
        }}
        list="tz-datalist"
      />
      <datalist id="tz-datalist">
        {options.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </div>
  );
}
