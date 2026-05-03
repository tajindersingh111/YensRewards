import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, Mail, MessageSquare, Sparkles, Info, FileText, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { MessageTemplate } from "@shared/schema";

type MessageChannel = "sms" | "email" | "line" | "both";

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
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ['/api/admin/message-templates/type/birthday'],
  });

  const sendBulkMessage = useMutation({
    mutationFn: async (data: { customerIds: string[]; channel: MessageChannel; subject: string; message: string; htmlContent?: string | null }) => {
      return await apiRequest('POST', '/api/admin/customers/bulk-message', data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      toast({
        title: "Messages Sent!",
        description: `Successfully sent to ${selectedCustomers.length} customers. SMS: ${result.sms.sent} sent, ${result.sms.failed} failed. Email: ${result.email.sent} sent, ${result.email.failed} failed.`,
      });
      setMessage("");
      setSubject("");
      setHtmlContent(null);
      if (onSuccess) onSuccess();
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
      toast({ title: "Message Required", description: "Please enter a message to send", variant: "destructive" });
      return;
    }
    if (selectedCustomers.length === 0) {
      toast({ title: "No Customers Selected", description: "Please select at least one customer", variant: "destructive" });
      return;
    }
    if ((channel === "email" || channel === "both") && !subject.trim()) {
      toast({ title: "Subject Required", description: "Email requires a subject line", variant: "destructive" });
      return;
    }
    const customerIds = selectedCustomers.map(c => c.id);
    sendBulkMessage.mutate({ customerIds, channel, subject, message, htmlContent });
  };

  const insertPlaceholder = (placeholder: string) => {
    setMessage(prev => prev + `{${placeholder}}`);
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.message);
      setHtmlContent(template.htmlContent || null);
      if (template.subject) setSubject(template.subject);
      if (template.channel === "sms" || template.channel === "email" || template.channel === "line" || template.channel === "both") {
        setChannel(template.channel as MessageChannel);
      }
      setSelectedTemplateId(templateId);
      toast({ title: "Template Loaded", description: `Loaded "${template.name}" template${template.htmlContent ? ' (with HTML)' : ''}` });
    }
  };

  const customersWithSMS = selectedCustomers.filter(c => c.phone).length;
  const customersWithEmail = selectedCustomers.filter(c => c.email).length;
  const customersWithLINE = selectedCustomers.filter(c => (c as any).lineUid).length;

  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
      {/* Branded Header */}
      <div className="bg-blue-900 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
            <Users className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Compose Message</h2>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em] mt-1.5">Create and send messages on-the-fly</p>
          </div>
        </div>
        <Badge className="bg-yellow-400 text-blue-900 font-black border-none text-[9px] uppercase tracking-widest" data-testid="badge-selected-customers">
          <Users className="w-3 h-3 mr-1" />
          {selectedCustomers.length} Selected
        </Badge>
      </div>

      <CardContent className="p-8 space-y-6">
        {/* Template Selector */}
        {templates.length > 0 && (
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Load Template</Label>
            <div className="flex gap-2">
              <Select value={selectedTemplateId} onValueChange={loadTemplate}>
                <SelectTrigger data-testid="select-template" className="rounded-xl border-slate-100">
                  <SelectValue placeholder="Choose a saved birthday template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {template.name}
                        {template.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateId && (
                <Button
                  variant="outline"
                  onClick={() => { setSelectedTemplateId(""); setMessage(""); setSubject(""); }}
                  className="rounded-xl border-blue-900/10 text-blue-900 font-black uppercase text-[10px] tracking-widest"
                  data-testid="button-clear-template"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Channel Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center gap-1">
            <MessageSquare className="w-4 h-4 text-blue-900" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SMS</span>
            <span className="text-sm font-black text-blue-900" data-testid="stat-sms-count">{customersWithSMS}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center gap-1">
            <Mail className="w-4 h-4 text-blue-900" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</span>
            <span className="text-sm font-black text-blue-900" data-testid="stat-email-count">{customersWithEmail}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center gap-1">
            <MessageCircle className="w-4 h-4 text-blue-900" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LINE</span>
            <span className="text-sm font-black text-blue-900" data-testid="stat-line-count">{customersWithLINE}</span>
          </div>
        </div>

        {/* Channel Selection */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Channel</Label>
          <Select value={channel} onValueChange={(value) => setChannel(value as MessageChannel)}>
            <SelectTrigger data-testid="select-channel" className="rounded-xl border-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sms">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS Only (฿0.30+ each)
                </div>
              </SelectItem>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Only
                </div>
              </SelectItem>
              <SelectItem value="line">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  LINE Only (FREE)
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
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Subject</Label>
            <Input
              placeholder="Special offer for {tier} members!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl border-slate-100"
              data-testid="input-subject"
            />
          </div>
        )}

        {/* HTML Preview or Plain Text */}
        {htmlContent && (channel === "email" || channel === "both") ? (
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Preview
            </Label>
            <div
              className="border border-slate-100 rounded-xl p-4 bg-white overflow-y-auto"
              style={{ maxHeight: '500px' }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              data-testid="html-email-preview"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</Label>
            <Textarea
              placeholder="Hi {name}! You currently have {points} points as a {tier} member..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="rounded-xl border-slate-100 bg-slate-50 font-medium text-slate-800"
              data-testid="textarea-message"
            />
          </div>
        )}

        {/* Placeholder Helper */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-900" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dynamic Placeholders</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["name", "points", "tier"].map((ph) => (
              <Button
                key={ph}
                variant="outline"
                size="sm"
                onClick={() => insertPlaceholder(ph)}
                className="rounded-lg border-blue-900/10 text-blue-900 font-black text-[10px] uppercase tracking-widest"
                data-testid={`button-placeholder-${ph}`}
              >
                {`{${ph}}`}
              </Button>
            ))}
          </div>
          <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
            These will be replaced with each customer's actual data
          </p>
        </div>

        {/* Warnings */}
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
        <Button
          onClick={handleSend}
          disabled={sendBulkMessage.isPending || selectedCustomers.length === 0 || !message.trim()}
          className="w-full h-14 bg-yellow-400 text-blue-900 font-black uppercase text-sm rounded-2xl shadow-xl"
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
      </CardContent>
    </Card>
  );
}
