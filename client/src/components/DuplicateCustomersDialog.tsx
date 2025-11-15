import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Users } from "lucide-react";
import { Customer } from "@shared/schema";

interface DuplicateGroup {
  phone: string;
  count: number;
  customers: Customer[];
}

interface DuplicateCustomersDialogProps {
  // No longer needs customers prop - backend returns full customer data
}

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
};

export default function DuplicateCustomersDialog() {
  const [open, setOpen] = useState(false);

  const { data: duplicates = [], isLoading } = useQuery<DuplicateGroup[]>({
    queryKey: ["/api/admin/customers/duplicates"],
    enabled: open,
  });

  const totalDuplicates = duplicates.reduce((sum, group) => sum + group.count, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={duplicates.length > 0 ? "destructive" : "outline"}
          size="sm"
          data-testid="button-show-duplicates"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Find Duplicates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duplicate Phone Numbers</DialogTitle>
          <DialogDescription>
            {duplicates.length > 0 ? (
              <>
                Found {duplicates.length} phone number(s) with {totalDuplicates} total duplicate customer records.
                You can delete unwanted duplicates using the delete button in the customer table.
              </>
            ) : (
              "No duplicate phone numbers found in the database."
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Searching for duplicates...</p>
          </div>
        )}

        {!isLoading && duplicates.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Duplicates Found</p>
            <p className="text-sm text-muted-foreground">All phone numbers are unique!</p>
          </div>
        )}

        <div className="space-y-4">
          {duplicates.map((group) => {
            return (
              <Card key={group.phone} className="p-4" data-testid={`card-duplicate-${group.phone}`}>
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {group.count} duplicates
                      </Badge>
                      <span className="font-medium">Phone: {group.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.customers.map((customer) => {
                    const initials = customer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                        data-testid={`duplicate-customer-${customer.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={customer.photo ?? undefined} alt={customer.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.name}</span>
                              <Badge className={tierColors[customer.tier as keyof typeof tierColors]}>
                                {customer.tier}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {customer.email || "No email"} • {customer.points} pts • ฿{Number(customer.totalSpent).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Tip: Review these customers and delete duplicates from the main customer table using the delete button.
                </p>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
