import { RefreshCw } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../utils/formatters";

export function AppointmentList({
  appointments,
  onOpenTimeline,
  onTouchAppointment,
}) {
  return (
    <div className="table">
      {appointments.map((appointment) => (
        <article className="appointment-row" key={appointment.id}>
          <div>
            <strong>{appointment.title}</strong>
            <span>{appointment.customer_detail?.name}</span>
          </div>
          <time>{formatDate(appointment.scheduled_at)}</time>
          <StatusBadge status={appointment.status} />
          <span>${Number(appointment.service_price).toFixed(2)}</span>
          <button
            className="ghost"
            type="button"
            onClick={() => onOpenTimeline(appointment)}
          >
            Timeline
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => onTouchAppointment(appointment)}
            title="Touch appointment"
          >
            <RefreshCw size={15} />
          </button>
        </article>
      ))}
    </div>
  );
}
