import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Customer } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, MapPin, Tag, User, Mail, Phone, Gift, Clock, Hash } from "lucide-react";

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerDetailsDialog({
  customer,
  open,
  onOpenChange,
}: CustomerDetailsDialogProps) {
  if (!customer) return null;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return format(d, "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-customer-details">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-blue-900 uppercase tracking-tight">Customer Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Basic Information</h3>
              <div className="space-y-3">
                <DetailRow icon={User} label="Name" value={customer.name} />
                <DetailRow icon={Phone} label="Phone" value={customer.phone} />
                <DetailRow icon={Mail} label="Email" value={customer.email || "-"} />
              </div>
            </div>

            <div className="col-span-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">CSV Import Fields</h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailRow 
                  icon={User} 
                  label="Gender" 
                  value={customer.gender || "-"}
                  badge={customer.gender}
                  badgeVariant="secondary"
                />
                <DetailRow 
                  icon={Gift} 
                  label="Birthday" 
                  value={customer.birthday || "-"} 
                />
                <DetailRow 
                  icon={Calendar} 
                  label="Register Date" 
                  value={formatDate(customer.registerDate)} 
                />
                <DetailRow 
                  icon={MapPin} 
                  label="Register Branch" 
                  value={customer.registerBranch || "-"} 
                />
                <DetailRow 
                  icon={Clock} 
                  label="Last Use" 
                  value={formatDate(customer.lastUse)} 
                />
                <DetailRow 
                  icon={Tag} 
                  label="Tag" 
                  value={customer.tag || "-"}
                  badge={customer.tag}
                  badgeVariant="outline"
                />
                <DetailRow 
                  icon={Hash} 
                  label="Line UID" 
                  value={customer.lineUid || "-"} 
                />
              </div>
            </div>

            <div className="col-span-2 pt-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Loyalty Status</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3" data-testid="detail-tier">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tier</span>
                  <div className="mt-1.5">
                    <Badge className="capitalize font-black">{customer.tier}</Badge>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3" data-testid="detail-points">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points</span>
                  <div className="text-2xl font-black text-blue-900 mt-0.5">{customer.points}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3" data-testid="detail-total-spent">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Spent</span>
                  <div className="text-xl font-black text-blue-900 mt-0.5">฿{Number(customer.totalSpent).toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3" data-testid="detail-referral-code">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referral Code</span>
                  <div className="font-mono text-sm font-bold text-blue-900 mt-0.5">{customer.referralCode}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: string | null;
  badgeVariant?: "default" | "secondary" | "outline";
}

function DetailRow({ icon: Icon, label, value, badge, badgeVariant = "default" }: DetailRowProps) {
  return (
    <div className="flex items-center gap-2" data-testid={`detail-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {badge ? (
          <Badge variant={badgeVariant} className="mt-1 text-xs">
            {value}
          </Badge>
        ) : (
          <div className="text-sm font-medium text-foreground truncate">{value}</div>
        )}
      </div>
    </div>
  );
}
