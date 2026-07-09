import { formatStatus } from "../utils/formatters";

export function StatusBadge({ status }) {
  return <span className={`status ${status}`}>{formatStatus(status)}</span>;
}
