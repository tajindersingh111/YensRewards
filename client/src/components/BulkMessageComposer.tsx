import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, Mail, MessageSquare, Sparkles, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type MessageChannel = "sms" | "email" | "both";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  tier: string;
  totalSpent: string;
}

interface BulkMessageComposerProps {
  selectedCustomers: Customer[];
  onSuccess?: () => void;
}

export default function BulkMessageComposer({ selectedCustomers, onSuccess }: BulkMessageComposerProps) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const sendBulkMessage = useMutation({
    mutationFn: async (data: { customerIds: string[]; channel: MessageChannel; subject: string; message: string }) => {
      return await apiRequest('POST', '/api/admin/customers/bulk-message', data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      
      toast({
        title: "Messages Sent!",
        description: `Successfully sent to ${selectedCustomers.length} customers. SMS: ${result.sms.sent} sent, ${result.sms.failed} failed. Email: ${result.email.sent} sent, ${result.email.failed} failed.`,
      });

      // Reset form
      setMessage("");
      setSubject("");
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Messages",
        description: error.message || "An error occurred while sending messages",
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

    if (selectedCustomers.length === 0) {
      toast({
        title: "No Customers Selected",
        description: "Please select at least one customer",
        variant: "destructive",
      });
      return;
    }

    if ((channel === "email" || channel === "both") && !subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Email requires a subject line",
        variant: "destructive",
      });
      return;
    }

    const customerIds = selectedCustomers.map(c => c.id);
    sendBulkMessage.mutate({ customerIds, channel, subject, message });
  };

  const insertPlaceholder = (placeholder: string) => {
    setMessage(prev => prev + `{${placeholder}}`);
  };

  const customersWithSMS = selectedCustomers.filter(c => c.phone).length;
  const customersWithEmail = selectedCustomers.filter(c => c.email).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Compose Message
            </CardTitle>
            <CardDescription>
              Create and send messages on-the-fly without saving templates
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-2" data-testid="badge-selected-customers">
            <Users className="w-4 h-4" />
            {selectedCustomers.length} Selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channel Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-muted-foreground">With Phone:</span>
            <Badge variant="outline" data-testid="stat-sms-count">{customersWithSMS}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-purple-600" />
            <span className="text-muted-foreground">With Email:</span>
            <Badge variant="outline" data-testid="stat-email-count">{customersWithEmail}</Badge>
          </div>
        </div>

        {/* Channel Selection */}
        <div className="space-y-2">
          <Label htmlFor="channel">Channel</Label>
          <Select value={channel} onValueChange={(value) => setChannel(value as MessageChannel)}>
            <SelectTrigger id="channel" data-testid="select-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sms">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS Only
                </div>
              </SelectItem>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Only
                </div>
              </SelectItem>
              <SelectItem value="both">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <Mail className="w-4 h-4" />
                  Both SMS & Email
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Subject */}
        {(channel === "email" || channel === "both") && (
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              placeholder="Special offer for {tier} members!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-subject"
            />
          </div>
        )}

        {/* Message Composer */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Hi {name}! You currently have {points} points as a {tier} member..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            data-testid="textarea-message"
          />
        </div>

        {/* Placeholder Helper */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="text-sm font-medium">Dynamic Placeholders:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder("name")}
                  data-testid="button-placeholder-name"
                >
                  {"{name}"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder("points")}
                  data-testid="button-placeholder-points"
                >
                  {"{points}"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertPlaceholder("tier")}
                  data-testid="button-placeholder-tier"
                >
                  {"{tier}"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These will be replaced with each customer's actual data
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Warning if missing contact info */}
        {((channel === "sms" || channel === "both") && customersWithSMS < selectedCustomers.length) && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {selectedCustomers.length - customersWithSMS} selected customers don't have phone numbers and won't receive SMS
            </AlertDescription>
          </Alert>
        )}

        {((channel === "email" || channel === "both") && customersWithEmail < selectedCustomers.length) && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {selectedCustomers.length - customersWithEmail} selected customers don't have email addresses and won't receive email
            </AlertDescription>
          </Alert>
        )}

        {/* Send Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSend}
            disabled={sendBulkMessage.isPending || selectedCustomers.length === 0 || !message.trim()}
            size="lg"
            data-testid="button-send-bulk-message"
          >
            {sendBulkMessage.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
