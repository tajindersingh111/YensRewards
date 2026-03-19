import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeader } from "@/components/SectionHeader";
import {
  Zap, Plus, Pencil, Trash2, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock,
  Mail, MessageSquare, Smartphone, Hash, Calendar, RefreshCw, Users, RotateCcw, AlertCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface Automation {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  triggerType: string;
  triggerConfig: { time?: string; dayOfWeek?: string; dayOfMonth?: number; date?: string };
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

// ── Form schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["recurring_daily", "recurring_weekly", "recurring_monthly", "one_time"]),
  triggerTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time").default("09:00"),
  triggerDayOfWeek: z.string().optional(),
  triggerDayOfMonth: z.coerce.number().min(1).max(31).optional(),
  triggerDate: z.string().optional(),
  customerFilter: z.string().min(1, "Customer filter is required"),
  channel: z.enum(["app", "line", "sms", "email"]),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

type FormValues = z.infer<typeof formSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  recurring_daily: "Every Day",
  recurring_weekly: "Every Week",
  recurring_monthly: "Every Month",
  one_time: "One-Time",
};

const FILTER_LABELS: Record<string, string> = {
  all: "All Customers",
  tier_bronze: "Bronze Tier",
  tier_silver: "Silver Tier",
  tier_gold: "Gold Tier",
  tier_platinum: "Platinum Tier",
  birthday_today: "Birthday Today",
  inactive_30d: "Inactive 30+ Days",
  inactive_60d: "Inactive 60+ Days",
};

const CHANNEL_LABELS: Record<string, string> = {
  app: "App",
  line: "LINE",
  sms: "SMS",
  email: "Email",
};

const CHANNEL_COLORS: Record<string, string> = {
  app: "bg-purple-100 text-purple-700",
  line: "bg-green-100 text-green-700",
  sms: "bg-blue-100 text-blue-700",
  email: "bg-amber-100 text-amber-700",
};

const DAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

function triggerSummary(a: Automation): string {
  const { triggerType, triggerConfig } = a;
  const time = triggerConfig.time || "09:00";
  if (triggerType === "recurring_daily") return `Daily at ${time} (Bangkok)`;
  if (triggerType === "recurring_weekly") {
    const day = triggerConfig.dayOfWeek
      ? triggerConfig.dayOfWeek.charAt(0).toUpperCase() + triggerConfig.dayOfWeek.slice(1)
      : "Monday";
    return `Every ${day} at ${time} (Bangkok)`;
  }
  if (triggerType === "recurring_monthly") {
    return `Monthly on day ${triggerConfig.dayOfMonth ?? 1} at ${time} (Bangkok)`;
  }
  if (triggerType === "one_time" && triggerConfig.date) {
    return `Once on ${triggerConfig.date} at ${time} (Bangkok)`;
  }
  return TRIGGER_LABELS[triggerType] ?? triggerType;
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "email") return <Mail className="w-3 h-3" />;
  if (channel === "sms") return <Hash className="w-3 h-3" />;
  if (channel === "line") return <MessageSquare className="w-3 h-3" />;
  return <Smartphone className="w-3 h-3" />;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
}

// ── Automation card ──────────────────────────────────────────────────────────

function AutomationCard({
  automation,
  onEdit,
  onDelete,
  onToggle,
}: {
  automation: Automation;
  onEdit: (a: Automation) => void;
  onDelete: (a: Automation) => void;
  onToggle: (a: Automation, active: boolean) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);

  const { data: runs } = useQuery<AutomationRun[]>({
    queryKey: ["/api/admin/automations", automation.id, "runs"],
    queryFn: () => fetch(`/api/admin/automations/${automation.id}/runs`, { credentials: "include" }).then(r => r.json()),
    enabled: showHistory,
  });

  return (
    <Card data-testid={`card-automation-${automation.id}`} className={`transition-opacity ${automation.isActive ? "" : "opacity-60"}`}>
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{automation.name}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${CHANNEL_COLORS[automation.channel] ?? "bg-gray-100 text-gray-700"}`}>
                <ChannelIcon channel={automation.channel} />
                {CHANNEL_LABELS[automation.channel] ?? automation.channel}
              </span>
              {!automation.isActive && (
                <Badge variant="outline" className="text-xs">Paused</Badge>
              )}
            </div>
            {automation.description && (
              <p className="text-xs text-muted-foreground mt-1">{automation.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={automation.isActive}
              onCheckedChange={(v) => onToggle(automation, v)}
              data-testid={`toggle-automation-${automation.id}`}
            />
            <Button size="icon" variant="ghost" onClick={() => onEdit(automation)} data-testid={`button-edit-automation-${automation.id}`}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(automation)} data-testid={`button-delete-automation-${automation.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">Trigger</p>
            <p className="font-medium">{triggerSummary(automation)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Audience</p>
            <p className="font-medium">{FILTER_LABELS[automation.customerFilter] ?? automation.customerFilter}</p>
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
            <p className="text-muted-foreground mb-0.5">Runs</p>
            <p className="font-medium">{automation.runCount} total</p>
          </div>
        </div>

        {/* Message preview */}
        <div className="bg-muted/40 rounded-md p-3">
          {automation.subject && (
            <p className="text-xs font-medium mb-1 text-muted-foreground">Subject: {automation.subject}</p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2">{automation.message}</p>
        </div>

        {/* Run history toggle */}
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowHistory(v => !v)}
          data-testid={`button-history-automation-${automation.id}`}
        >
          {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Run history
        </button>

        {showHistory && (
          <div className="space-y-2">
            {!runs ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs yet</p>
            ) : (
              runs.map(run => (
                <div key={run.id} className="flex items-center gap-3 py-1.5 border-t text-xs">
                  <StatusIcon status={run.status} />
                  <span className="text-muted-foreground min-w-[120px]">
                    {format(new Date(run.triggeredAt), "dd MMM yyyy HH:mm")}
                  </span>
                  <span className="text-green-600 font-medium">{run.sentCount} sent</span>
                  {run.failedCount > 0 && (
                    <span className="text-red-500 font-medium">{run.failedCount} failed</span>
                  )}
                  {run.errorMessage && (
                    <span className="text-red-500 truncate max-w-[200px]" title={run.errorMessage}>
                      {run.errorMessage}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Create / Edit dialog ─────────────────────────────────────────────────────

function AutomationDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Automation | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editing
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
          subject: editing.subject ?? "",
          message: editing.message,
        }
      : {
          name: "",
          description: "",
          triggerType: "recurring_daily",
          triggerTime: "09:00",
          triggerDayOfWeek: "monday",
          triggerDayOfMonth: 1,
          triggerDate: "",
          customerFilter: "all",
          channel: "line",
          subject: "",
          message: "",
        },
  });

  const triggerType = form.watch("triggerType");
  const channel = form.watch("channel");

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const triggerConfig: Record<string, any> = { time: values.triggerTime };
      if (values.triggerType === "recurring_weekly") triggerConfig.dayOfWeek = values.triggerDayOfWeek;
      if (values.triggerType === "recurring_monthly") triggerConfig.dayOfMonth = values.triggerDayOfMonth;
      if (values.triggerType === "one_time") triggerConfig.date = values.triggerDate;

      const payload = {
        name: values.name,
        description: values.description || null,
        triggerType: values.triggerType,
        triggerConfig,
        customerFilter: values.customerFilter,
        channel: values.channel,
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
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Automation" : "New Automation"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => save.mutate(v))} className="space-y-5">
            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="e.g. Birthday Greeting" {...field} data-testid="input-automation-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl><Input placeholder="Short note about this automation" {...field} /></FormControl>
              </FormItem>
            )} />

            {/* Trigger type */}
            <FormField control={form.control} name="triggerType" render={({ field }) => (
              <FormItem>
                <FormLabel>Trigger</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trigger-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="recurring_daily">Every Day</SelectItem>
                    <SelectItem value="recurring_weekly">Every Week</SelectItem>
                    <SelectItem value="recurring_monthly">Every Month</SelectItem>
                    <SelectItem value="one_time">One-Time (specific date)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Trigger-specific config */}
            <div className="grid grid-cols-2 gap-3">
              {triggerType === "recurring_weekly" && (
                <FormField control={form.control} name="triggerDayOfWeek" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of week</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {DAY_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
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
                    <FormControl><Input type="number" min={1} max={31} {...field} /></FormControl>
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
                  <FormLabel>Time (Bangkok)</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormDescription className="text-xs">Asia/Bangkok (UTC+7)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Customer filter */}
            <FormField control={form.control} name="customerFilter" render={({ field }) => (
              <FormItem>
                <FormLabel>Audience</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-customer-filter">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="tier_bronze">Bronze Tier</SelectItem>
                    <SelectItem value="tier_silver">Silver Tier</SelectItem>
                    <SelectItem value="tier_gold">Gold Tier</SelectItem>
                    <SelectItem value="tier_platinum">Platinum Tier</SelectItem>
                    <SelectItem value="birthday_today">Birthday Today</SelectItem>
                    <SelectItem value="inactive_30d">Inactive 30+ Days</SelectItem>
                    <SelectItem value="inactive_60d">Inactive 60+ Days</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Channel */}
            <FormField control={form.control} name="channel" render={({ field }) => (
              <FormItem>
                <FormLabel>Channel</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-channel">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="app">App Notification</SelectItem>
                    <SelectItem value="line">LINE</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Subject (email only) */}
            {channel === "email" && (
              <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Subject</FormLabel>
                  <FormControl><Input placeholder="Subject line" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Message */}
            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Type your message here. Use {{name}}, {{points}}, {{tier}} as placeholders."
                    rows={4}
                    {...field}
                    data-testid="textarea-automation-message"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Available placeholders: {"{{name}}"}, {"{{points}}"}, {"{{tier}}"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending} data-testid="button-save-automation">
                {save.isPending ? "Saving..." : editing ? "Save Changes" : "Create Automation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AutomationsManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [deletingAutomation, setDeletingAutomation] = useState<Automation | null>(null);

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: ["/api/admin/automations"],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/automations/${id}/toggle`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] }),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/automations"] });
      toast({ title: "Automation deleted" });
      setDeletingAutomation(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditingAutomation(null);
    setDialogOpen(true);
  }

  function openEdit(a: Automation) {
    setEditingAutomation(a);
    setDialogOpen(true);
  }

  const active = automations.filter(a => a.isActive);
  const paused = automations.filter(a => !a.isActive);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<Zap className="w-5 h-5" />}
        title="Automations"
        subtitle="Rules-based messages sent automatically on schedule or by event"
        action={
          <Button onClick={openCreate} data-testid="button-create-automation">
            <Plus className="w-4 h-4 mr-2" />
            New Automation
          </Button>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{automations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Paused</p>
            <p className="text-2xl font-bold text-muted-foreground">{paused.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="h-24 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="font-medium">No automations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first automation to start sending messages automatically.
              </p>
            </div>
            <Button onClick={openCreate} data-testid="button-create-automation-empty">
              <Plus className="w-4 h-4 mr-2" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map(automation => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onEdit={openEdit}
              onDelete={setDeletingAutomation}
              onToggle={(a, v) => toggleMutation.mutate({ id: a.id, isActive: v })}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      {dialogOpen && (
        <AutomationDialog
          open={dialogOpen}
          onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingAutomation(null); }}
          editing={editingAutomation}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingAutomation} onOpenChange={v => !v && setDeletingAutomation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingAutomation?.name}" will be permanently deleted along with all its run history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAutomation && deleteMutation.mutate(deletingAutomation.id)}
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
