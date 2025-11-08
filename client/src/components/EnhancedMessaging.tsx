import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CustomerFilterDialog from "./CustomerFilterDialog";
import BulkMessageComposer from "./BulkMessageComposer";
import { Users, Search, X } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  tier: string;
  totalSpent: string;
  birthday: string | null;
  createdAt: string;
}

interface CustomerFilters {
  tier?: string[];
  minSpend?: number;
  maxSpend?: number;
  minPoints?: number;
  maxPoints?: number;
  searchQuery?: string;
}

export default function EnhancedMessaging() {
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [quickSearch, setQuickSearch] = useState("");

  // Fetch filtered customers
  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/filter', filters],
  });

  // Apply quick search filter on top of backend filters
  const displayedCustomers = customers.filter((customer: Customer) => {
    if (!quickSearch) return true;
    const search = quickSearch.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.phone.includes(search) ||
      (customer.email && customer.email.toLowerCase().includes(search))
    );
  });

  const selectedCustomers = displayedCustomers.filter((c: Customer) => selectedCustomerIds.has(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomerIds(new Set(displayedCustomers.map(c => c.id)));
    } else {
      setSelectedCustomerIds(new Set());
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    const newSelection = new Set(selectedCustomerIds);
    if (checked) {
      newSelection.add(customerId);
    } else {
      newSelection.delete(customerId);
    }
    setSelectedCustomerIds(newSelection);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "gold":
        return "bg-yellow-400 text-yellow-900";
      case "silver":
        return "bg-gray-400 text-gray-900";
      case "bronze":
        return "bg-amber-600 text-amber-50";
      default:
        return "bg-gray-300 text-gray-900";
    }
  };

  const handleFiltersApply = () => {
    refetch();
    setSelectedCustomerIds(new Set()); // Clear selections when filters change
  };

  const handleClearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Target Audience Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Target Audience
              </CardTitle>
              <CardDescription>
                Select customers to send messages to
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {selectedCustomerIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  data-testid="button-clear-selection"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear ({selectedCustomerIds.size})
                </Button>
              )}
              <CustomerFilterDialog
                filters={filters}
                onFiltersChange={setFilters}
                onApply={handleFiltersApply}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Quick search by name, phone, or email..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="pl-10"
              data-testid="input-quick-search"
            />
          </div>

          {/* Results Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span data-testid="text-results-count">
              Showing {displayedCustomers.length} customer{displayedCustomers.length !== 1 ? "s" : ""}
            </span>
            {selectedCustomerIds.size > 0 && (
              <Badge variant="default" data-testid="badge-selection-count">
                {selectedCustomerIds.size} Selected
              </Badge>
            )}
          </div>

          {/* Customer Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={displayedCustomers.length > 0 && selectedCustomerIds.size === displayedCustomers.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : displayedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No customers found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCustomers.map((customer: Customer) => (
                    <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomerIds.has(customer.id)}
                          onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                          data-testid={`checkbox-customer-${customer.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            📱 <span className="text-muted-foreground">{customer.phone}</span>
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-2">
                              ✉️ <span className="text-muted-foreground text-xs">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(customer.tier)} data-testid={`badge-tier-${customer.id}`}>
                          {customer.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.points}</TableCell>
                      <TableCell>฿{parseFloat(customer.totalSpent).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Message Composer */}
      {selectedCustomers.length > 0 && (
        <BulkMessageComposer
          selectedCustomers={selectedCustomers}
          onSuccess={handleClearSelection}
        />
      )}
    </div>
  );
}
