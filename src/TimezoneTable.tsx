import { DateTime } from "luxon";

export default function TimezoneTable({
  now,
  zones,
}: {
  now: DateTime;
  zones: string[];
}) {
  if (!zones || zones.length === 0) return null;

  const baseZone = zones[0];
  const baseStart = now.setZone(baseZone).startOf("day");
  const hours = Array.from({ length: 24 }, (_, hour) =>
    baseStart.plus({ hour })
  );

  const currentHour = now.setZone(baseZone).hour;

  return (
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
          {zones.map((zone) => (
            <th key={zone} style={{ padding: "4px 8px", textAlign: "left" }}>
              {zone}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hours.map((hour, i) => {
          const isCurrent = i === currentHour;
          const isNight = i >= 22 || i < 6;
          return (
            <tr key={i}
              style={{
                borderTop: "1px solid #444",
                backgroundColor: isCurrent
                  ? "#003300"
                  : isNight
                  ? "#000"
                  : "transparent",
                color: isNight ? "#aaa" : "#eee",
              }}
            >
              {zones.map((zone) => {
                const local = hour.setZone(zone, { keepLocalTime: false });
                return (
                  <td key={zone}>
                    {local.toFormat("HH:mm")}
                  </td>
                );
              })}
            </tr>
          )})
        }
      </tbody>
    </table>
  );
}
