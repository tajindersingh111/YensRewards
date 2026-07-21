import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Megaphone,
  History,
  Trash2,
  Pencil,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function YensCustomerHub() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [editingTx, setEditingTx] = useState<any | null>(null);

  // Form states for notification broadcast console
  const [targetTier, setTargetTier] = useState<string>("all");
  const [msgChannel, setMsgChannel] = useState<string>("email");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgContent, setMsgContent] = useState("");

  // Fetch all transactions
  const { data: transactions = [], isLoading: txLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/transactions"],
  });

  // Fetch customers (used to filter targets for messaging)
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/customers/all"],
  });

  // Mutation to delete transaction
  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pos-metrics"] });
      toast({
        title: "Transaction Deleted",
        description: "Transaction removed and customer points recalculated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update transaction
  const updateTxMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/admin/transactions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pos-metrics"] });
      setEditingTx(null);
      toast({
        title: "Transaction Updated",
        description: "Transaction saved and customer status updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update transaction.",
        variant: "destructive",
      });
    },
  });

  // Mutation to send broadcast message
  const broadcastMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/admin/customers/bulk-message", payload);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Campaign Sent Successfully",
        description: `Dispatched message to selected tier group.`,
      });
      setMsgSubject("");
      setMsgContent("");
    },
    onError: (err: any) => {
      toast({
        title: "Broadcast Failed",
        description: err.message || "Failed to send campaign broadcast.",
        variant: "destructive",
      });
    },
  });

  const handleSendBroadcast = () => {
    if (!msgContent.trim()) {
      toast({
        title: "Empty Message",
        description: "Please specify message body content.",
        variant: "destructive",
      });
      return;
    }

    // Filter target customers by selected tier
    const targets = customers.filter((c) => {
      if (targetTier === "all") return true;
      return c.tier?.toLowerCase() === targetTier.toLowerCase();
    });

    if (targets.length === 0) {
      toast({
        title: "No Target Customers",
        description: "No customers match the selected filter criteria.",
        variant: "destructive",
      });
      return;
    }

    const ids = targets.map((c) => c.id);
    broadcastMutation.mutate({
      customerIds: ids,
      message: msgContent,
      subject: msgSubject || "Yens Loyalty Update",
      channel: msgChannel,
    });
  };

  const filteredTxs = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      (tx.customerName || "").toLowerCase().includes(query) ||
      (tx.customerPhone || "").includes(query) ||
      (tx.location || "").toLowerCase().includes(query)
    );
  });

  const fmtCurrency = (val: number) =>
    `฿${(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6">
      
      {/* 2-COLUMN LAYOUT: CAMPAIGN CONSOLE & LIVE TRANSACTION FEED */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        
        {/* PUSH NOTIFICATION & CAMPAIGN CONSOLE */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white lg:col-span-1">
          <CardHeader className="border-b border-slate-50 p-6 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-900" />
              <CardTitle className="text-xs font-black uppercase tracking-wider text-blue-900">
                Customer Campaigns Console
              </CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1">
              Broadcast direct messages & promotions to customer tier groups
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Target Audience Group
              </Label>
              <Select value={targetTier} onValueChange={setTargetTier}>
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Select target group" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Members ({customers.length})</SelectItem>
                  <SelectItem value="gold">Gold Tier ({customers.filter(c => c.tier === 'gold').length})</SelectItem>
                  <SelectItem value="silver">Silver Tier ({customers.filter(c => c.tier === 'silver').length})</SelectItem>
                  <SelectItem value="bronze">Bronze Tier ({customers.filter(c => c.tier === 'bronze').length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Delivery Channel
              </Label>
              <Select value={msgChannel} onValueChange={setMsgChannel}>
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="email">Email Campaign</SelectItem>
                  <SelectItem value="sms">SMS Notification</SelectItem>
                  <SelectItem value="both">Both (SMS + Email)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Campaign Subject / Title
              </Label>
              <Input
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                placeholder="e.g. Free Topping Weekend!"
                className="rounded-xl border-slate-200 text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Personalized Message Body
              </Label>
              <Textarea
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                placeholder="Hi {name}, you have {points} loyalty points! Visit our Siam Paragon site today to claim your special reward."
                className="rounded-xl border-slate-200 text-xs min-h-[120px]"
              />
              <p className="text-[9px] text-slate-400 font-bold uppercase">
                Tip: Use <code className="text-blue-900 bg-blue-50 px-1 py-0.5 rounded">{`{name}`}</code>, <code className="text-blue-900 bg-blue-50 px-1 py-0.5 rounded">{`{points}`}</code>, or <code className="text-blue-900 bg-blue-50 px-1 py-0.5 rounded">{`{tier}`}</code> for personalization.
              </p>
            </div>

            <Button
              onClick={handleSendBroadcast}
              disabled={broadcastMutation.isPending}
              className="w-full rounded-xl bg-blue-900 hover:bg-blue-800 text-xs font-black uppercase tracking-wider py-5"
            >
              {broadcastMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Megaphone className="w-3.5 h-3.5 mr-2" />
                  Send Broadcast Campaign
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* CUSTOMER TRANSACTION LEDGER (LIVE FEED) */}
        <Card className="border-0 rounded-[1.5rem] shadow-xl overflow-hidden bg-white lg:col-span-2 flex flex-col">
          <CardHeader className="border-b border-slate-50 p-6 bg-slate-50/50 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-900" />
                <CardTitle className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Customer Points & Transactions Ledger
                </CardTitle>
              </div>
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                Verify, edit, and audit live credit logs and loyalty redemptions
              </CardDescription>
            </div>
            
            <div className="relative w-48 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search phone or site..."
                className="pl-8 h-8 rounded-xl border-slate-200 text-[10px]"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 overflow-auto">
            {txLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
              </div>
            ) : filteredTxs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase">No transactions logged</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Member</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Location</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Bill Value</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Points Earned</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTxs.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <p className="text-xs font-bold text-slate-700">{tx.customerName}</p>
                          <p className="text-[9px] text-slate-400">{tx.customerPhone}</p>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500 uppercase">
                          {tx.location || "Siam Paragon"}
                        </TableCell>
                        <TableCell className="text-xs font-black text-slate-700 text-right">
                          {fmtCurrency(parseFloat(tx.amount))}
                        </TableCell>
                        <TableCell className="text-xs font-black text-emerald-600 text-right">
                          +{tx.points} pts
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTx({ ...tx })}
                              className="h-7 w-7 text-blue-900 hover:bg-blue-50 rounded-lg p-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Delete this transaction? The corresponding customer loyalty balance will be recalculated.")) {
                                  deleteTxMutation.mutate(tx.id);
                                }
                              }}
                              className="h-7 w-7 text-red-500 hover:bg-red-50 rounded-lg p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* EDIT TRANSACTION DIALOG */}
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="max-w-md rounded-[1.5rem] p-6 border-none bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-blue-900 tracking-wider">
              Edit Customer Transaction Record
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Update billing amount or credited loyalty points for this purchase
            </DialogDescription>
          </DialogHeader>

          {editingTx && (
            <div className="space-y-4 mt-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Branch Site Location</Label>
                <Input
                  value={editingTx.location}
                  onChange={(e) => setEditingTx({ ...editingTx, location: e.target.value })}
                  className="rounded-xl border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bill Value (฿)</Label>
                  <Input
                    type="number"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })}
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loyalty Points</Label>
                  <Input
                    type="number"
                    value={editingTx.points}
                    onChange={(e) => setEditingTx({ ...editingTx, points: parseInt(e.target.value) || 0 })}
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingTx(null)}
                  className="rounded-xl text-xs font-bold border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    updateTxMutation.mutate({
                      id: editingTx.id,
                      data: {
                        location: editingTx.location,
                        amount: editingTx.amount,
                        points: editingTx.points,
                      },
                    })
                  }
                  disabled={updateTxMutation.isPending}
                  className="rounded-xl bg-blue-900 hover:bg-blue-800 text-xs font-black uppercase px-4"
                >
                  {updateTxMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
