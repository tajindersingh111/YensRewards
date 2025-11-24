import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, Send, Users, AlertCircle, CheckCircle2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lineUid: string | null;
  tier: string;
}

export default function LineMessaging() {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [recipientType, setRecipientType] = useState<"all" | "tier" | "individual">("all");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [message, setMessage] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  // Check if LINE is configured
  const hasLineToken = !!import.meta.env.LINE_CHANNEL_ACCESS_TOKEN;

  // Fetch customers with LINE UIDs
  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers'],
  });

  const customersWithLine = customers.filter(c => c.lineUid);

  // Send LINE message mutation
  const sendLineMessage = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/messages/send-line', data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      toast({
        title: "LINE Messages Sent! 📱",
        description: `Successfully sent ${result.sent || 0} messages. Failed: ${result.failed || 0}`,
      });
      setMessage("");
      setSelectedCustomers([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send LINE Messages",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (!hasLineToken) {
      toast({
        title: "LINE Not Configured",
        description: "Please add LINE_CHANNEL_ACCESS_TOKEN to environment variables",
        variant: "destructive",
      });
      return;
    }

    if (recipientType === "individual" && selectedCustomers.length === 0) {
      toast({
        title: "No Customers Selected",
        description: "Please select at least one customer",
        variant: "destructive",
      });
      return;
    }

    const data: any = {
      recipientType,
      message: message.trim(),
    };

    if (recipientType === "tier" && selectedTier) {
      data.tier = selectedTier;
    } else if (recipientType === "individual") {
      data.customerIds = selectedCustomers;
    }

    sendLineMessage.mutate(data);
  };

  const filteredCustomers = customers.filter(c => {
    if (!c.lineUid) return false;
    if (recipientType === "tier" && selectedTier) {
      return c.tier === selectedTier;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Send LINE Messages
          </CardTitle>
          <CardDescription>
            Send free messages to customers via LINE (Thailand's #1 messaging app)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasLineToken && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>LINE not configured.</strong> Add <code className="bg-muted px-1 rounded">LINE_CHANNEL_ACCESS_TOKEN</code> to environment variables.
              </AlertDescription>
            </Alert>
          )}

          {hasLineToken && customersWithLine.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>No customers with LINE accounts.</strong> Customers need to follow your LINE Official Account first.
              </AlertDescription>
            </Alert>
          )}

          {customersWithLine.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>{customersWithLine.length} customers</strong> have connected their LINE accounts
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Recipients</label>
            <Select value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
              <SelectTrigger data-testid="select-recipient-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    All Customers ({customersWithLine.length} with LINE)
                  </div>
                </SelectItem>
                <SelectItem value="tier">By Tier</SelectItem>
                <SelectItem value="individual">Select Individuals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientType === "tier" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Tier</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger data-testid="select-tier">
                  <SelectValue placeholder="Choose tier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">
                    <Badge variant="outline">Bronze</Badge> ({customersWithLine.filter(c => c.tier === 'bronze').length})
                  </SelectItem>
                  <SelectItem value="silver">
                    <Badge variant="outline">Silver</Badge> ({customersWithLine.filter(c => c.tier === 'silver').length})
                  </SelectItem>
                  <SelectItem value="gold">
                    <Badge variant="outline">Gold</Badge> ({customersWithLine.filter(c => c.tier === 'gold').length})
                  </SelectItem>
                  <SelectItem value="platinum">
                    <Badge variant="outline">Platinum</Badge> ({customersWithLine.filter(c => c.tier === 'platinum').length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {recipientType === "individual" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Customers</label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {loadingCustomers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No customers with LINE accounts found
                  </p>
                ) : (
                  filteredCustomers.map((customer) => (
                    <label
                      key={customer.id}
                      className="flex items-center gap-2 p-2 hover-elevate rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomers([...selectedCustomers, customer.id]);
                          } else {
                            setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                          }
                        }}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                      <Badge variant="outline">{customer.tier}</Badge>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Message (Max 5,000 characters)</label>
            <Textarea
              placeholder="Type your LINE message here... Much longer than SMS! 🎉"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={5000}
              data-testid="textarea-line-message"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {message.length}/5,000 characters
              </span>
              <span className="text-green-600 font-medium">FREE - No cost per message!</span>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={sendLineMessage.isPending || !message.trim() || !hasLineToken}
            className="w-full"
            size="lg"
            data-testid="button-send-line"
          >
            {sendLineMessage.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending LINE Messages...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send LINE Messages (FREE)
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-medium">💡 LINE Messaging Benefits:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>✅ <strong>Completely FREE</strong> - No cost per message (vs ฿0.30+ for SMS)</li>
              <li>✅ <strong>5,000 characters</strong> - Much longer than SMS (160 chars)</li>
              <li>✅ <strong>Rich messages</strong> - Send images, stickers, buttons, and more</li>
              <li>✅ <strong>90%+ of Thais use LINE</strong> - Best way to reach Thai customers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
