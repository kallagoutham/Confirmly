import { UsersRound } from "lucide-react";
import { PanelTitle } from "../../components/PanelTitle";
import { SearchBox } from "../../components/SearchBox";
import { CustomerForm } from "./CustomerForm";
import { CustomerList } from "./CustomerList";

export function CustomersPanel({
  customers,
  form,
  search,
  onCreate,
  onFormChange,
  onSearch,
  onSearchSubmit,
}) {
  return (
    <section className="panel">
      <PanelTitle icon={<UsersRound size={18} />} title="Customers" />
      <SearchBox
        value={search}
        onChange={onSearch}
        onSubmit={onSearchSubmit}
        placeholder="Search customers"
      />
      <CustomerForm form={form} onChange={onFormChange} onSubmit={onCreate} />
      <CustomerList customers={customers} />
    </section>
  );
}
