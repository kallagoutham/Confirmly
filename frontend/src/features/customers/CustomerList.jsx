export function CustomerList({ customers }) {
  return (
    <div className="list">
      {customers.map((customer) => (
        <article className="list-item" key={customer.id}>
          <div>
            <strong>{customer.name}</strong>
            <span>{customer.email}</span>
          </div>
          <small>{customer.phone || "No phone"}</small>
        </article>
      ))}
    </div>
  );
}
