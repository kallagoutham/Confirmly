import { X } from "lucide-react";

export function Banner({ children, tone = "success", onDismiss }) {
  return (
    <div className={`banner ${tone === "error" ? "error" : ""}`}>
      <span>{children}</span>
      <button type="button" onClick={onDismiss} title="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
