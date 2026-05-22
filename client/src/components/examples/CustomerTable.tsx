import CustomerTable from '../CustomerTable';
import { Customer } from '@shared/schema';

export default function CustomerTableExample() {
  return (
    <CustomerTable
      onMessage={(customer: Customer) => console.log("Message:", customer.id)}
      onEdit={(customer: Customer) => console.log("Edit:", customer.id)}
    />
  );
}
