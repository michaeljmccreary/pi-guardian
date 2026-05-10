function toDate(iso) {
  if (!iso) return null;
  return new Date(iso.replace(" ", "T") + "Z");
}

export function fmt(iso) {
  const d = toDate(iso);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function fmtTime(iso) {
  const d = toDate(iso);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}

export function relativeTime(iso) {
  const d = toDate(iso);
  if (!d) return "—";
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
