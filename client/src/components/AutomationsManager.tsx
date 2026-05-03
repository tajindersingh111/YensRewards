/* LEF'S PREMIER YENS AUTOMATION ENGINE: FINAL COMMAND CENTER */
/* Changes: Tactical Cards, Executive Branding, Branded Delete Dialog */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Zap, Plus, Pencil, Trash2, CheckCircle, XCircle,
  Clock, Mail, MessageSquare, Smartphone, Hash, FlaskConical,
  Filter, RotateCcw, Cake, Layers, Play, Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TriggerConfig {
  time?: string;
  dayOfWeek?: string;
  dayOfMonth?: number;
  date?: string;
}

interface Automation {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  triggerType: string;
  triggerConfig: TriggerConfig;
  customerFilter: string;
  channel: string;
  templateId?: string | null;
  subject?: string | null;
  message: string;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  runCount: number;
  createdAt: string;
}

interface AutomationRun {
  id: string;
  automationId: string;
  triggeredAt: string;
  status: string;
  sentCount: number;
  failedCount: number;
  errorMessage?: string | null;
  completedAt?: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject?: string | null;
  message: string;
  isActive: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "recurring_daily",   label: "Every Day" },
  { value: "recurring_weekly",  label: "Every Week" },
  { value: "recurring_monthly", label: "Every Month" },
  { value: "one_time",          label: "One-Time" },
] as const;

const CHANNEL_OPTIONS = [
  { value: "app",   label: "App Push", icon: Smartphone,    cls: "bg-blue-50 text-blue-700 border-blue-100" },
  { value: "line",  label: "LINE",     icon: MessageSquare, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { value: "sms",   label: "SMS",      icon: Hash,          cls: "bg-slate-50 text-slate-700 border-slate-100" },
  { value: "email", label: "Email",    icon: Mail,          cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
] as const;

const FILTER_OPTIONS = [
  { value: "all",            label: "All Customers" },
  { value: "tier_bronze",    label: "Bronze Tier" },
  { value: "tier_silver",    label: "Silver Tier" },
  { value: "tier_gold",      label: "Gold Tier" },
  { value: "tier_platinum",  label: "Platinum Tier" },
  { value: "birthday_today", label: "Birthday Today" },
  { value: "inactive_30d",   label: "Inactive 30+ Days" },
  { value: "inactive_60d",   label: "Inactive 60+ Days" },
] as const;

const DAY_OPTIONS = [
  { value: "monday",    label: "Monday" },
  { value: "tuesday",   label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday",  label: "Thursday" },
  { value: "friday",    label: "Friday" },
  { value: "saturday",  label: "Saturday" },
  { value: "sunday",    label: "Sunday" },
] as const;

// ── Quickstart templates ───────────────────────────────────────────────────────

const QUICKSTART_TEMPLATES = [
  {
    key: "birthday_email",
    icon: Cake,
    label: "Birthday Email",
    description: "Send a birthday greeting email to customers on their birthday",
    defaults: {
      name: "Birthday Greeting",
      description: "Automatically sends a birthday email to customers on their special day",
      triggerType: "recurring_daily" as const,
      triggerTime: "09:00",
      customerFilter: "birthday_today",
      channel: "email" as const,
      subject: "Happy Birthday from Yen's!",
      message: "Dear {name},\n\nHappy Birthday from everyone at Yen's Thai Ice Cream!\n\nTo celebrate your special day, we'd love to treat you to something sweet. Come visit us and show this message to receive a special birthday treat on us.\n\nYour loyalty points: {points}\nMembership tier: {tier}\n\nWe hope to see you soon!\n\nWith love,\nThe Yen's Team",
    },
  },
  {
    key: "inactive_winback",
    icon: RotateCcw,
    label: "Win-Back Campaign",
    description: "Re-engage customers who haven't visited in 30 days",
    defaults: {
      name: "30-Day Win-Back",
      description: "Sends a friendly re-engagement message to customers who haven't visited recently",
      triggerType: "recurring_weekly" as const,
      triggerTime: "11:00",
      triggerDayOfWeek: "monday",
      customerFilter: "inactive_30d",
      channel: "line" as const,
      subject: "",
      message: "Hi {name}! We miss you at Yen's Thai Ice Cream. It's been a while since your last visit. Come back and enjoy your favourite treats — your {points} points are waiting for you! See you soon!",
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function channelMeta(channel: string) {
  return CHANNEL_OPTIONS.find(c => c.value === channel) ?? CHANNEL_OPTIONS[0];
}

function triggerLabel(t: string) {
  return TRIGGER_OPTIONS.find(o => o.value === t)?.label ?? t;
}

function filterLabel(f: string) {
  return FILTER_OPTIONS.find(o => o.value === f)?.label ?? f;
}

function triggerSummary(a: Automation): string {
  const { triggerType: t, triggerConfig: c } = a;
  const time = c.time ?? "09:00";
  if (t === "recurring_daily")    return `Daily at ${time}`;
  if (t === "recurring_weekly")   return `Every ${c.dayOfWeek ?? "Monday"} at ${time}`;
  if (t === "recurring_monthly")  return `Monthly on day ${c.dayOfMonth ?? 1} at ${time}`;
  if (t === "one_time" && c.date) return `Once on ${c.date} at ${time}`;
  return triggerLabel(t);
}

function recipientLabel(channel: string): string {
  if (channel === "email") return "Test email address";
  if (channel === "sms")   return "Test phone number (e.g. +66812345678)";
  if (channel === "line")  return "Test LINE User ID (Uxxxxxxxxxx)";
  return "";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const meta = channelMeta(channel);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />;
  if (status === "failed")    return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  return <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
}

// ── Run History Panel ─────────────────────────────────────────────────────────

function RunHistoryPanel({ automationId }: { automationId: string }) {
  const { data: runs = [], isLoading } = useQuery<AutomationRun[]>({
    queryKey: ["/api/admin/automations", automationId, "runs"],
    queryFn: () =>
      fetch(`/api/admin/automations/${automationId}/runs`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground py-2">Loading history…</p>;
  if (runs.length === 0) return <p className="text-xs text-muted-foreground py-2">No runs yet</p>;

  return (
    <div className="divide-y">
      {runs.map(run => (
        <div key={run.id} className="flex items-center gap-3 py-2 text-xs">
          <StatusIcon status={run.status} />
          <span className="text-muted-foreground w-32 shrink-0">
            {format(new Date(run.triggeredAt), "dd MMM yy, HH:mm")}
          </span>
          <span className="font-medium text-green-700">{run.sentCount} sent</span>
          {run.failedCount > 0 && (
            <span className="font-medium text-red-500">{run.failedCount} failed</span>
          )}
          {run.status === "running" && (
            <Badge variant="outline" className="text-xs py-0">Running</Badge>
          )}
          {run.errorMessage && (
            <span className="text-muted-foreground truncate max-w-[200px]" title={run.errorMessage}>
              {run.errorMessage}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Test Send Dialog ──────────────────────────────────────────────────────────

function TestSendDialog({
  automation,
  open,
  onOpenChange,
}: {
  automation: Automation;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const needsRecipient = automation.channel !== "app";

  async function handleSend() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/automations/${automation.id}/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testRecipient: recipient || undefined }),
      });
      const json = await res.json();
      setResult(json);
      if (json.success) toast({ title: "Test sent successfully" });
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setRecipient(""); setResult(null); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-500" />
            Test Send
          </DialogTitle>
          <DialogDescription>
            Send a test version of <strong>{automation.name}</strong> to a single recipient. The message will be prefixed with [TEST].
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted/40 p-3 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <ChannelBadge channel={automation.channel} />
              {automation.subject && (
                <span className="text-xs text-muted-foreground truncate">Subject: {automation.subject}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4">{automation.message}</p>
          </div>

          {needsRecipient ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{recipientLabel(automation.channel)}</label>
              <Input
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder={
                  automation.channel === "email" ? "you@example.com" :
                  automation.channel === "sms"   ? "+66812345678" :
                  "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                }
                data-testid="input-test-recipient"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">App notifications don't require a recipient — the test will be logged only.</p>
          )}

          {result && (
            <div className={`rounded-md p-3 text-sm flex items-center gap-2 ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {result.success ? "Message sent successfully" : (result.error ?? "Send failed")}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={handleSend}
            disabled={sending || (needsRecipient && !recipient.trim())}
            data-testid="button-send-test"
          >
            <FlaskConical className="w-4 h-4 mr-2" />
            {sending ? "Sending…" : "Send Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Automation Card ───────────────────────────────────────────────────────────

function AutomationCard({
  automation,
  onEdit,
  onDelete,
  onToggle,
}: {
  automation: Automation;
  onEdit: (a: Automation) => void;
  onDelete: (a: Automation) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const runNow = useMutation({
    mutationFn: () =>
      fetch(`/api/admin/automations/${automation.id}/run`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }).then(r => r.json()),
    onSuccess: () => {
      toast({
        title: "Automation running",
        description: `"${automation.name}" is sending to matching customers now. Check Run history in a moment.`,
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/automations", automation.id, "runs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] });
        setShowHistory(true);
      }, 3000);
    },
    onError: () => toast({ title: "Failed to run automation", variant: "destructive" }),
  });

  return (
    <Card
      data-testid={`card-automation-${automation.id}`}
      className={`border-none shadow-xl rounded-[2.5rem] bg-white hover:shadow-2xl transition-all duration-500 overflow-hidden ${automation.isActive ? "" : "opacity-60"}`}
    >
      <CardContent className="p-6 space-y-4">
        {/* Row 1: Badges + title + toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-blue-900/10 text-blue-900 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                {automation.triggerType.replace(/_/g, " ")}
              </Badge>
              <ChannelBadge channel={automation.channel} />
              {!automation.isActive && (
                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Paused</Badge>
              )}
            </div>
            <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight truncate leading-tight">
              {automation.name}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={automation.isActive}
              onCheckedChange={(checked) => onToggle(automation.id, checked)}
              className="data-[state=checked]:bg-yellow-400"
              data-testid={`toggle-automation-${automation.id}`}
            />
            <Button variant="ghost" size="icon" onClick={() => setTestOpen(true)} className="h-9 w-9 rounded-xl text-blue-900" data-testid={`button-test-automation-${automation.id}`}>
              <FlaskConical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Tactical Metadata */}
        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
          <div className="space-y-1">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Schedule Protocol</p>
            <p className="text-[10px] font-bold text-blue-900 flex items-center gap-1.5">
              <Clock className="w-3 h-3 opacity-50" /> {triggerSummary(automation)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Target Filter</p>
            <p className="text-[10px] font-bold text-blue-900 flex items-center gap-1.5">
              <Filter className="w-3 h-3 opacity-50" /> {filterLabel(automation.customerFilter)}
            </p>
          </div>
        </div>

        {/* Row 3: Performance Metrics + Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-sm font-black text-blue-900 leading-none">{automation.runCount}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Executions</p>
            </div>
            {automation.lastRunAt && (
              <div className="text-left border-l border-slate-100 pl-4">
                <p className="text-[9px] font-black text-blue-900/60 uppercase leading-none">
                  Last Run {formatDistanceToNow(new Date(automation.lastRunAt))} ago
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Status: Verified</p>
              </div>
            )}
          </div>

          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(automation)} className="h-8 w-8 rounded-lg" data-testid={`button-edit-automation-${automation.id}`}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(automation)} className="h-8 w-8 rounded-lg text-red-400" data-testid={`button-delete-automation-${automation.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className={`h-8 w-8 rounded-lg ${showHistory ? "bg-blue-900 text-white" : "text-blue-900"}`}
              data-testid={`button-history-automation-${automation.id}`}
            >
              <Activity className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {showHistory && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
            <p className="text-[9px] font-black text-blue-900 uppercase tracking-[0.2em] mb-2">Audit Logs</p>
            <RunHistoryPanel automationId={automation.id} />
            <Button
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending}
              className="w-full mt-4 bg-blue-900 text-white font-black uppercase text-[10px] tracking-widest h-9 rounded-xl"
              data-testid={`button-run-automation-${automation.id}`}
            >
              <Play className="w-3 h-3 mr-2 fill-current" /> Manual Override Launch
            </Button>
          </div>
        )}
      </CardContent>

      <TestSendDialog automation={automation} open={testOpen} onOpenChange={setTestOpen} />
    </Card>
  );
}

// ── Form schema ───────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["recurring_daily", "recurring_weekly", "recurring_monthly", "one_time"]),
  triggerTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").default("09:00"),
  triggerDayOfWeek: z.string().optional(),
  triggerDayOfMonth: z.coerce.number().min(1).max(31).optional(),
  triggerDate: z.string().optional(),
  customerFilter: z.string().min(1, "Select an audience"),
  channel: z.enum(["app", "line", "sms", "email"]),
  templateId: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, "Message content is required"),
});

type FormValues = z.infer<typeof formSchema>;

// ── Automation Dialog (Create / Edit) ─────────────────────────────────────────

function AutomationDialog({
  open,
  onOpenChange,
  editing,
  prefill,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Automation | null;
  prefill?: Partial<FormValues> | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/admin/message-templates"],
  });

  const activeTemplates = templates.filter(t => t.isActive);

  const defaultValues: FormValues = editing
    ? {
        name: editing.name,
        description: editing.description ?? "",
        triggerType: editing.triggerType as FormValues["triggerType"],
        triggerTime: editing.triggerConfig.time ?? "09:00",
        triggerDayOfWeek: editing.triggerConfig.dayOfWeek ?? "monday",
        triggerDayOfMonth: editing.triggerConfig.dayOfMonth ?? 1,
        triggerDate: editing.triggerConfig.date ?? "",
        customerFilter: editing.customerFilter,
        channel: editing.channel as FormValues["channel"],
        templateId: editing.templateId ?? "",
        subject: editing.subject ?? "",
        message: editing.message,
      }
    : {
        name: prefill?.name ?? "",
        description: prefill?.description ?? "",
        triggerType: prefill?.triggerType ?? "recurring_daily",
        triggerTime: prefill?.triggerTime ?? "09:00",
        triggerDayOfWeek: (prefill as any)?.triggerDayOfWeek ?? "monday",
        triggerDayOfMonth: (prefill as any)?.triggerDayOfMonth ?? 1,
        triggerDate: prefill?.triggerDate ?? "",
        customerFilter: prefill?.customerFilter ?? "all",
        channel: prefill?.channel ?? "line",
        templateId: "",
        subject: prefill?.subject ?? "",
        message: prefill?.message ?? "",
      };

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });

  const triggerType = form.watch("triggerType");
  const channel     = form.watch("channel");
  const templateId  = form.watch("templateId");

  const TEMPLATE_NONE = "__none__";

  const onTemplateChange = (tid: string) => {
    const realId = tid === TEMPLATE_NONE ? "" : tid;
    form.setValue("templateId", realId);
    if (!realId) return;
    const tmpl = activeTemplates.find(t => t.id === realId);
    if (!tmpl) return;
    if (tmpl.message) form.setValue("message", tmpl.message);
    if (tmpl.subject) form.setValue("subject", tmpl.subject);
    if (tmpl.channel) form.setValue("channel", tmpl.channel as FormValues["channel"]);
  };

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const triggerConfig: TriggerConfig = { time: values.triggerTime };
      if (values.triggerType === "recurring_weekly")  triggerConfig.dayOfWeek  = values.triggerDayOfWeek;
      if (values.triggerType === "recurring_monthly") triggerConfig.dayOfMonth = values.triggerDayOfMonth;
      if (values.triggerType === "one_time")          triggerConfig.date        = values.triggerDate;

      const payload = {
        name: values.name,
        description: values.description || null,
        triggerType: values.triggerType,
        triggerConfig,
        customerFilter: values.customerFilter,
        channel: values.channel,
        templateId: values.templateId || null,
        subject: values.subject || null,
        message: values.message,
        isActive: editing?.isActive ?? true,
      };

      if (editing) {
        return apiRequest("PUT", `/api/admin/automations/${editing.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/automations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] });
      toast({ title: editing ? "Automation updated" : "Automation created" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0">
        <div className="bg-blue-900 p-6 text-white flex items-center gap-4">
          <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
            <Zap className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight leading-none">{editing ? "Edit Automation" : "New Automation"}</h2>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1.5 opacity-90">
              {editing ? "Update the automation settings below." : "Configure a rule-based message that sends automatically."}
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => save.mutate(v))} className="space-y-5" id="automation-form">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Details</p>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Birthday Greeting" {...field} data-testid="input-automation-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description
                      <span className="ml-1 text-muted-foreground font-normal text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Short note about this automation" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule</p>

                <FormField control={form.control} name="triggerType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeats</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-type"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRIGGER_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  {triggerType === "recurring_weekly" && (
                    <FormField control={form.control} name="triggerDayOfWeek" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of week</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {DAY_OPTIONS.map(d => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {triggerType === "recurring_monthly" && (
                    <FormField control={form.control} name="triggerDayOfMonth" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of month</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={31} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {triggerType === "one_time" && (
                    <FormField control={form.control} name="triggerDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="triggerTime" render={({ field }) => (
                    <FormItem className={triggerType === "recurring_daily" ? "col-span-2" : ""}>
                      <FormLabel>Time</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormDescription className="text-xs">Bangkok time (UTC+7)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audience</p>

                <FormField control={form.control} name="customerFilter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Send to</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer-filter"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FILTER_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</p>

                <FormField control={form.control} name="channel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-channel"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {activeTemplates.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                      Load from template
                      <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </label>
                    <Select value={templateId || TEMPLATE_NONE} onValueChange={onTemplateChange}>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue placeholder="Choose a template to auto-fill…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TEMPLATE_NONE}>— None —</SelectItem>
                        {activeTemplates.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                            <span className="ml-2 text-muted-foreground text-xs capitalize">({t.channel})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {templateId && templateId !== TEMPLATE_NONE && (
                      <p className="text-xs text-amber-600">Template loaded — you can still edit the message below.</p>
                    )}
                  </div>
                )}

                {channel === "email" && (
                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Subject line" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message content</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Type your message here…"
                        {...field}
                        data-testid="textarea-automation-message"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Placeholders: {"{name}"} · {"{points}"} · {"{tier}"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </form>
          </Form>
        </div>

        <div className="p-6 bg-slate-50 flex flex-wrap gap-3">
          {editing && (
            <Button
              type="button"
              variant="outline"
              className="mr-auto"
              onClick={() => setTestDialogOpen(true)}
              data-testid="button-test-send-automation"
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Send Test
            </Button>
          )}
          <Button type="button" variant="outline" className="border-blue-900/10 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="automation-form"
            disabled={save.isPending}
            className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
            data-testid="button-save-automation"
          >
            {save.isPending ? "Saving…" : editing ? "Save Changes" : "Create Automation"}
          </Button>
        </div>
      </DialogContent>
      {editing && (
        <TestSendDialog
          automation={editing}
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
        />
      )}
    </Dialog>
  );
}

// ── Main Automation Engine ────────────────────────────────────────────────────

export default function AutomationsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [deletingAutomation, setDeletingAutomation] = useState<Automation | null>(null);
  const [prefill, setPrefill] = useState<Partial<FormValues> | null>(null);

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: ["/api/admin/automations"],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/automations/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] });
      setDeletingAutomation(null);
      toast({ title: "Automation Deleted" });
    },
  });

  return (
    <div className="space-y-8 pb-20">
      {/* EXECUTIVE COMMAND HEADER */}
      <div className="bg-blue-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-yellow-400 rounded-2xl p-4 shadow-lg shrink-0 transform -rotate-3">
              <Zap className="h-6 w-6 text-blue-900" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Automation Engine</h2>
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-80">Global Dispatch Protocols Active</p>
            </div>
          </div>
          <Button
            onClick={() => { setEditingAutomation(null); setPrefill(null); setDialogOpen(true); }}
            className="bg-yellow-400 text-blue-900 font-black uppercase text-xs px-8 h-14 rounded-2xl shadow-xl transition-all"
            data-testid="button-create-automation"
          >
            <Plus className="w-4 h-4 mr-2" /> Initialize Logic
          </Button>
        </div>
      </div>

      {/* QUICKSTART ACCELERATORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUICKSTART_TEMPLATES.map((tmpl) => (
          <Card
            key={tmpl.key}
            className="border border-slate-100 bg-white/50 rounded-3xl p-6 cursor-pointer group hover:border-yellow-400 transition-all"
            onClick={() => { setPrefill(tmpl.defaults as unknown as Partial<FormValues>); setEditingAutomation(null); setDialogOpen(true); }}
            data-testid={`button-quickstart-${tmpl.key}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-900 transition-colors">
                <tmpl.icon className="w-5 h-5 text-blue-900 group-hover:text-yellow-400 transition-colors" />
              </div>
              <div>
                <h4 className="font-black text-blue-900 uppercase text-xs tracking-tight">{tmpl.label}</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase leading-tight">{tmpl.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ACTIVE LOGIC GRID */}
      {isLoading ? (
        <div className="text-center py-20 font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Synchronizing Logic Cores...</div>
      ) : automations.length === 0 ? (
        <div className="py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-lg flex items-center justify-center mx-auto mb-6">
            <Zap className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">System Idle</h3>
          <p className="max-w-xs mx-auto text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 leading-relaxed">
            No active automations detected. Use a blueprint above to launch your first rule.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {automations.map(auto => (
            <AutomationCard
              key={auto.id}
              automation={auto}
              onEdit={(a) => { setEditingAutomation(a); setPrefill(null); setDialogOpen(true); }}
              onDelete={setDeletingAutomation}
              onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
            />
          ))}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      {dialogOpen && (
        <AutomationDialog
          open={dialogOpen}
          onOpenChange={v => { setDialogOpen(v); if (!v) { setEditingAutomation(null); setPrefill(null); } }}
          editing={editingAutomation}
          prefill={prefill}
        />
      )}

      {/* BRANDED DELETE DIALOG */}
      <AlertDialog open={!!deletingAutomation} onOpenChange={(v) => !v && setDeletingAutomation(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-blue-900 p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Purge Logic Core?</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400 font-bold uppercase tracking-wide">
              Confirming this will permanently delete <span className="text-blue-900">{deletingAutomation?.name}</span>. This action cannot be reversed.
            </p>
          </div>
          <AlertDialogFooter className="p-8 pt-0 flex gap-3">
            <AlertDialogCancel className="flex-1 h-12 rounded-xl font-black uppercase text-[10px]">Abort</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAutomation && deleteMutation.mutate(deletingAutomation.id)}
              className="flex-1 h-12 bg-red-600 text-white font-black uppercase text-[10px]"
              data-testid="button-confirm-delete-automation"
            >
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
