import { Search } from "lucide-react";

export function SearchBox({ value, onChange, onSubmit, placeholder }) {
  return (
    <form
      className="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Search size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </form>
  );
}
