import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, MessageSquare, Send } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  photo?: string | null;
  birthday?: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject?: string | null;
  message: string;
  isDefault: boolean;
}

interface CustomerMessageDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
  platinum: "bg-[hsl(240,60%,50%)] text-white",
};

export default function CustomerMessageDialog({
  customer,
  open,
  onOpenChange,
}: CustomerMessageDialogProps) {
  const { toast } = useToast();
  const [messageType, setMessageType] = useState<string>("birthday");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("in-app");

  // Fetch templates by type
  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/admin/message-templates/type", messageType],
    enabled: open && !!messageType,
  });

  // Reset when customer changes or dialog opens
  useEffect(() => {
    if (open && customer) {
      setMessageType("birthday");
      setSelectedTemplateId("");
      setCustomMessage("");
      setCustomSubject("");
      setSelectedChannel("in-app"); // Default to in-app
    }
  }, [open, customer?.id]);

  // Update message when template is selected
  useEffect(() => {
    if (selectedTemplateId && customer) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        const processedMessage = replacePlaceholders(template.message, customer);
        setCustomMessage(processedMessage);
        if (template.subject) {
          setCustomSubject(replacePlaceholders(template.subject, customer));
        } else {
          setCustomSubject("");
        }
      }
    }
  }, [selectedTemplateId, templates, customer]);

  const sendMutation = useMutation({
    mutationFn: async (data: { customerId: string; message: string; subject?: string; channel: string }) => {
      const response = await fetch(`/api/admin/customers/${data.customerId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: data.message,
          subject: data.subject,
          channel: data.channel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: `Your message has been sent to ${customer?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/message-log"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!customer || !customMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    sendMutation.mutate({
      customerId: customer.id,
      message: customMessage,
      subject: customSubject || undefined,
      channel: selectedChannel,
    });
  };

  if (!customer) return null;

  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  
  // Determine which channels are active based on selected channel
  const willSendInApp = selectedChannel === "in-app" || selectedChannel === "in-app-sms" || selectedChannel === "in-app-email" || selectedChannel === "all";
  const willSendSMS = (selectedChannel === "sms" || selectedChannel === "in-app-sms" || selectedChannel === "sms-email" || selectedChannel === "all") && customer.phone;
  const willSendEmail = (selectedChannel === "email" || selectedChannel === "in-app-email" || selectedChannel === "sms-email" || selectedChannel === "all") && customer.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>
            Send a personalized message to this customer via In-App notification, SMS, or Email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <Avatar className="w-16 h-16">
              <AvatarImage src={customer.photo || undefined} alt={customer.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">{customer.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={tierColors[customer.tier]}>
                  {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">{customer.points} points</span>
              </div>
              <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message Type Selection */}
          <div className="space-y-2">
            <Label>Message Type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger data-testid="select-message-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="birthday">Birthday Greeting</SelectItem>
                <SelectItem value="promotion">Promotional Message</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="custom">Custom Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channel Selection */}
          <div className="space-y-2">
            <Label>Delivery Channel</Label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger data-testid="select-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in-app">📱 In-App Notification (Shows in Customer App)</SelectItem>
                <SelectItem value="sms">💬 SMS Only</SelectItem>
                <SelectItem value="email">📧 Email Only</SelectItem>
                <SelectItem value="in-app-sms">📱💬 In-App + SMS</SelectItem>
                <SelectItem value="in-app-email">📱📧 In-App + Email</SelectItem>
                <SelectItem value="sms-email">💬📧 SMS + Email</SelectItem>
                <SelectItem value="all">📱💬📧 All Channels</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedChannel === "in-app" && "Message will appear in the customer's app Rewards tab"}
              {selectedChannel === "sms" && "Requires Twilio configuration"}
              {selectedChannel === "email" && "Requires Resend configuration"}
              {(selectedChannel === "in-app-sms" || selectedChannel === "in-app-email" || selectedChannel === "sms-email" || selectedChannel === "all") && "Combines multiple delivery methods"}
            </p>
          </div>

          {/* Template Selection */}
          {templates.length > 0 && messageType !== "custom" && (
            <div className="space-y-2">
              <Label>Message Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.channel})
                      {template.isDefault && " - Default"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email Subject (only when sending via email) */}
          {willSendEmail && (
            <div className="space-y-2">
              <Label>Email Subject (Optional)</Label>
              <Textarea
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                rows={1}
                placeholder="Message from Yens Thai Ice Cream"
                className="resize-none"
                data-testid="input-subject"
              />
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={6}
              placeholder="Type your message here..."
              data-testid="input-message"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Available merge fields (auto-replace with customer data):</p>
              <p className="pl-2">• <code className="bg-muted px-1 py-0.5 rounded">{"{name}"}</code> - Customer name ({customer.name})</p>
              <p className="pl-2">• <code className="bg-muted px-1 py-0.5 rounded">{"{points}"}</code> - Points balance ({customer.points})</p>
              <p className="pl-2">• <code className="bg-muted px-1 py-0.5 rounded">{"{tier}"}</code> - Membership tier ({customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)})</p>
            </div>
          </div>

          {/* Channel Info */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm flex-wrap">
            <span className="text-muted-foreground font-medium">Will deliver via:</span>
            <div className="flex items-center gap-2">
              {willSendInApp && (
                <Badge variant="default" className="gap-1">
                  📱 In-App
                </Badge>
              )}
              {willSendSMS && (
                <Badge variant="outline" className="gap-1">
                  <MessageSquare className="w-3 h-3" />
                  SMS
                </Badge>
              )}
              {willSendEmail && (
                <Badge variant="outline" className="gap-1">
                  <Mail className="w-3 h-3" />
                  Email
                </Badge>
              )}
              {!willSendSMS && selectedChannel.includes("sms") && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  ⚠️ No phone number
                </Badge>
              )}
              {!willSendEmail && selectedChannel.includes("email") && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  ⚠️ No email address
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
            data-testid="button-cancel-message"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!customMessage.trim() || sendMutation.isPending}
            data-testid="button-send-message"
          >
            {sendMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to replace placeholders
function replacePlaceholders(text: string, customer: Customer): string {
  return text
    .replace(/{name}/g, customer.name)
    .replace(/{points}/g, customer.points.toString())
    .replace(/{tier}/g, customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1));
}
