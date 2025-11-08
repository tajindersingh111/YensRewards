import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare, Edit } from "lucide-react";
import { useState } from "react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: "bronze" | "silver" | "gold";
  totalSpent: number;
  photo?: string;
}

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

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="p-6" data-testid="card-customer-table">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Customers</h3>
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Points</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Total Spent</th>
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
                          <AvatarImage src={customer.photo} alt={customer.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{customer.phone}</td>
                    <td className="py-3 px-4">
                      <Badge className={tierColors[customer.tier]} data-testid={`badge-tier-${customer.id}`}>
                        {customer.tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold text-primary" data-testid={`text-points-${customer.id}`}>
                      {customer.points}
                    </td>
                    <td className="py-3 px-4 text-foreground">฿{customer.totalSpent.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
