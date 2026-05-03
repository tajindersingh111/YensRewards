/* LEF'S PREMIER YENS MEMBER LEDGER — BOUTIQUE REGISTRY MODULE */
/* Changes: Executive Table Architecture, Tactical Member Chips, and High-Contrast Filtering */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, Filter, 
  Phone, Download,
  MoreVertical
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

export default function CustomerTable({ customers: customersProp, onEdit, onMessage }: any) {
  const [search, setSearch] = useState("");

  const { data: fetchedCustomers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/all'],
    enabled: !customersProp,
  });

  const customers = customersProp ?? fetchedCustomers;

  const filtered = customers.filter((c: any) => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  if (isLoading && !customersProp) return (
    <div className="py-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">
      Loading Member Registry...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── TACTICAL FILTER BAR ── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-[2rem] shadow-sm border border-slate-50">
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
          <Button variant="outline" className="flex-1 md:flex-none rounded-xl border-slate-100 font-black text-[10px] uppercase tracking-widest" data-testid="button-filter">
            <Filter className="w-3.5 h-3.5 mr-2" /> Filters
          </Button>
          <Button className="flex-1 md:flex-none bg-blue-900 text-yellow-400 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg" data-testid="button-export">
            <Download className="w-3.5 h-3.5 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* ── THE MEMBER REGISTRY ── */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-blue-900">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14 px-8">Member Identity</TableHead>
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14">Tier Status</TableHead>
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14 text-center">Point Balance</TableHead>
              <TableHead className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] h-14 text-right pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer: any) => (
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
                    customer.tier === 'gold' ? 'border-yellow-400 text-yellow-600' :
                    customer.tier === 'platinum' ? 'border-purple-400 text-purple-600' :
                    'border-slate-200 text-slate-400'
                  }`}>
                    {customer.tier || 'BRONZE'}
                  </Badge>
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

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Registry Matches Found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
