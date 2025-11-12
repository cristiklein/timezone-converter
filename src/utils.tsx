export function shortZone(z: string) {
  if (!z.includes("/")) return z; // e.g., UTC
  const parts = z.split("/");
  return parts[parts.length - 1].replace(/_/g, " "); // e.g., New_York → New York
};

