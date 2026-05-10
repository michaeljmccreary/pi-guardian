import Pill from "./Pill";

const TONE = {
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "slate",
  info: "emerald",
};

const LABEL = { info: "open" };

export default function SeverityBadge({ severity }) {
  return (
    <Pill tone={TONE[severity] || "slate"}>{LABEL[severity] || severity}</Pill>
  );
}
