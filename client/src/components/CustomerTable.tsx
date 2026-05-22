/* LEF'S PREMIER YENS MEMBER LEDGER — BOUTIQUE REGISTRY MODULE */
/* Changes: Server-side tier filter chips, join-date range, pagination */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Filter, Phone, Download, MoreVertical, ChevronLeft, ChevronRight, X
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { Customer } from "@shared/schema";

const PAGE_SIZE = 50;

const TIERS = ['all', 'bronze', 'silver', 'gold', 'platinum'] as const;
type Tier = typeof TIERS[number];

const TIER_STYLES: Record<Tier, string> = {
  all:      'border-slate-200 text-slate-500',
  bronze:   'border-amber-400 text-amber-700',
  silver:   'border-slate-400 text-slate-600',
  gold:     'border-yellow-400 text-yellow-700',
  platinum: 'border-purple-400 text-purple-700',
};

const TIER_ACTIVE: Record<Tier, string> = {
  all:      'bg-blue-900 border-blue-900 text-yellow-400',
  bronze:   'bg-amber-600 border-amber-600 text-white',
  silver:   'bg-slate-500 border-slate-500 text-white',
  gold:     'bg-yellow-500 border-yellow-500 text-blue-900',
  platinum: 'bg-purple-600 border-purple-600 text-white',
};

export default function CustomerTable({ customers: customersProp, onEdit, onMessage }: any) {
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [tierFilter, setTierFilter]   = useState<Tier>("all");
  const [joinAfter, setJoinAfter]     = useState("");
  const [joinBefore, setJoinBefore]   = useState("");
  const [page, setPage]               = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search 350 ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setPage(1); }, [debouncedSearch, tierFilter, joinAfter, joinBefore]);

  const { data, isLoading } = useQuery<{ data: Customer[]; totalCount: number }>({
    queryKey: ['/api/admin/customers', page, PAGE_SIZE, debouncedSearch, tierFilter, joinAfter, joinBefore],
    queryFn: async () => {
      const params = new URLSearchParams({
        page:     String(page),
        pageSize: String(PAGE_SIZE),
        ...(debouncedSearch           ? { search:    debouncedSearch } : {}),
        ...(tierFilter !== 'all'      ? { tier:      tierFilter      } : {}),
        ...(joinAfter                 ? { joinAfter                  } : {}),
        ...(joinBefore                ? { joinBefore                 } : {}),
      });
      const res = await fetch(`/api/admin/customers?${params}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !customersProp,
  });

  const customers   = customersProp ?? data?.data ?? [];
  const totalCount  = data?.totalCount ?? 0;
  const totalPages  = Math.ceil(totalCount / PAGE_SIZE);

  const activeFilterCount = [
    tierFilter !== 'all',
    !!joinAfter,
    !!joinBefore,
  ].filter(Boolean).length;

  const clearDateFilters = () => { setJoinAfter(""); setJoinBefore(""); };

  const handleExport = () => {
    // Construct the URL with current filters
    const params = new URLSearchParams({
      ...(debouncedSearch           ? { search:    debouncedSearch } : {}),
      ...(tierFilter !== 'all'      ? { tier:      tierFilter      } : {}),
      ...(joinAfter                 ? { joinAfter                  } : {}),
      ...(joinBefore                ? { joinBefore                 } : {}),
    });
    
    // Use a hidden link to trigger download without full page navigation
    // which can be intercepted by the client-side router
    const link = document.createElement('a');
    link.href = `/api/admin/customers/export?${params.toString()}`;
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && !customersProp) return (
    <div className="py-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">
      Loading Member Registry...
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── TACTICAL FILTER BAR ── */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50 space-y-3">

        {/* Row 1: search + filter toggle + export */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="SEARCH REGISTRY..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 rounded-xl border-none bg-slate-50 font-bold text-xs tracking-widest focus-visible:ring-blue-900"
              data-testid="input-customer-search"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              className={`flex-1 md:flex-none rounded-xl border-slate-100 font-black text-[10px] uppercase tracking-widest ${showFilters ? 'bg-blue-900 text-yellow-400 border-blue-900' : ''}`}
              onClick={() => setShowFilters(f => !f)}
              data-testid="button-filter"
            >
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 text-[9px] px-1.5 py-0 bg-yellow-400 text-blue-900 font-black">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button
              className="flex-1 md:flex-none bg-blue-900 text-yellow-400 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
              data-testid="button-export"
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Row 2: Tier chips (always visible) */}
        <div className="flex flex-wrap gap-2">
          {TIERS.map(tier => {
            const isActive = tierFilter === tier;
            return (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1 rounded-full border-2 font-black text-[9px] uppercase tracking-widest transition-all ${
                  isActive ? TIER_ACTIVE[tier] : `${TIER_STYLES[tier]} bg-white`
                }`}
                data-testid={`filter-tier-${tier}`}
              >
                {tier === 'all' ? 'All Tiers' : tier}
              </button>
            );
          })}
        </div>

        {/* Row 3: Date range panel (collapsible) */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Joined After</label>
              <Input
                type="date"
                value={joinAfter}
                onChange={e => setJoinAfter(e.target.value)}
                className="h-9 rounded-xl border-slate-100 font-bold text-xs w-44"
                data-testid="filter-join-after"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Joined Before</label>
              <Input
                type="date"
                value={joinBefore}
                onChange={e => setJoinBefore(e.target.value)}
                className="h-9 rounded-xl border-slate-100 font-bold text-xs w-44"
                data-testid="filter-join-before"
              />
            </div>
            {(joinAfter || joinBefore) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDateFilters}
                className="text-red-500 font-bold text-[10px] uppercase"
                data-testid="button-clear-dates"
              >
                <X className="w-3 h-3 mr-1" /> Clear dates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── THE MEMBER REGISTRY ── */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-blue-900">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14 px-8">Member Identity</TableHead>
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14">Tier Status</TableHead>
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14 text-right">Total Spent</TableHead>
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14 text-center">Point Balance</TableHead>
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14 text-right pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer: any) => (
              <TableRow key={customer.id} className="group border-slate-50 hover:bg-blue-50/30 transition-colors" data-testid={`row-customer-${customer.id}`}>

                {/* MEMBER CHIP */}
                <TableCell className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-900/5 flex items-center justify-center text-blue-900 font-black text-xs shrink-0 group-hover:bg-blue-900 group-hover:text-yellow-400 transition-all">
                      {customer.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-blue-900 uppercase text-sm tracking-tight truncate leading-none">
                        {customer.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 flex items-center gap-1.5">
                        <Phone className="w-2.5 h-2.5" /> {customer.phone}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* TIER STATUS */}
                <TableCell>
                  <Badge variant="outline" className={`font-black text-[9px] uppercase px-2.5 py-0.5 border-2 ${
                    customer.tier === 'gold'     ? 'border-yellow-400 text-yellow-600' :
                    customer.tier === 'platinum' ? 'border-purple-400 text-purple-600' :
                    customer.tier === 'silver'   ? 'border-slate-400  text-slate-500'  :
                    'border-slate-200 text-slate-400'
                  }`}>
                    {customer.tier || 'BRONZE'}
                  </Badge>
                </TableCell>

                {/* LTV / TOTAL SPENT */}
                <TableCell className="text-right">
                  <span className={`text-sm font-black tabular-nums ${
                    Number(customer.totalSpent) > 10000 ? "text-emerald-600" : "text-blue-900"
                  }`}>
                    ฿{Number(customer.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </TableCell>

                {/* POINT BALANCE */}
                <TableCell className="text-center">
                  <span className="text-sm font-black text-blue-900 italic tracking-tighter">
                    {customer.points?.toLocaleString() || 0}
                    <span className="text-[10px] text-yellow-600 ml-1">PTS</span>
                  </span>
                </TableCell>

                {/* ACTION HUD */}
                <TableCell className="text-right pr-8">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMessage(customer)}
                      className="rounded-xl font-black text-[9px] uppercase tracking-widest text-blue-900"
                      data-testid={`button-notify-${customer.id}`}
                    >
                      Notify
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl" data-testid={`button-menu-${customer.id}`}>
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                        <DropdownMenuItem onClick={() => onEdit(customer)} className="font-bold text-xs uppercase p-3">
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="font-bold text-xs uppercase p-3 text-red-500">
                          Archive Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>

        {customers.length === 0 && !isLoading && (
          <div className="py-20 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Registry Matches Found</p>
          </div>
        )}

        {/* ── PAGINATION FOOTER ── */}
        {!customersProp && totalCount > 0 && (
          <div className="flex items-center justify-between px-8 py-4 border-t border-slate-50 bg-slate-50/30">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
              {totalCount.toLocaleString()} members &middot; page {page}/{totalPages || 1}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl"
                data-testid="button-customers-page-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-xl"
                data-testid="button-customers-page-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
