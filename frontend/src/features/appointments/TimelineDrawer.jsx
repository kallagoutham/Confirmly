import { X } from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { formatDate, formatStatus } from "../../utils/formatters";

export function TimelineDrawer({ appointment, events, onClose }) {
  return (
    <aside className="drawer">
      <div className="drawer-header">
        <div>
          <h3>{appointment.title}</h3>
          <p>{appointment.customer_detail?.name}</p>
        </div>
        <IconButton onClick={onClose} title="Close timeline">
          <X size={18} />
        </IconButton>
      </div>
      <div className="timeline">
        {events.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          events.map((event) => (
            <article className="event" key={event.id}>
              <span>{formatStatus(event.event_type)}</span>
              <time>{formatDate(event.created_at)}</time>
              <small>{event.actor_type}</small>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
