import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, UserPlus, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";
import { insertCustomerSchema } from "@shared/schema";

function safeDateToInput(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "";
  try {
    let date: Date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      if (dateValue.includes('/')) {
        const parts = dateValue.split(/[\/\s]/);
        if (parts.length >= 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          date = new Date(Date.UTC(year, month - 1, day));
        } else return "";
      } else {
        date = new Date(dateValue);
      }
    } else return "";
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split('T')[0];
  } catch {
    return "";
  }
}

interface CustomerEditDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierBadgeColors = {
  bronze: "bg-orange-50 text-orange-700 border-orange-300",
  silver: "bg-slate-50 text-slate-700 border-slate-300",
  gold: "bg-amber-50 text-amber-700 border-amber-300",
  platinum: "bg-purple-50 text-purple-700 border-purple-300",
};

const inputCls = "rounded-xl border-slate-100 bg-slate-50";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest";

export default function CustomerEditDialog({ customer, open, onOpenChange }: CustomerEditDialogProps) {
  const { toast } = useToast();
  const isCreateMode = !customer;

  const [formData, setFormData] = useState({
    name: "", phone: "", email: "", birthday: "",
    tier: "bronze" as "bronze" | "silver" | "gold" | "platinum",
    points: 0, totalSpent: "0", gender: "", registerBranch: "",
    registerDate: "", lastUse: "", tag: "", lineUid: "",
  });

  useEffect(() => {
    if (customer) {
      const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
      const customerTier = customer.tier?.toLowerCase() || 'bronze';
      const normalizedTier = validTiers.includes(customerTier) ? customerTier : 'bronze';
      setFormData({
        name: customer.name || "", phone: customer.phone || "", email: customer.email || "",
        birthday: customer.birthday || "", tier: normalizedTier as any,
        points: customer.points || 0, totalSpent: customer.totalSpent || "0",
        gender: customer.gender || "", registerBranch: customer.registerBranch || "",
        registerDate: safeDateToInput(customer.registerDate),
        lastUse: safeDateToInput(customer.lastUse),
        tag: customer.tag || "", lineUid: customer.lineUid || "",
      });
    } else {
      setFormData({
        name: "", phone: "", email: "", birthday: "", tier: "bronze",
        points: 0, totalSpent: "0", gender: "", registerBranch: "",
        registerDate: "", lastUse: "", tag: "", lineUid: "",
      });
    }
  }, [customer, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      if (isCreateMode) return await apiRequest('POST', '/api/admin/customers', data);
      return await apiRequest('PATCH', `/api/admin/customers/${customer?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({ title: "Success", description: isCreateMode ? "Customer created successfully" : "Customer updated successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || (isCreateMode ? "Failed to create customer" : "Failed to update customer"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToValidate = {
        ...formData,
        registerDate: formData.registerDate ? new Date(formData.registerDate) : undefined,
        lastUse: formData.lastUse ? new Date(formData.lastUse) : undefined,
      };
      const validatedData = insertCustomerSchema.parse(dataToValidate);
      saveMutation.mutate(validatedData);
    } catch (error: any) {
      toast({ title: "Validation Error", description: error.errors?.map((e: any) => e.message).join(", ") || "Please check all required fields", variant: "destructive" });
    }
  };

  const initials = (customer?.name || formData.name || "NEW")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2rem]">
        {/* Branded Header */}
        <div className="bg-blue-900 px-8 py-6 rounded-t-[2rem] flex items-center gap-4 shrink-0">
          <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
            {isCreateMode
              ? <UserPlus className="w-5 h-5 text-blue-900" />
              : <UserCog className="w-5 h-5 text-blue-900" />}
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
              {isCreateMode ? "Add New Customer" : "Edit Customer"}
            </h2>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em] mt-1.5">
              {isCreateMode ? "Create a new customer account" : "Update customer information"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Avatar row — edit mode only */}
          {!isCreateMode && customer && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                <AvatarImage src={customer.photo || undefined} alt={customer.name} />
                <AvatarFallback className="bg-blue-900 text-white font-black text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-base font-black text-blue-900 uppercase tracking-tight">{customer.name}</h3>
                <Badge variant="outline" className={`mt-1 font-black text-[9px] uppercase border-2 ${tierBadgeColors[formData.tier] || tierBadgeColors.bronze}`}>
                  {formData.tier.charAt(0).toUpperCase() + formData.tier.slice(1)}
                </Badge>
              </div>
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={labelCls}>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={inputCls} data-testid="input-edit-name" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Phone *</Label>
              <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required className={inputCls} data-testid="input-edit-phone" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputCls} data-testid="input-edit-email" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Birthday (MM-DD)</Label>
              <Input placeholder="MM-DD" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} className={inputCls} data-testid="input-edit-birthday" />
              <p className="text-[10px] font-medium text-slate-400">Format: MM-DD (e.g., 03-15)</p>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Tier</Label>
              <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value as any })}>
                <SelectTrigger className={inputCls} data-testid="select-edit-tier"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Points</Label>
              <Input type="number" value={formData.points} onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} className={inputCls} data-testid="input-edit-points" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Total Spent (฿)</Label>
              <Input type="number" value={formData.totalSpent} onChange={(e) => setFormData({ ...formData, totalSpent: e.target.value })} className={inputCls} data-testid="input-edit-total-spent" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className={inputCls} data-testid="select-edit-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Anonymous">Anonymous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Register Branch</Label>
              <Input value={formData.registerBranch} onChange={(e) => setFormData({ ...formData, registerBranch: e.target.value })} className={inputCls} data-testid="input-edit-register-branch" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Register Date</Label>
              <Input type="date" value={formData.registerDate} onChange={(e) => setFormData({ ...formData, registerDate: e.target.value })} className={inputCls} data-testid="input-edit-register-date" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Last Use</Label>
              <Input type="date" value={formData.lastUse} onChange={(e) => setFormData({ ...formData, lastUse: e.target.value })} className={inputCls} data-testid="input-edit-last-use" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Tag</Label>
              <Input value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} placeholder="e.g., VIP, Regular" className={inputCls} data-testid="input-edit-tag" />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Line UID</Label>
              <Input value={formData.lineUid} onChange={(e) => setFormData({ ...formData, lineUid: e.target.value })} className={inputCls} data-testid="input-edit-line-uid" />
            </div>
            {!isCreateMode && customer && (
              <div className="space-y-2">
                <Label className={labelCls}>Referral Code</Label>
                <Input value={customer.referralCode || ""} placeholder="N/A" disabled className="rounded-xl border-slate-100 bg-slate-100 text-slate-400" />
              </div>
            )}
          </div>

          {/* Customer ID — read only */}
          {!isCreateMode && customer && (
            <div className="space-y-2">
              <Label className={labelCls}>Customer ID</Label>
              <Input value={customer.id} disabled className="rounded-xl border-slate-100 bg-slate-100 font-mono text-xs text-slate-400" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
              className="font-black uppercase text-[10px] tracking-widest rounded-xl border-blue-900/10 text-blue-900"
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-2" />Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
              data-testid="button-save-edit"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isCreateMode ? "Creating..." : "Saving..."}</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />{isCreateMode ? "Create Customer" : "Save Changes"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
