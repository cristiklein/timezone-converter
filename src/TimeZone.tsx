import React, { useEffect, useMemo, useState } from "react";
import { DateTime, IANAZone } from "luxon";

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
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Stockholm",
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
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

  const [srcZone, setSrcZone] = useQueryState<string>(
    "src",
    zones[0] || DEFAULT_ZONES[0],
    (v) => v,
    (s) => (s && IANAZone.isValidZone(s) ? s : (zones[0] || DEFAULT_ZONES[0]))
  );

  const [rawLocal, setRawLocal] = useQueryState<string>(
    "t",
    DateTime.local().toFormat("yyyy-LL-dd'T'HH:mm"),
    (v) => v,
    (s) => s || DateTime.local().toFormat("yyyy-LL-dd'T'HH:mm")
  );

  // Derived DateTime in source zone: interpret the wall time from the input
  // as if it were in srcZone.
  const srcWall = useMemo(() => {
    const parsed = parseISOish(rawLocal);
    return DateTime.fromObject(
      {
        year: parsed.year,
        month: parsed.month,
        day: parsed.day,
        hour: parsed.hour,
        minute: parsed.minute,
      },
      { zone: srcZone }
    );
  }, [rawLocal, srcZone]);

  const conversions = useMemo(() => {
    return zones.map((z) => {
      const inZone = srcWall.setZone(z, { keepLocalTime: false });
      const dayDelta = inZone.startOf("day").diff(srcWall.startOf("day"), "days").days;
      return { zone: z, dt: inZone, dayDelta: Math.trunc(dayDelta) };
    });
  }, [zones, srcWall]);

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

  const nowInSrc = () => {
    const now = DateTime.now().setZone(srcZone);
    setRawLocal(now.toFormat("yyyy-LL-dd'T'HH:mm"));
  };

  // Keep srcZone present in zones for context
  useEffect(() => {
    if (!zones.includes(srcZone)) setZones([srcZone, ...zones]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcZone]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-start md:items-center flex-col md:flex-row gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">TimeZ — Timezone Converter</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={use12h} onChange={(e) => setUse12h(e.target.checked)} />
              12‑hour clock
            </label>
            <button onClick={copyLink} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm shadow">
              Copy link
            </button>
          </div>
        </header>

        <section className="grid md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-end bg-slate-900 rounded-2xl p-4 shadow">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Source zone</label>
              <ZoneSelect value={srcZone} onChange={setSrcZone} zones={allZones} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Date & time</label>
              <input
                type="datetime-local"
                className="w-full bg-slate-800 rounded-xl px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-slate-500"
                value={rawLocal}
                onChange={(e) => setRawLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={nowInSrc} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow">Now in source</button>
          </div>
        </section>

        <section className="mt-6 grid md:grid-cols-[1fr_320px] gap-6">
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
                        {zone !== srcZone && (
                          <button title="Remove" onClick={() => removeZone(zone)} className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-700/70">✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="bg-slate-900 rounded-2xl p-4 shadow space-y-4">
            <div>
              <h2 className="text-base font-semibold mb-2">Add timezone</h2>
              <ZoneSelect
                value=""
                onChange={(z) => z && addZone(z)}
                zones={allZones.filter((z) => !zones.includes(z))}
                placeholder="Search…"
              />
              <p className="text-xs text-slate-400 mt-2">Total zones: {zones.length}</p>
            </div>
            <div className="text-xs text-slate-400">
              <p className="mb-2">Tips</p>
              <ul className="list-disc ml-4 space-y-1">
                <li><kbd className="px-1 rounded bg-slate-800">↑</kbd>/<kbd className="px-1 rounded bg-slate-800">↓</kbd> to reorder (use buttons)</li>
                <li>Use the 12‑hour toggle for AM/PM format</li>
                <li>Click <em>Copy link</em> to share your exact view</li>
              </ul>
            </div>
          </aside>
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
  const options = useMemo(() =>
    zones
      .filter((z) => z.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 200), [zones, query]
  );

  return (
    <div className="relative">
      <input
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
      <div className="mt-2">
        <select
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery("");
          }}
          className="w-full bg-slate-800 rounded-xl px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-slate-500"
        >
          {options.length === 0 && <option value="" disabled>No matches</option>}
          {options.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
