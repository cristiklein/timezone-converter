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

  return (
    <table className="w-full text-sm text-slate-200">
      <thead>
        <tr>
          {zones.map((zone) => (
            <th key={zone} className="px-3 py-2 text-left text-slate-400">
              {zone}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hours.map((hour, i) => (
          <tr key={i} className="border-t border-slate-800">
            {zones.map((zone) => {
              const local = hour.setZone(zone, { keepLocalTime: false });
              return (
                <td key={zone} className="px-3 py-2 font-mono text-slate-100">
                  {local.toFormat("HH:mm")}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
