export const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed", "no_show"];

export function emptyAppointmentForm() {
  const scheduled = new Date(Date.now() + 60 * 60 * 1000);
  scheduled.setMinutes(0, 0, 0);
  return {
    customer: "",
    title: "",
    scheduled_at: scheduled.toISOString().slice(0, 16),
    duration_minutes: 30,
    service_price: "0.00",
  };
}
