import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    { value: "bronze", label: "Bronze", color: "bg-amber-600" },
    { value: "silver", label: "Silver", color: "bg-gray-400" },
    { value: "gold", label: "Gold", color: "bg-yellow-400" },
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
        <Button variant="outline" className="relative" data-testid="button-filter-customers">
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 px-1.5 py-0.5 text-xs" data-testid="badge-filter-count">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Customer Filters</DialogTitle>
          <DialogDescription>
            Filter customers by tier, spend, points, and more
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="search-query">Search (Name, Phone, Email)</Label>
            <Input
              id="search-query"
              placeholder="Search customers..."
              value={localFilters.searchQuery || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, searchQuery: e.target.value || undefined })}
              data-testid="input-filter-search"
            />
          </div>

          {/* Tier Filter */}
          <div className="space-y-3">
            <Label>Tier</Label>
            <div className="flex flex-wrap gap-3">
              {tiers.map((tier) => (
                <div key={tier.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tier-${tier.value}`}
                    checked={localFilters.tier?.includes(tier.value)}
                    onCheckedChange={() => handleTierToggle(tier.value)}
                    data-testid={`checkbox-tier-${tier.value}`}
                  />
                  <Label htmlFor={`tier-${tier.value}`} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    {tier.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Spend Range */}
          <div className="space-y-3">
            <Label>Total Spend (฿)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="min-spend" className="text-xs text-muted-foreground">Minimum</Label>
                <Input
                  id="min-spend"
                  type="number"
                  placeholder="0"
                  value={localFilters.minSpend ?? ""}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    minSpend: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  data-testid="input-min-spend"
                />
              </div>
              <div>
                <Label htmlFor="max-spend" className="text-xs text-muted-foreground">Maximum</Label>
                <Input
                  id="max-spend"
                  type="number"
                  placeholder="10000"
                  value={localFilters.maxSpend ?? ""}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    maxSpend: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  data-testid="input-max-spend"
                />
              </div>
            </div>
          </div>

          {/* Points Range */}
          <div className="space-y-3">
            <Label>Points</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="min-points" className="text-xs text-muted-foreground">Minimum</Label>
                <Input
                  id="min-points"
                  type="number"
                  placeholder="0"
                  value={localFilters.minPoints ?? ""}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    minPoints: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  data-testid="input-min-points"
                />
              </div>
              <div>
                <Label htmlFor="max-points" className="text-xs text-muted-foreground">Maximum</Label>
                <Input
                  id="max-points"
                  type="number"
                  placeholder="1000"
                  value={localFilters.maxPoints ?? ""}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    maxPoints: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  data-testid="input-max-points"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={handleClear} data-testid="button-clear-filters">
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-filters">
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
