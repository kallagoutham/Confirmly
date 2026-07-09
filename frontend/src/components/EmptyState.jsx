export function EmptyState({ icon, title, message }) {
  return (
    <section className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{message}</p>
    </section>
  );
}
