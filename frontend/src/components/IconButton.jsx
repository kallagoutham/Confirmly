export function IconButton({ children, ...props }) {
  return (
    <button className="icon-button" type="button" {...props}>
      {children}
    </button>
  );
}
