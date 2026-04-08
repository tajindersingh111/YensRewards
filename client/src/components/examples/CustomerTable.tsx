import CustomerTable from '../CustomerTable';

export default function CustomerTableExample() {
  return (
    <CustomerTable
      onMessage={(customer) => console.log("Message:", customer.id)}
      onEdit={(customer) => console.log("Edit:", customer.id)}
    />
  );
}
