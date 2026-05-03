/* LEF'S SENIOR STAFF CUSTOMER TABLE UPDATE */
/* Changes: Yens Blue branding, High-legibility totals, and ecosystem-ready status badges */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageSquare, Edit, Eye, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Phone, Trophy, Users } from "lucide-react";
import { SiLine } from "react-icons/si";
import { useState, useEffect } from "react";
import { Customer } from "@shared/schema";
import CustomerDetailsDialog from "@/components/CustomerDetailsDialog";
import BulkDeleteCustomersDialog from "@/components/BulkDeleteCustomersDialog";
import DuplicateCustomersDialog from "@/components/DuplicateCustomersDialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SortField = 'name' | 'totalSpent' | 'points' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface CustomerTableProps {
  onMessage: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
}

const tierColors = {
  bronze: "bg-orange-50 text-orange-700 border-orange-200",
  silver: "bg-slate-50 text-slate-700 border-slate-200",
  gold: "bg-amber-50 text-amber-700 border-amber-200",
  platinum: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function CustomerTable({ onMessage, onEdit }: CustomerTableProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-yellow-400" /> : <ArrowDown className="w-3 h-3 ml-1 text-yellow-400" />;
  };

  const { data, isLoading } = useQuery<{ data: Customer[]; totalCount: number }>({
    queryKey: ['/api/admin/customers', page, pageSize, debouncedSearch, sortBy, sortOrder, tierFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString(), sortBy, sortOrder });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (tierFilter && tierFilter !== 'all') params.append('tier', tierFilter);
      const response = await fetch(`/api/admin/customers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
  });

  const customers = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(page * pageSize, totalCount);

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => await apiRequest('DELETE', `/api/admin/customers/${customerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Removed", description: "Customer deleted from ecosystem." });
      setDeletingCustomer(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* ── Branded Header ── */}
      <div className="bg-blue-900 rounded-lg p-6 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-400 rounded-lg p-2.5">
            <Users className="h-5 w-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Member Database</h2>
            <p className="text-blue-300 text-sm" data-testid="badge-customer-count">{totalCount} ecosystem members</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
            <input
              placeholder="Search members..."
              className="pl-9 h-9 rounded-md border border-white/20 bg-white/10 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 w-52"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-customers"
            />
          </div>
          <Select value={tierFilter} onValueChange={(value) => { setTierFilter(value); setPage(1); }}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white text-xs font-bold" data-testid="select-tier-filter">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
          <DuplicateCustomersDialog />
          <BulkDeleteCustomersDialog customers={customers} />
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white" data-testid="card-customer-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-900">
              <tr className="border-none">
                <th className="text-left py-5 px-6 text-[10px] font-black text-blue-300 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('name')} data-testid="header-sort-name">
                  <div className="flex items-center gap-1">NAME / CONTACT <SortIcon field="name" /></div>
                </th>
                <th className="text-left py-5 px-6 text-[10px] font-black text-blue-300 uppercase tracking-widest">STATUS / TIER</th>
                <th className="text-right py-5 px-6 text-[10px] font-black text-blue-300 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('points')} data-testid="header-sort-points">
                  <div className="flex items-center justify-end gap-1">LOYALTY POINTS <SortIcon field="points" /></div>
                </th>
                <th className="text-right py-5 px-6 text-[10px] font-black text-blue-300 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('totalSpent')} data-testid="header-sort-total-spent">
                  <div className="flex items-center justify-end gap-1">LIFETIME VALUE <SortIcon field="totalSpent" /></div>
                </th>
                <th className="text-right py-5 px-6 text-[10px] font-black text-blue-300 uppercase tracking-widest">MANAGEMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="py-24 text-center font-black text-slate-300 tracking-tighter text-xl">SYNCING ECOSYSTEM...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center font-black text-slate-300">NO MEMBERS FOUND</td></tr>
              ) : customers.map((customer) => {
                const initials = customer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={customer.id} className="hover:bg-blue-50/50 transition-colors group" data-testid={`row-customer-${customer.id}`}>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                          <AvatarImage src={customer.photo ?? undefined} />
                          <AvatarFallback className="bg-blue-900 text-white font-black text-sm">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-black text-slate-900 text-base leading-tight uppercase">{customer.name}</p>
                          <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col gap-1.5 items-start">
                        <Badge variant="outline" className={`${tierColors[customer.tier as keyof typeof tierColors]} font-black px-3 py-0.5 rounded-lg uppercase text-[9px] border-2`} data-testid={`badge-tier-${customer.id}`}>
                          <Trophy className="w-3 h-3 mr-1" /> {customer.tier}
                        </Badge>
                        {customer.lineUid && (
                          <Badge className="bg-[#06C755] text-white border-none h-4 px-2 py-0 text-[8px] font-black rounded-sm">LINE CONNECTED</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <p className="text-2xl font-black text-blue-900" data-testid={`text-points-${customer.id}`}>{(customer.points || 0).toLocaleString()}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Balance</p>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <p className="text-lg font-black text-slate-700">฿{Number(customer.totalSpent || 0).toLocaleString()}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Purchases</p>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button onClick={() => setDetailsCustomer(customer)} variant="ghost" size="icon" className="h-10 w-10 hover:bg-blue-100 hover:text-blue-900 rounded-xl" data-testid={`button-details-${customer.id}`}><Eye className="h-4 w-4" /></Button>
                        <Button onClick={() => onEdit(customer)} variant="ghost" size="icon" className="h-10 w-10 hover:bg-amber-100 hover:text-amber-900 rounded-xl" data-testid={`button-edit-${customer.id}`}><Edit className="h-4 w-4" /></Button>
                        <Button onClick={() => onMessage(customer)} variant="ghost" size="icon" className="h-10 w-10 hover:bg-blue-900 hover:text-white rounded-xl" data-testid={`button-message-${customer.id}`}><MessageSquare className="h-4 w-4" /></Button>
                        <Button onClick={() => setDeletingCustomer(customer)} variant="ghost" size="icon" className="h-10 w-10 hover:bg-red-100 hover:text-red-600 rounded-xl" data-testid={`button-delete-${customer.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-blue-900/5 px-6 py-4 flex items-center justify-between border-t border-blue-100">
          <div className="text-[10px] font-black text-blue-900/60 uppercase tracking-widest" data-testid="text-pagination-info">
            {startIndex} - {endIndex} OF {totalCount} MEMBERS
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => page > 1 && setPage(page - 1)} disabled={page === 1} className="h-10 px-4 font-black text-xs rounded-xl border-slate-200" data-testid="button-prev-page">
              PREV
            </Button>
            <div className="bg-white h-10 flex items-center px-5 rounded-xl border border-slate-200 text-xs font-black text-blue-900 shadow-sm" data-testid="text-current-page">
              PAGE {page} / {totalPages}
            </div>
            <Button variant="outline" size="sm" onClick={() => page < totalPages && setPage(page + 1)} disabled={page >= totalPages} className="h-10 px-4 font-black text-xs rounded-xl border-slate-200" data-testid="button-next-page">
              NEXT
            </Button>
          </div>
        </div>
      </Card>

      <CustomerDetailsDialog customer={detailsCustomer} open={!!detailsCustomer} onOpenChange={(open: boolean) => !open && setDetailsCustomer(null)} />

      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-slate-900">DELETE CUSTOMER PROFILE?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500">
              Removing <strong>{deletingCustomer?.name}</strong> will wipe all points and history from the Admin, Barista, and Customer Apps. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold" data-testid="button-cancel-delete">CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)} className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl" data-testid="button-confirm-delete">PERMANENT DELETE</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
