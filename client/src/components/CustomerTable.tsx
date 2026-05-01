import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageSquare, Edit, Eye, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Wrench } from "lucide-react";
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

type SortField = 'name' | 'totalSpent' | 'points' | 'createdAt';
type SortOrder = 'asc' | 'desc';
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
  onMessage: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
}

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
  platinum: "bg-[hsl(270,80%,50%)] text-white",
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

  // Debounce search input and reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Always reset to page 1 when search changes
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
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  // Fetch paginated customers
  const { data, isLoading } = useQuery<{ data: Customer[]; totalCount: number }>({
    queryKey: ['/api/admin/customers', page, pageSize, debouncedSearch, sortBy, sortOrder, tierFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (tierFilter && tierFilter !== 'all') {
        params.append('tier', tierFilter);
      }
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

  const cleanupEmailsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/customers/cleanup-emails');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: t('common.success'),
        description: "Email data cleaned up successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "Failed to clean up emails",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return await apiRequest('DELETE', `/api/admin/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: t('common.success'),
        description: t('admin.customers.pagination.customerDeleted') || "Customer deleted successfully",
      });
      setDeletingCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize, 10));
    setPage(1); // Reset to page 1 when page size changes
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <Card className="p-6" data-testid="card-customer-table">
      <div className="space-y-4">
        {/* Header with search and bulk actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{t('admin.customers.title')}</h3>
            <Badge variant="secondary" data-testid="badge-customer-count">{totalCount}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.customers.pagination.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
            <Select value={tierFilter} onValueChange={(value) => { setTierFilter(value); setPage(1); }}>
              <SelectTrigger className="w-32" data-testid="select-tier-filter">
                <SelectValue placeholder={t('admin.customers.filterTier')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.customers.allTiers')}</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cleanupEmailsMutation.mutate()}
              disabled={cleanupEmailsMutation.isPending}
              data-testid="button-cleanup-emails"
            >
              <Wrench className="w-4 h-4 mr-1" />
              Fix Emails
            </Button>
            <DuplicateCustomersDialog />
            <BulkDeleteCustomersDialog customers={customers} />
          </div>
        </div>

        {/* Pagination controls - Top */}
        <div className="flex items-center justify-between gap-4 py-2 border-y">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isLoading ? (
              <span>{t('common.loading')}...</span>
            ) : totalCount === 0 ? (
              <span>{t('admin.customers.pagination.noCustomers')}</span>
            ) : (
              <span data-testid="text-pagination-info">
                {t('admin.customers.pagination.showing')} {startIndex} {t('admin.customers.pagination.to')} {endIndex} {t('admin.customers.pagination.of')} {totalCount} {t('admin.customers.pagination.customers')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('admin.customers.pagination.pageSize')}</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1 || isLoading}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('admin.customers.pagination.previous')}
              </Button>
              <span className="px-3 text-sm text-muted-foreground" data-testid="text-current-page">
                {t('admin.customers.pagination.page')} {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= totalPages || isLoading}
                data-testid="button-next-page"
              >
                {t('admin.customers.pagination.next')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th 
                  className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('name')}
                  data-testid="header-sort-name"
                >
                  <span className="flex items-center">Customer<SortIcon field="name" /></span>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">LINE</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tier</th>
                <th 
                  className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('points')}
                  data-testid="header-sort-points"
                >
                  <span className="flex items-center">Points<SortIcon field="points" /></span>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('totalSpent')}
                  data-testid="header-sort-total-spent"
                >
                  <span className="flex items-center">Total Spent<SortIcon field="totalSpent" /></span>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {t('common.loading')}...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {t('admin.customers.pagination.noCustomers')}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
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
                      <td className="py-3 px-4 text-center" data-testid={`text-line-${customer.id}`}>
                        {customer.lineUid ? (
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#06C755]" title="LINE Connected">
                            <SiLine className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
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
                            onClick={() => onMessage(customer)}
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls - Bottom */}
        <div className="flex items-center justify-between gap-4 py-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {!isLoading && totalCount > 0 && (
              <span>
                {t('admin.customers.pagination.showing')} {startIndex} {t('admin.customers.pagination.to')} {endIndex} {t('admin.customers.pagination.of')} {totalCount} {t('admin.customers.pagination.customers')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page === 1 || isLoading}
              data-testid="button-prev-page-bottom"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('admin.customers.pagination.previous')}
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              {t('admin.customers.pagination.page')} {page} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page >= totalPages || isLoading}
              data-testid="button-next-page-bottom"
            >
              {t('admin.customers.pagination.next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
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
