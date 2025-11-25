import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X } from "lucide-react";
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
        } else {
          return "";
        }
      } else {
        date = new Date(dateValue);
      }
    } else {
      return "";
    }
    
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

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
  platinum: "bg-[hsl(270,80%,50%)] text-white",
};

export default function CustomerEditDialog({ customer, open, onOpenChange }: CustomerEditDialogProps) {
  const { toast} = useToast();
  const isCreateMode = !customer;
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    tier: "bronze" as "bronze" | "silver" | "gold" | "platinum",
    points: 0,
    totalSpent: "0",
    gender: "",
    registerBranch: "",
    registerDate: "",
    lastUse: "",
    tag: "",
    lineUid: "",
  });

  // Populate form when customer changes or reset for create
  useEffect(() => {
    if (customer) {
      const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
      const customerTier = customer.tier?.toLowerCase() || 'bronze';
      const normalizedTier = validTiers.includes(customerTier) ? customerTier : 'bronze';
      
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        birthday: customer.birthday || "",
        tier: normalizedTier as "bronze" | "silver" | "gold" | "platinum",
        points: customer.points || 0,
        totalSpent: customer.totalSpent || "0",
        gender: customer.gender || "",
        registerBranch: customer.registerBranch || "",
        registerDate: safeDateToInput(customer.registerDate),
        lastUse: safeDateToInput(customer.lastUse),
        tag: customer.tag || "",
        lineUid: customer.lineUid || "",
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: "",
        phone: "",
        email: "",
        birthday: "",
        tier: "bronze",
        points: 0,
        totalSpent: "0",
        gender: "",
        registerBranch: "",
        registerDate: "",
        lastUse: "",
        tag: "",
        lineUid: "",
      });
    }
  }, [customer, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      if (isCreateMode) {
        // Create new customer (POST)
        return await apiRequest('POST', '/api/admin/customers', data);
      } else {
        // Update existing customer (PATCH)
        return await apiRequest('PATCH', `/api/admin/customers/${customer?.id}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({
        title: "Success",
        description: isCreateMode ? "Customer created successfully" : "Customer updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || (isCreateMode ? "Failed to create customer" : "Failed to update customer"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data using Zod schema
    try {
      // Transform date strings to Date objects for validation
      const dataToValidate = {
        ...formData,
        registerDate: formData.registerDate ? new Date(formData.registerDate) : undefined,
        lastUse: formData.lastUse ? new Date(formData.lastUse) : undefined,
      };
      
      const validatedData = insertCustomerSchema.parse(dataToValidate);
      saveMutation.mutate(validatedData);
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.errors?.map((e: any) => e.message).join(", ") || "Please check all required fields",
        variant: "destructive",
      });
    }
  };

  const initials = (customer?.name || formData.name || "NEW")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreateMode ? "Add New Customer" : "Edit Customer"}</DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? "Create a new customer account and set their initial information"
              : "Update customer information and manage their account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Photo & Basic Info */}
          {!isCreateMode && customer && (
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={customer.photo || undefined} alt={customer.name} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-foreground">{customer.name}</h3>
                <Badge className={tierColors[formData.tier] || tierColors.bronze}>
                  {formData.tier.charAt(0).toUpperCase() + formData.tier.slice(1)}
                </Badge>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-edit-name"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                data-testid="input-edit-phone"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>

            {/* Birthday */}
            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday (MM-DD)</Label>
              <Input
                id="birthday"
                placeholder="MM-DD"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                data-testid="input-edit-birthday"
              />
              <p className="text-xs text-muted-foreground">Format: MM-DD (e.g., 03-15)</p>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData({ ...formData, tier: value as any })}
              >
                <SelectTrigger data-testid="select-edit-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Points */}
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                data-testid="input-edit-points"
              />
            </div>

            {/* Total Spent */}
            <div className="space-y-2">
              <Label htmlFor="totalSpent">Total Spent (฿)</Label>
              <Input
                id="totalSpent"
                type="number"
                value={formData.totalSpent}
                onChange={(e) => setFormData({ ...formData, totalSpent: e.target.value })}
                data-testid="input-edit-total-spent"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger data-testid="select-edit-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Anonymous">Anonymous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Register Branch */}
            <div className="space-y-2">
              <Label htmlFor="registerBranch">Register Branch</Label>
              <Input
                id="registerBranch"
                value={formData.registerBranch}
                onChange={(e) => setFormData({ ...formData, registerBranch: e.target.value })}
                data-testid="input-edit-register-branch"
              />
            </div>

            {/* Register Date */}
            <div className="space-y-2">
              <Label htmlFor="registerDate">Register Date</Label>
              <Input
                id="registerDate"
                type="date"
                value={formData.registerDate}
                onChange={(e) => setFormData({ ...formData, registerDate: e.target.value })}
                data-testid="input-edit-register-date"
              />
            </div>

            {/* Last Use */}
            <div className="space-y-2">
              <Label htmlFor="lastUse">Last Use</Label>
              <Input
                id="lastUse"
                type="date"
                value={formData.lastUse}
                onChange={(e) => setFormData({ ...formData, lastUse: e.target.value })}
                data-testid="input-edit-last-use"
              />
            </div>

            {/* Tag */}
            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="e.g., VIP, Regular"
                data-testid="input-edit-tag"
              />
            </div>

            {/* Line UID */}
            <div className="space-y-2">
              <Label htmlFor="lineUid">Line UID</Label>
              <Input
                id="lineUid"
                value={formData.lineUid}
                onChange={(e) => setFormData({ ...formData, lineUid: e.target.value })}
                data-testid="input-edit-line-uid"
              />
            </div>

            {/* Referral Code (read-only, edit mode only) */}
            {!isCreateMode && customer && (
              <div className="space-y-2">
                <Label>Referral Code</Label>
                <Input
                  value={customer.referralCode || ""}
                  placeholder="N/A"
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
          </div>

          {/* Customer ID (read-only, edit mode only) */}
          {!isCreateMode && customer && (
            <div className="space-y-2">
              <Label>Customer ID</Label>
              <Input
                value={customer.id}
                disabled
                className="bg-muted font-mono text-xs"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-edit"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isCreateMode ? "Creating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isCreateMode ? "Create Customer" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
