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
      // Calculate end-of-day for toDate to make it inclusive
      let createdBeforeISO: string | undefined = undefined;
      if (toDate) {
        const toDateTime = new Date(toDate).getTime();
        // Add 1 day to include the entire "to" date (making it inclusive)
        const endOfToDate = new Date(toDateTime + (24 * 60 * 60 * 1000));
        createdBeforeISO = endOfToDate.toISOString();
      }

      return await apiRequest('POST', '/api/admin/customers/bulk-delete', {
        filter: {
          createdAfter: fromDate ? new Date(fromDate).toISOString() : undefined,
          createdBefore: createdBeforeISO,
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
      const createdAt = new Date(c.createdAt).getTime();
      
      // Check lower bound (fromDate) - inclusive (>=)
      if (fromDate) {
        const fromDateTime = new Date(fromDate).getTime();
        if (createdAt < fromDateTime) {
          return false;
        }
      }
      
      // Check upper bound (toDate) - exclusive (<)
      // Add 1 day to make toDate inclusive of the entire selected day
      if (toDate) {
        const toDateTime = new Date(toDate).getTime();
        const endOfToDate = toDateTime + (24 * 60 * 60 * 1000);
        // Use strict < to match backend logic
        if (createdAt >= endOfToDate) {
          return false;
        }
      }
      
      return true;
    }).length;
  };

  const affectedCount = getAffectedCount();
  const isConfirmValid = confirmPhrase === "DELETE";
  
  // Validate date range
  const isDateRangeValid = !fromDate || !toDate || new Date(fromDate) <= new Date(toDate);

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
