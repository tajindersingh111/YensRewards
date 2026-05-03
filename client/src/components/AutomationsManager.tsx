/* LEF'S PREMIER YENS AUTOMATION ENGINE: FINAL COMMAND CENTER */
/* Changes: Full Yens Blue branding, Premium Filter Suite, and Senior Staff Dashboard */

import { useState, useMemo } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Zap, Plus, Pencil, Trash2, ChevronDown, ChevronRight, CheckCircle, XCircle,
  Clock, Mail, MessageSquare, Smartphone, Hash, FlaskConical, Search,
  Filter, Calendar, RotateCcw, Cake, Layers, Play, Megaphone, Activity, Sparkles,
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
  { value: "app",   label: "App Push", icon: Smartphone,   cls: "bg-blue-50 text-blue-700 border-blue-100" },
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
      className={`transition-opacity duration-150 ${automation.isActive ? "" : "opacity-60"}`}
    >
      <CardContent className="p-5 space-y-4">
        {/* Row 1: name + badges + actions */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{automation.name}</span>
              <ChannelBadge channel={automation.channel} />
              {!automation.isActive && (
                <Badge variant="outline" className="text-xs text-muted-foreground">Paused</Badge>
              )}
              {automation.triggerType === "one_time" && (
                <Badge variant="outline" className="text-xs">One-time</Badge>
              )}
            </div>
            {automation.description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{automation.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Switch
              checked={automation.isActive}
              onCheckedChange={v => onToggle(automation.id, v)}
              data-testid={`toggle-automation-${automation.id}`}
            />
            <Button
              size="icon" variant="ghost"
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending}
              title="Run now — send to all matching customers immediately"
              data-testid={`button-run-automation-${automation.id}`}
            >
              {runNow.isPending
                ? <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                : <Play className="w-4 h-4 text-amber-600" />
              }
            </Button>
            <Button
              size="icon" variant="ghost"
              onClick={() => setTestOpen(true)}
              title="Send test to single recipient"
              data-testid={`button-test-automation-${automation.id}`}
            >
              <FlaskConical className="w-4 h-4" />
            </Button>
            <Button
              size="icon" variant="ghost"
              onClick={() => onEdit(automation)}
              data-testid={`button-edit-automation-${automation.id}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon" variant="ghost"
              onClick={() => onDelete(automation)}
              data-testid={`button-delete-automation-${automation.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">Schedule</p>
            <p className="font-medium">{triggerSummary(automation)} <span className="text-muted-foreground font-normal">(BKK)</span></p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Audience</p>
            <p className="font-medium">{filterLabel(automation.customerFilter)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Next run</p>
            <p className="font-medium">
              {automation.nextRunAt
                ? formatDistanceToNow(new Date(automation.nextRunAt), { addSuffix: true })
                : automation.isActive ? "—" : "Paused"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Runs / Last</p>
            <p className="font-medium">
              {automation.runCount}
              {automation.lastRunAt && (
                <span className="text-muted-foreground font-normal">
                  {" "}· {formatDistanceToNow(new Date(automation.lastRunAt), { addSuffix: true })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Row 3: message preview */}
        <div className="rounded-md bg-muted/30 border border-border/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            {automation.subject && (
              <p className="text-xs font-medium text-muted-foreground truncate flex-1">
                Subject: {automation.subject}
              </p>
            )}
            {/<[a-z][\s\S]*>/i.test(automation.message) && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0 font-medium">
                HTML email
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {automation.message
              .replace(/<[^>]*>/g, " ")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/\s+/g, " ")
              .trim()}
          </p>
        </div>

        {/* Row 4: history toggle */}
        <Separator />
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowHistory(v => !v)}
          data-testid={`button-history-automation-${automation.id}`}
        >
          {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Run history
          {automation.runCount > 0 && (
            <span className="ml-1 text-muted-foreground">({automation.runCount} total)</span>
          )}
        </button>

        {showHistory && <RunHistoryPanel automationId={automation.id} />}
      </CardContent>

      {testOpen && (
        <TestSendDialog
          automation={automation}
          open={testOpen}
          onOpenChange={setTestOpen}
        />
      )}
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 overflow-hidden">
        <div className="bg-blue-900 p-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">{editing ? "Edit Automation" : "New Automation"}</h2>
          <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">
            {editing ? "Update the automation settings below." : "Configure a rule-based message that sends automatically."}
          </p>
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="automation-form"
            disabled={save.isPending}
            className="bg-blue-900 text-white font-black"
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

// ── Refined Quickstart Card ───────────────────────────────────────────────────

function QuickstartCard({ template, onSelect }: { template: typeof QUICKSTART_TEMPLATES[number]; onSelect: (defaults: Partial<FormValues>) => void }) {
  const Icon = template.icon;
  return (
    <button
      className="group text-left w-full rounded-2xl bg-white border border-slate-100 p-5 hover:border-blue-200 hover:shadow-xl transition-all duration-300"
      onClick={() => onSelect(template.defaults as unknown as Partial<FormValues>)}
      data-testid={`button-quickstart-${template.key}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-900 transition-colors">
          <Icon className="w-5 h-5 text-blue-900 group-hover:text-[#FCD34D] transition-colors" />
        </div>
        <div>
          <p className="font-black text-sm text-slate-800 uppercase tracking-tight">{template.label}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{template.description}</p>
        </div>
      </div>
    </button>
  );
}

// ── Main Automations Command Center ──────────────────────────────────────────

export default function AutomationsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Automation | null>(null);
  const [prefill, setPrefill]       = useState<Partial<FormValues> | null>(null);
  const [deleting, setDeleting]     = useState<Automation | null>(null);
  const [filters, setFilters]       = useState({ status: "all", channel: "all", search: "" });

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: ["/api/admin/automations"],
  });

  const activeCount = automations.filter(a => a.isActive).length;
  const pausedCount = automations.length - activeCount;

  const filtered = useMemo(() => {
    return automations.filter(a => {
      if (filters.status === "active" && !a.isActive) return false;
      if (filters.status === "paused" && a.isActive)  return false;
      if (filters.channel !== "all" && a.channel !== filters.channel) return false;
      if (filters.search && !a.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [automations, filters]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/automations/${id}/toggle`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] }),
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] });
      toast({ title: "Automation deleted" });
      setDeleting(null);
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border-t-8 border-blue-900 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-900 flex items-center justify-center shadow-2xl">
            <Zap className="w-7 h-7 text-[#FCD34D]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Automation Engine</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Rule-Based Engagement Systems</p>
          </div>
        </div>
        <Button
          onClick={() => { setEditing(null); setPrefill(null); setDialogOpen(true); }}
          className="h-14 bg-blue-900 text-white font-black rounded-2xl px-8 shadow-lg"
          data-testid="button-create-automation"
        >
          <Plus className="w-5 h-5 mr-2" /> NEW AUTOMATION
        </Button>
      </div>

      {/* Quickstart Blueprints */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Recommended Blueprints</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUICKSTART_TEMPLATES.map(tmpl => (
            <QuickstartCard
              key={tmpl.key}
              template={tmpl}
              onSelect={(defaults) => { setPrefill(defaults); setEditing(null); setDialogOpen(true); }}
            />
          ))}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search engine rules..."
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 font-bold text-xs"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              data-testid="input-filter-search"
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(["all", "active", "paused"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilters({ ...filters, status: s })}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  filters.status === s ? "bg-blue-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                }`}
                data-testid={`filter-status-${s}`}
              >
                {s === "all" ? `All (${automations.length})` : s === "active" ? `Active (${activeCount})` : `Paused (${pausedCount})`}
              </button>
            ))}
          </div>
        </div>

        <Select value={filters.channel} onValueChange={v => setFilters({ ...filters, channel: v })}>
          <SelectTrigger className="w-36 h-10 rounded-xl font-black text-[10px] uppercase border-slate-200 bg-slate-50" data-testid="filter-channel">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {CHANNEL_OPTIONS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Automation Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center font-black text-slate-300 uppercase tracking-widest animate-pulse">
            Synchronizing Engine Rules...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-20 text-center bg-slate-50 rounded-3xl border-4 border-dashed border-slate-200">
            <Activity className="w-16 h-16 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest">
              {automations.length === 0 ? "No automations yet — use a blueprint above to get started" : "No matching automations found"}
            </p>
          </div>
        ) : (
          filtered.map(a => (
            <AutomationCard
              key={a.id}
              automation={a}
              onEdit={(a) => { setEditing(a); setPrefill(null); setDialogOpen(true); }}
              onDelete={setDeleting}
              onToggle={(id, v) => toggleMutation.mutate({ id, isActive: v })}
            />
          ))
        )}
      </div>

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <AutomationDialog
          open={dialogOpen}
          onOpenChange={v => { setDialogOpen(v); if (!v) { setEditing(null); setPrefill(null); } }}
          editing={editing}
          prefill={prefill}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleting?.name}"</strong> will be permanently deleted along with all run history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-automation"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
