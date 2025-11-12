import { useEffect, useId, useMemo, useState } from "react";

export default function ZoneSelect({
  value,
  onChange,
  zones,
  placeholder,
}: {
  value: string;
  onChange: (z: string) => void;
  zones: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const id = useId();
  const listId = `${id}-zones`;

  // Detect mobile/touch environment once on mount
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsMobile(mq.matches);
  }, []);

  const filteredZones = useMemo(
    () =>
      zones
        .filter((z) => z.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 200),
    [zones, query]
  );

  // --- Mobile version (native <select>) ---
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label
          htmlFor={listId}
          style={{
            fontSize: "12px",
            color: "#999",
          }}
        >
          Add Timezone
        </label>
        <select
          id={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid #555",
            background: "#111",
            color: "#eee",
          }}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // --- Desktop version (input + datalist) ---
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label
        htmlFor={listId}
        style={{
          fontSize: "12px",
          color: "#999",
        }}
      >
        Add Timezone
      </label>
      <input
        id={listId}
        type="text"
        value={query}
        list={listId}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || "Search…"}
        style={{
          width: "100%",
          padding: "6px 10px",
          border: "1px solid #555",
          borderRadius: "6px",
          background: "#111",
          color: "#eee",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const first = filteredZones[0];
            if (first) {
              onChange(first);
              setQuery("");
            }
          }
        }}
      />
      <datalist id={listId}>
        {filteredZones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </div>
  );
}
