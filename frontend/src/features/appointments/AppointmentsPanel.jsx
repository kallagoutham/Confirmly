import { CalendarClock, ListFilter } from "lucide-react";
import { PanelTitle } from "../../components/PanelTitle";
import { SearchBox } from "../../components/SearchBox";
import { formatStatus } from "../../utils/formatters";
import { AppointmentForm } from "./AppointmentForm";
import { AppointmentList } from "./AppointmentList";
import { STATUS_OPTIONS } from "./appointmentDefaults";

export function AppointmentsPanel({
  appointments,
  customers,
  form,
  search,
  statusFilter,
  onCreate,
  onFormChange,
  onOpenTimeline,
  onSearch,
  onSearchSubmit,
  onStatusFilter,
  onTouchAppointment,
}) {
  return (
    <section className="panel wide">
      <PanelTitle icon={<CalendarClock size={18} />} title="Appointments" />
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={onSearch}
          onSubmit={onSearchSubmit}
          placeholder="Search appointments"
        />
        <label className="filter-control">
          <ListFilter size={16} />
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AppointmentForm
        customers={customers}
        form={form}
        onChange={onFormChange}
        onSubmit={onCreate}
      />
      <AppointmentList
        appointments={appointments}
        onOpenTimeline={onOpenTimeline}
        onTouchAppointment={onTouchAppointment}
      />
    </section>
  );
}
