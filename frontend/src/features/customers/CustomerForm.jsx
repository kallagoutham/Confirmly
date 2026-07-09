import { Plus } from "lucide-react";

export function CustomerForm({ form, onChange, onSubmit }) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <input
        required
        value={form.name}
        onChange={(event) => onChange({ ...form, name: event.target.value })}
        placeholder="Customer name"
      />
      <input
        required
        type="email"
        value={form.email}
        onChange={(event) => onChange({ ...form, email: event.target.value })}
        placeholder="Email"
      />
      <input
        value={form.phone}
        onChange={(event) => onChange({ ...form, phone: event.target.value })}
        placeholder="Phone"
      />
      <button className="primary" type="submit">
        <Plus size={16} /> Add customer
      </button>
    </form>
  );
}
