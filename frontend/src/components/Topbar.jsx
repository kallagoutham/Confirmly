export function Topbar({ title, subtitle, action }) {
  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
