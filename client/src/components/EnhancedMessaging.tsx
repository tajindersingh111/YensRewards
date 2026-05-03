import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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

const tierColors: Record<string, string> = {
  gold: "bg-amber-50 text-amber-700 border-amber-200",
  silver: "bg-slate-50 text-slate-700 border-slate-200",
  bronze: "bg-orange-50 text-orange-700 border-orange-200",
  platinum: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function EnhancedMessaging() {
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [quickSearch, setQuickSearch] = useState("");

  const { data, isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/filter', filters],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/admin/customers/filter', filters);
      return response as unknown as Customer[];
    },
  });

  const customers = Array.isArray(data) ? data : [];

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
    if (checked) newSelection.add(customerId);
    else newSelection.delete(customerId);
    setSelectedCustomerIds(newSelection);
  };

  const handleFiltersApply = () => {
    refetch();
    setSelectedCustomerIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Target Audience Card */}
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        {/* Branded Header */}
        <div className="bg-blue-900 px-8 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
              <Users className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Target Audience</h2>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em] mt-1.5">Select customers to send messages to</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCustomerIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCustomerIds(new Set())}
                className="font-black uppercase text-[10px] tracking-widest rounded-xl border-white/20 text-white bg-white/10"
                data-testid="button-clear-selection"
              >
                <X className="w-3 h-3 mr-1" />
                Clear ({selectedCustomerIds.size})
              </Button>
            )}
            <CustomerFilterDialog filters={filters} onFiltersChange={setFilters} onApply={handleFiltersApply} />
          </div>
        </div>

        <CardContent className="p-8 space-y-4">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Quick search by name, phone, or email..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-100 bg-slate-50"
              data-testid="input-quick-search"
            />
          </div>

          {/* Results Summary */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" data-testid="text-results-count">
              {displayedCustomers.length} customer{displayedCustomers.length !== 1 ? "s" : ""}
            </span>
            {selectedCustomerIds.size > 0 && (
              <Badge className="bg-yellow-400 text-blue-900 font-black border-none text-[9px] uppercase" data-testid="badge-selection-count">
                {selectedCustomerIds.size} Selected
              </Badge>
            )}
          </div>

          {/* Customer Table */}
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-900/5 border-none">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={displayedCustomers.length > 0 && selectedCustomerIds.size === displayedCustomers.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Name</TableHead>
                  <TableHead className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Contact</TableHead>
                  <TableHead className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Tier</TableHead>
                  <TableHead className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Points</TableHead>
                  <TableHead className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : displayedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      No customers found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCustomers.map((customer: Customer) => (
                    <TableRow key={customer.id} className="hover:bg-blue-50/30 transition-colors" data-testid={`row-customer-${customer.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomerIds.has(customer.id)}
                          onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                          data-testid={`checkbox-customer-${customer.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-black text-blue-900 text-sm uppercase tracking-tight">{customer.name}</TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-600">{customer.phone}</div>
                          {customer.email && <div className="text-slate-400 font-medium">{customer.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${tierColors[customer.tier] || ""} font-black text-[9px] uppercase border-2`} data-testid={`badge-tier-${customer.id}`}>
                          {customer.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-blue-900">{customer.points}</TableCell>
                      <TableCell className="font-black text-blue-900">฿{parseFloat(customer.totalSpent).toFixed(2)}</TableCell>
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
          onSuccess={() => setSelectedCustomerIds(new Set())}
        />
      )}
    </div>
  );
}
