import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare, Edit, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { Customer } from "@shared/schema";
import CustomerDetailsDialog from "@/components/CustomerDetailsDialog";
import BulkDeleteCustomersDialog from "@/components/BulkDeleteCustomersDialog";
import DuplicateCustomersDialog from "@/components/DuplicateCustomersDialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomerTableProps {
  customers: Customer[];
  onMessage: (customerId: string) => void;
  onEdit: (customer: Customer) => void;
}

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
};

export default function CustomerTable({ customers, onMessage, onEdit }: CustomerTableProps) {
  const [search, setSearch] = useState("");
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return await apiRequest('DELETE', `/api/admin/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: "Customer deleted",
        description: "The customer has been successfully deleted.",
      });
      setDeletingCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="p-6" data-testid="card-customer-table">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground">Customers</h3>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
            <DuplicateCustomersDialog />
            <BulkDeleteCustomersDialog customers={customers} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Points</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Total Spent</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tag</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const initials = customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <tr key={customer.id} className="border-b hover-elevate" data-testid={`row-customer-${customer.id}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={customer.photo ?? undefined} alt={customer.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{customer.phone}</td>
                    <td className="py-3 px-4 text-muted-foreground text-sm" data-testid={`text-email-${customer.id}`}>
                      {customer.email || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={tierColors[customer.tier as keyof typeof tierColors]} data-testid={`badge-tier-${customer.id}`}>
                        {customer.tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold text-primary" data-testid={`text-points-${customer.id}`}>
                      {customer.points}
                    </td>
                    <td className="py-3 px-4 text-foreground">฿{Number(customer.totalSpent).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      {customer.tag ? (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-tag-${customer.id}`}>
                          {customer.tag}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => setDetailsCustomer(customer)}
                          variant="ghost"
                          size="sm"
                          data-testid={`button-details-${customer.id}`}
                          title="View all imported fields"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => onEdit(customer)}
                          variant="ghost"
                          size="sm"
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => onMessage(customer.id)}
                          variant="ghost"
                          size="sm"
                          data-testid={`button-message-${customer.id}`}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setDeletingCustomer(customer)}
                          variant="ghost"
                          size="sm"
                          data-testid={`button-delete-${customer.id}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <CustomerDetailsDialog 
        customer={detailsCustomer}
        open={!!detailsCustomer}
        onOpenChange={(open: boolean) => !open && setDetailsCustomer(null)}
      />

      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingCustomer?.name}</strong> ({deletingCustomer?.phone})?
              <br /><br />
              This will permanently delete:
              <ul className="list-disc list-inside mt-2">
                <li>Customer profile and all personal information</li>
                <li>Transaction history (฿{Number(deletingCustomer?.totalSpent || 0).toLocaleString()})</li>
                <li>Points balance ({deletingCustomer?.points} points)</li>
                <li>Message history and notifications</li>
              </ul>
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
