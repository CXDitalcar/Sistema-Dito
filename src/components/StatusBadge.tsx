export default function StatusBadge({ value }: { value: string }) {
  const n = (value || "").toLowerCase()
  const cls = n.includes("no cumple") ? "bad" : n.includes("cumple") ? "ok" : n.includes("solicit") ? "requested" : "neutral"
  return <span className={`status ${cls}`}>{value || "Sin estado"}</span>
}
