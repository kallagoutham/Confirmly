export function PanelTitle({ icon, title }) {
  return (
    <div className="panel-title">
      {icon}
      <h3>{title}</h3>
    </div>
  );
}
