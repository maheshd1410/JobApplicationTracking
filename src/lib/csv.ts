function escapeCsvValue(value: string) {
  if (value.includes("\"")) {
    value = value.replace(/\"/g, "\"\"");
  }
  if (/[\n,]/.test(value)) {
    return `"${value}"`;
  }
  return value;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const header = columns.join(",");
  const lines = rows.map((row) => {
    return columns
      .map((col) => {
        const raw = row[col];
        if (raw === null || raw === undefined) return "";
        return escapeCsvValue(String(raw));
      })
      .join(",");
  });

  return [header, ...lines].join("\n");
}
