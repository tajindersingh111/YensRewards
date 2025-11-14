import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Trash2, AlertTriangle, Calendar } from "lucide-react";
import { Customer } from "@shared/schema";

interface BulkDeleteCustomersDialogProps {
  customers: Customer[];
}

export default function BulkDeleteCustomersDialog({ customers }: BulkDeleteCustomersDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      // UTC helpers for timezone-safe date boundaries
      const getUTCMidnight = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      };

      const getUTCMidnightNextDay = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Add 1 day using UTC arithmetic
        return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
      };

      return await apiRequest('POST', '/api/admin/customers/bulk-delete', {
        filter: {
          createdAfter: fromDate ? getUTCMidnight(fromDate).toISOString() : undefined,
          // For inclusive toDate: send midnight of next day, backend uses strict <
          createdBefore: toDate ? getUTCMidnightNextDay(toDate).toISOString() : undefined,
        },
        confirmPhrase,
        reason,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      
      toast({
        title: "Success",
        description: `Deleted ${data.deletedCount} customer(s) successfully`,
      });
      
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customers",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFromDate("");
    setToDate("");
    setConfirmPhrase("");
    setReason("");
    setShowConfirmation(false);
  };

  const handleClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // Calculate affected customers count
  const getAffectedCount = () => {
    // No filters = all customers
    if (!fromDate && !toDate) {
      return customers.length;
    }
    
    return customers.filter(c => {
      // Parse createdAt as UTC timestamp
      const createdAt = Date.parse(c.createdAt);
      
      // Check lower bound (fromDate) - use UTC helper matching mutation logic
      if (fromDate) {
        const [year, month, day] = fromDate.split('-').map(Number);
        const fromDayUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
        if (createdAt < fromDayUTC) {
          return false;
        }
      }
      
      // Check upper bound (toDate) - use UTC helper matching mutation logic
      if (toDate) {
        const [year, month, day] = toDate.split('-').map(Number);
        const nextDayUTC = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0);
        if (createdAt >= nextDayUTC) {
          return false;
        }
      }
      
      return true;
    }).length;
  };

  const affectedCount = getAffectedCount();
  const isConfirmValid = confirmPhrase === "DELETE";
  
  // Validate date range using UTC helpers
  const isDateRangeValid = !fromDate || !toDate || (() => {
    const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
    const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
    const fromUTC = Date.UTC(fromYear, fromMonth - 1, fromDay);
    const toUTC = Date.UTC(toYear, toMonth - 1, toDay);
    return fromUTC <= toUTC;
  })();

  const handleNext = () => {
    // Validate date range
    if (!isDateRangeValid) {
      toast({
        title: "Invalid date range",
        description: "The 'From' date must be before or equal to the 'To' date",
        variant: "destructive",
      });
      return;
    }
    
    if (affectedCount === 0) {
      toast({
        title: "No customers to delete",
        description: "No customers match the selected criteria",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmation(true);
  };

  const handleDelete = () => {
    if (!isConfirmValid) {
      toast({
        title: "Invalid confirmation",
        description: 'Please type "DELETE" to confirm',
        variant: "destructive",
      });
      return;
    }
    bulkDeleteMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          data-testid="button-bulk-delete-customers"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Bulk Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" data-testid="dialog-bulk-delete">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Bulk Delete Customers
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please review the filter criteria carefully before proceeding.
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This will permanently delete customers and all their associated data (transactions, notifications, messages).
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date Range Filter (optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      data-testid="input-from-date"
                      placeholder="Start date"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      data-testid="input-to-date"
                      placeholder="End date"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave both empty to delete all customers. Set a range to delete customers created within that period.
                </p>
                {!isDateRangeValid && (
                  <p className="text-xs text-destructive font-medium">
                    The 'From' date must be before or equal to the 'To' date
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you deleting these customers?"
                  data-testid="input-delete-reason"
                  rows={3}
                />
              </div>

              <Alert>
                <AlertDescription className="font-semibold text-lg">
                  {affectedCount} customer(s) will be deleted
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => handleClose(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleNext}
                disabled={affectedCount === 0 || !isDateRangeValid}
                data-testid="button-next-delete"
              >
                Next
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Final Confirmation Required</AlertTitle>
              <AlertDescription>
                You are about to permanently delete <strong>{affectedCount} customer(s)</strong> and all their associated data.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <code className="bg-muted px-1 py-0.5 rounded">DELETE</code> to confirm
              </label>
              <Input
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="DELETE"
                data-testid="input-confirm-phrase"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-back-delete"
              >
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={!isConfirmValid || bulkDeleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Forever"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
