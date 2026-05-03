import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomerFilters {
  tier?: string[];
  minSpend?: number;
  maxSpend?: number;
  minPoints?: number;
  maxPoints?: number;
  searchQuery?: string;
}

interface CustomerFilterDialogProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onApply: () => void;
}

export default function CustomerFilterDialog({ filters, onFiltersChange, onApply }: CustomerFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<CustomerFilters>(filters);

  const tiers = [
    { value: "bronze", label: "Bronze", color: "bg-orange-400" },
    { value: "silver", label: "Silver", color: "bg-slate-400" },
    { value: "gold", label: "Gold", color: "bg-yellow-400" },
    { value: "platinum", label: "Platinum", color: "bg-purple-400" },
  ];

  const handleTierToggle = (tierValue: string) => {
    const currentTiers = localFilters.tier || [];
    const newTiers = currentTiers.includes(tierValue)
      ? currentTiers.filter(t => t !== tierValue)
      : [...currentTiers, tierValue];
    setLocalFilters({ ...localFilters, tier: newTiers.length > 0 ? newTiers : undefined });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
    setOpen(false);
  };

  const handleClear = () => {
    const clearedFilters: CustomerFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onApply();
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof CustomerFilters];
    return value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative font-black uppercase text-[10px] tracking-widest rounded-xl border-blue-900/10 text-blue-900" data-testid="button-filter-customers">
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-yellow-400 text-blue-900 font-black border-none text-[9px] px-1.5" data-testid="badge-filter-count">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2rem]">
        {/* Branded Header */}
        <div className="bg-blue-900 px-8 py-6 rounded-t-[2rem] flex items-center gap-4">
          <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
            <Filter className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Advanced Filters</h2>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em] mt-1.5">Filter by tier, spend, points and more</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Search Query */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search (Name, Phone, Email)</Label>
            <Input
              placeholder="Search customers..."
              value={localFilters.searchQuery || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, searchQuery: e.target.value || undefined })}
              className="rounded-xl border-slate-100 bg-slate-50"
              data-testid="input-filter-search"
            />
          </div>

          {/* Tier Filter */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tier</Label>
            <div className="flex flex-wrap gap-3">
              {tiers.map((tier) => (
                <div key={tier.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`tier-${tier.value}`}
                    checked={localFilters.tier?.includes(tier.value)}
                    onCheckedChange={() => handleTierToggle(tier.value)}
                    data-testid={`checkbox-tier-${tier.value}`}
                  />
                  <Label htmlFor={`tier-${tier.value}`} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    {tier.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Spend Range */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spend (฿)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Minimum</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={localFilters.minSpend ?? ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, minSpend: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="rounded-xl border-slate-100 bg-slate-50"
                  data-testid="input-min-spend"
                />
              </div>
              <div>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Maximum</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={localFilters.maxSpend ?? ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, maxSpend: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="rounded-xl border-slate-100 bg-slate-50"
                  data-testid="input-max-spend"
                />
              </div>
            </div>
          </div>

          {/* Points Range */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Minimum</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={localFilters.minPoints ?? ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, minPoints: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="rounded-xl border-slate-100 bg-slate-50"
                  data-testid="input-min-points"
                />
              </div>
              <div>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Maximum</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={localFilters.maxPoints ?? ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, maxPoints: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="rounded-xl border-slate-100 bg-slate-50"
                  data-testid="input-max-points"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleClear}
            className="font-black uppercase text-[10px] tracking-widest rounded-xl border-blue-900/10 text-blue-900"
            data-testid="button-clear-filters"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button
            onClick={handleApply}
            className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
            data-testid="button-apply-filters"
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
