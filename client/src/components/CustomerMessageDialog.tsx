import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
  bronze: "bg-orange-50 text-orange-700 border-orange-200",
  silver: "bg-slate-50 text-slate-700 border-slate-200",
  gold: "bg-amber-50 text-amber-700 border-amber-200",
  platinum: "bg-purple-50 text-purple-700 border-purple-200",
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

  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/admin/message-templates/type", messageType],
    enabled: open && !!messageType,
  });

  useEffect(() => {
    if (open && customer) {
      setMessageType("birthday");
      setSelectedTemplateId("");
      setCustomMessage("");
      setCustomSubject("");
      setSelectedChannel("in-app");
    }
  }, [open, customer?.id]);

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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: data.message, subject: data.subject, channel: data.channel }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent!", description: `Your message has been sent to ${customer?.name}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/message-log"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to send message", description: error.message || "Please try again", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!customer || !customMessage.trim()) {
      toast({ title: "Message required", description: "Please enter a message to send", variant: "destructive" });
      return;
    }
    sendMutation.mutate({ customerId: customer.id, message: customMessage, subject: customSubject || undefined, channel: selectedChannel });
  };

  if (!customer) return null;

  const initials = customer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  
  const willSendInApp = selectedChannel === "in-app" || selectedChannel === "in-app-sms" || selectedChannel === "in-app-email" || selectedChannel === "all";
  const willSendSMS = (selectedChannel === "sms" || selectedChannel === "in-app-sms" || selectedChannel === "sms-email" || selectedChannel === "all") && customer.phone;
  const willSendEmail = (selectedChannel === "email" || selectedChannel === "in-app-email" || selectedChannel === "sms-email" || selectedChannel === "all") && customer.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2rem]">
        {/* Branded Header */}
        <div className="bg-blue-900 px-8 py-6 rounded-t-[2rem] flex items-center gap-4">
          <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
            <Send className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Send Message</h2>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em] mt-1.5">Personalized customer communication</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Customer Info */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <Avatar className="w-14 h-14 border-2 border-white shadow-md">
              <AvatarImage src={customer.photo || undefined} alt={customer.name} />
              <AvatarFallback className="bg-blue-900 text-white font-black text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-blue-900 uppercase tracking-tight truncate">{customer.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={`${tierColors[customer.tier]} font-black text-[9px] uppercase border-2`}>
                  {customer.tier}
                </Badge>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{customer.points} pts</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <MessageSquare className="w-3 h-3" /> {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Mail className="w-3 h-3" /> {customer.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message Type */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="rounded-xl border-slate-100" data-testid="select-message-type">
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
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Channel</Label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="rounded-xl border-slate-100" data-testid="select-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in-app">In-App Notification</SelectItem>
                <SelectItem value="sms">SMS Only</SelectItem>
                <SelectItem value="email">Email Only</SelectItem>
                <SelectItem value="in-app-sms">In-App + SMS</SelectItem>
                <SelectItem value="in-app-email">In-App + Email</SelectItem>
                <SelectItem value="sms-email">SMS + Email</SelectItem>
                <SelectItem value="all">All Channels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          {templates.length > 0 && messageType !== "custom" && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="rounded-xl border-slate-100" data-testid="select-template">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.channel}){template.isDefault && " — Default"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email Subject */}
          {willSendEmail && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Subject (Optional)</Label>
              <Textarea
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                rows={1}
                placeholder="Message from Yens Thai Ice Cream"
                className="resize-none rounded-xl border-slate-100 bg-slate-50"
                data-testid="input-subject"
              />
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={6}
              placeholder="Type your message here..."
              className="rounded-xl border-slate-100 bg-slate-50 font-medium text-slate-800"
              data-testid="input-message"
            />
            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <p>Merge fields — auto-replaced with customer data:</p>
              <p className="font-medium normal-case tracking-normal text-slate-500">
                <code className="bg-white px-1 py-0.5 rounded text-[10px]">{"{name}"}</code> → {customer.name} &nbsp;
                <code className="bg-white px-1 py-0.5 rounded text-[10px]">{"{points}"}</code> → {customer.points} &nbsp;
                <code className="bg-white px-1 py-0.5 rounded text-[10px]">{"{tier}"}</code> → {customer.tier}
              </p>
            </div>
          </div>

          {/* Channel delivery summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivers via:</span>
            {willSendInApp && <Badge className="bg-blue-900 text-white font-black text-[9px] border-none">In-App</Badge>}
            {willSendSMS && <Badge className="bg-blue-900/10 text-blue-900 font-black text-[9px] border-none"><MessageSquare className="w-2.5 h-2.5 mr-1" />SMS</Badge>}
            {willSendEmail && <Badge className="bg-blue-900/10 text-blue-900 font-black text-[9px] border-none"><Mail className="w-2.5 h-2.5 mr-1" />Email</Badge>}
            {!willSendSMS && selectedChannel.includes("sms") && <Badge variant="destructive" className="text-[9px] font-black">No phone</Badge>}
            {!willSendEmail && selectedChannel.includes("email") && <Badge variant="destructive" className="text-[9px] font-black">No email</Badge>}
          </div>
        </div>

        <DialogFooter className="px-8 pb-8 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendMutation.isPending}
            className="font-black uppercase text-[10px] tracking-widest rounded-xl border-blue-900/10 text-blue-900"
            data-testid="button-cancel-message"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!customMessage.trim() || sendMutation.isPending}
            className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
            data-testid="button-send-message"
          >
            {sendMutation.isPending ? "Sending..." : <><Send className="w-4 h-4 mr-2" />Send Message</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function replacePlaceholders(text: string, customer: Customer): string {
  return text
    .replace(/{name}/g, customer.name)
    .replace(/{points}/g, customer.points.toString())
    .replace(/{tier}/g, customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1));
}
