import { Plus } from "lucide-react";

export function AppointmentForm({ customers, form, onChange, onSubmit }) {
  return (
    <form className="appointment-form" onSubmit={onSubmit}>
      <select
        required
        value={form.customer}
        onChange={(event) =>
          onChange({ ...form, customer: event.target.value })
        }
      >
        <option value="">Customer</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </select>
      <input
        required
        value={form.title}
        onChange={(event) => onChange({ ...form, title: event.target.value })}
        placeholder="Appointment title"
      />
      <input
        required
        type="datetime-local"
        value={form.scheduled_at}
        onChange={(event) =>
          onChange({ ...form, scheduled_at: event.target.value })
        }
      />
      <input
        min="1"
        required
        type="number"
        value={form.duration_minutes}
        onChange={(event) =>
          onChange({ ...form, duration_minutes: event.target.value })
        }
        placeholder="Minutes"
      />
      <input
        min="0"
        step="0.01"
        type="number"
        value={form.service_price}
        onChange={(event) =>
          onChange({ ...form, service_price: event.target.value })
        }
        placeholder="Price"
      />
      <button className="primary" type="submit">
        <Plus size={16} /> Schedule
      </button>
    </form>
  );
}
