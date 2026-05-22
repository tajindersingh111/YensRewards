import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO, addWeeks, subWeeks, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, Plus, Calendar, MapPin, Clock,
  Trash2, Pencil, CalendarDays, List, LayoutGrid, Star, Megaphone,
  Users, Coffee, PartyPopper, StickyNote, AlertCircle, X
} from "lucide-react";
import type { ShopEvent } from "@shared/schema";

// ─── Event Types ──────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "event",     label: "Event",         color: "bg-blue-500",   light: "bg-blue-50 text-blue-700 border-blue-200",   icon: PartyPopper },
  { value: "expo",      label: "Expo",          color: "bg-purple-500", light: "bg-purple-50 text-purple-700 border-purple-200", icon: Star },
  { value: "promotion", label: "Promotion",     color: "bg-orange-500", light: "bg-orange-50 text-orange-700 border-orange-200", icon: Megaphone },
  { value: "holiday",   label: "Holiday",       color: "bg-green-500",  light: "bg-green-50 text-green-700 border-green-200",  icon: Calendar },
  { value: "meeting",   label: "Staff Meeting", color: "bg-slate-500",  light: "bg-slate-50 text-slate-700 border-slate-200",  icon: Users },
  { value: "catering",  label: "Catering",      color: "bg-teal-500",   light: "bg-teal-50 text-teal-700 border-teal-200",   icon: Coffee },
  { value: "other",     label: "Other",         color: "bg-rose-400",   light: "bg-rose-50 text-rose-700 border-rose-200",   icon: StickyNote },
] as const;

type EventTypeValue = typeof EVENT_TYPES[number]["value"];

function getEventType(type: string) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

// ─── Form Schema ─────────────────────────────────────────────────────────────

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.string().default("event"),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Event Dialog ─────────────────────────────────────────────────────────────

function EventDialog({
  open,
  onClose,
  event,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  event?: ShopEvent | null;
  defaultDate?: Date;
}) {
  const { toast } = useToast();
  const isEdit = !!event;

  const toLocalDateStr = (d: Date | string | null | undefined) => {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    return format(date, "yyyy-MM-dd");
  };

  const toLocalTimeStr = (d: Date | string | null | undefined) => {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    return format(date, "HH:mm");
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      type: event?.type ?? "event",
      startDate: event?.startDate ? toLocalDateStr(event.startDate) : (defaultDate ? toLocalDateStr(defaultDate) : toLocalDateStr(new Date())),
      startTime: event?.startDate && !event?.allDay ? toLocalTimeStr(event.startDate) : "09:00",
      endDate: event?.endDate ? toLocalDateStr(event.endDate) : "",
      endTime: event?.endDate && !event?.allDay ? toLocalTimeStr(event.endDate) : "17:00",
      allDay: event?.allDay ?? false,
      location: event?.location ?? "",
      notes: event?.notes ?? "",
    },
  });

  const allDay = form.watch("allDay");

  const buildDate = (dateStr: string, timeStr: string, isAllDay: boolean) => {
    if (!dateStr) return null;
    if (isAllDay) return new Date(dateStr + "T00:00:00");
    return new Date(`${dateStr}T${timeStr || "00:00"}:00`);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/shop-events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-events"] });
      toast({ title: "Event created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/admin/shop-events/${event?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-events"] });
      toast({ title: "Event updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/shop-events/${event?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-events"] });
      toast({ title: "Event deleted" });
      onClose();
    },
    onError: () => toast({ title: "Failed to delete event", variant: "destructive" }),
  });

  const onSubmit = (values: FormValues) => {
    const startDate = buildDate(values.startDate, values.startTime ?? "09:00", values.allDay);
    const endDate = values.endDate ? buildDate(values.endDate, values.endTime ?? "17:00", values.allDay) : null;
    const payload = {
      title: values.title,
      description: values.description || null,
      type: values.type,
      startDate,
      endDate,
      allDay: values.allDay,
      location: values.location || null,
      notes: values.notes || null,
    };
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 border-none shadow-2xl rounded-[2rem] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-blue-900 px-8 py-6 rounded-t-[2rem] flex items-center gap-4 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-12 -mt-12" />
          <div className="bg-yellow-400 rounded-2xl p-4 shadow-lg shrink-0 transform -rotate-3 relative z-10">
            <Calendar className="w-5 h-5 text-blue-900" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none" data-testid="dialog-event-title">
              {isEdit ? "Edit Event" : "Add Event"}
            </h2>
            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">
              {isEdit ? "Update event details" : "Schedule a new shop event"}
            </p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 p-8 overflow-y-auto flex-1">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input data-testid="input-event-title" placeholder="Event title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="allDay" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>All Day</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 h-9">
                        <Switch data-testid="switch-all-day" checked={field.value} onCheckedChange={field.onChange} />
                        <span className="text-sm text-muted-foreground">{field.value ? "Yes" : "No"}</span>
                      </div>
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input data-testid="input-start-date" type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {!allDay && (
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl><Input data-testid="input-start-time" type="time" {...field} /></FormControl>
                    </FormItem>
                  )} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input data-testid="input-end-date" type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
                {!allDay && (
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl><Input data-testid="input-end-time" type="time" {...field} /></FormControl>
                    </FormItem>
                  )} />
                )}
              </div>

              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input data-testid="input-event-location" placeholder="e.g. Yen's Head Office, Central World" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Textarea data-testid="input-event-description" placeholder="Brief description..." className="resize-none" rows={2} {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Planning Notes <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Textarea data-testid="input-event-notes" placeholder="Internal notes, preparation checklist..." className="resize-none" rows={2} {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <DialogFooter className="gap-2 flex-wrap shrink-0 p-6 bg-slate-50 border-t rounded-b-[2rem] flex items-center justify-end">
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-event"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose} className="font-black uppercase text-[10px] tracking-widest rounded-xl border-blue-900/10 text-blue-900" data-testid="button-cancel-event">Cancel</Button>
                <Button type="submit" disabled={isPending} className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl" data-testid="button-save-event">
                  {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Event"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Pill ──────────────────────────────────────────────────────────────

function EventPill({ event, onClick }: { event: ShopEvent; onClick: () => void }) {
  const et = getEventType(event.type);
  const Icon = et.icon;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      data-testid={`event-pill-${event.id}`}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${et.light} hover-elevate`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{event.title}</span>
    </button>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date;
  events: ShopEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: ShopEvent) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cur = calStart;
  while (cur <= calEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const eventsOnDay = (day: Date) =>
    events.filter(e => {
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : start;
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      return start <= dayEnd && end >= dayStart;
    });

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 divide-x divide-y">
        {days.map(day => {
          const inMonth = isSameMonth(day, currentDate);
          if (!inMonth) {
            return (
              <div
                key={day.toISOString()}
                className="min-h-[90px] p-1 bg-muted/5 cursor-default"
                data-testid={`calendar-day-padding-${format(day, "yyyy-MM-dd")}`}
              />
            );
          }

          const dayEvents = eventsOnDay(day);
          const isCurrentDay = isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              className="min-h-[90px] p-1 cursor-pointer transition-colors hover:bg-muted/40"
            >
              <div className={`w-7 h-7 flex items-center justify-center text-sm font-medium mb-1 rounded-full ${isCurrentDay ? "bg-blue-900 text-white" : "text-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventPill key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date;
  events: ShopEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: ShopEvent) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsOnDay = (day: Date) =>
    events.filter(e => {
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : start;
      return start <= endOfDay(day) && end >= startOfDay(day);
    });

  return (
    <div className="grid grid-cols-7 gap-2 flex-1">
      {days.map(day => {
        const dayEvents = eventsOnDay(day);
        const isCurrentDay = isToday(day);
        return (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            data-testid={`week-day-${format(day, "yyyy-MM-dd")}`}
            className="flex flex-col cursor-pointer"
          >
            <div className={`text-center py-2 rounded-t-md border-b mb-2 ${isCurrentDay ? "bg-blue-900 text-white" : "bg-muted/40"}`}>
              <div className={`text-xs ${isCurrentDay ? "text-blue-200" : "text-muted-foreground"}`}>{format(day, "EEE")}</div>
              <div className={`text-lg font-semibold ${isCurrentDay ? "text-white" : ""}`}>{format(day, "d")}</div>
            </div>
            <div className="space-y-1 flex-1">
              {dayEvents.map(ev => (
                <EventPill key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
              ))}
              {dayEvents.length === 0 && (
                <div className="text-xs text-muted-foreground text-center mt-3 opacity-40">—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Upcoming Sidebar ─────────────────────────────────────────────────────────

function UpcomingSidebar({
  events,
  onEventClick,
  onAdd,
}: {
  events: ShopEvent[];
  onEventClick: (event: ShopEvent) => void;
  onAdd: () => void;
}) {
  const now = new Date();
  const upcoming = events
    .filter(e => new Date(e.startDate) >= startOfDay(now))
    .slice(0, 12);

  const grouped: Record<string, ShopEvent[]> = {};
  for (const ev of upcoming) {
    const key = format(new Date(ev.startDate), "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }

  return (
    <div className="flex flex-col gap-4 w-64 shrink-0">
      <Button onClick={onAdd} data-testid="button-add-event" className="w-full bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl">
        <Plus className="h-4 w-4 mr-1.5" />Add Event
      </Button>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-black text-blue-900 uppercase tracking-tight flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-yellow-500" />Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-xs text-muted-foreground">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([dateKey, evs]) => (
                <div key={dateKey}>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {isToday(parseISO(dateKey)) ? "Today" : format(parseISO(dateKey), "EEE d MMM")}
                  </div>
                  <div className="space-y-1">
                    {evs.map(ev => {
                      const et = getEventType(ev.type);
                      const Icon = et.icon;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => onEventClick(ev)}
                          data-testid={`upcoming-event-${ev.id}`}
                          className={`w-full text-left text-xs p-2 rounded border ${et.light} hover-elevate`}
                        >
                          <div className="flex items-center gap-1 font-medium mb-0.5">
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{ev.title}</span>
                          </div>
                          {ev.location && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          )}
                          {!ev.allDay && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              {format(new Date(ev.startDate), "HH:mm")}
                              {ev.endDate && ` – ${format(new Date(ev.endDate), "HH:mm")}`}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-black text-blue-900 uppercase tracking-tight">Event Types</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-1.5">
            {EVENT_TYPES.map(et => {
              const Icon = et.icon;
              return (
                <div key={et.value} className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${et.color} text-white shrink-0`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="text-foreground">{et.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main ShopCalendar ────────────────────────────────────────────────────────

export default function ShopCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ShopEvent | null>(null);
  const [defaultDialogDate, setDefaultDialogDate] = useState<Date | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: allEvents = [], isLoading } = useQuery<ShopEvent[]>({
    queryKey: ["/api/admin/shop-events"],
  });

  const events = useMemo(() => {
    if (filterType === "all") return allEvents;
    return allEvents.filter(e => e.type === filterType);
  }, [allEvents, filterType]);

  const handlePrev = () => {
    if (view === "month") setCurrentDate(d => subMonths(d, 1));
    else setCurrentDate(d => subWeeks(d, 1));
  };

  const handleNext = () => {
    if (view === "month") setCurrentDate(d => addMonths(d, 1));
    else setCurrentDate(d => addWeeks(d, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (date: Date) => {
    setSelectedEvent(null);
    setDefaultDialogDate(date);
    setDialogOpen(true);
  };

  const handleEventClick = (event: ShopEvent) => {
    setSelectedEvent(event);
    setDefaultDialogDate(undefined);
    setDialogOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setDefaultDialogDate(new Date());
    setDialogOpen(true);
  };

  const periodLabel = view === "month"
    ? format(currentDate, "MMMM yyyy")
    : (() => {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(ws, "d MMM")} – ${format(we, "d MMM yyyy")}`;
      })();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="bg-blue-900 rounded-[2rem] p-6 flex flex-wrap items-center justify-between gap-3 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-yellow-400 rounded-2xl p-4 shadow-lg shrink-0 transform -rotate-3">
            <CalendarDays className="h-5 w-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Shop Calendar</h2>
            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">Plan events, expos, promotions and more</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white" data-testid="select-filter-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {EVENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border border-white/20 overflow-hidden">
            <Button
              size="sm"
              onClick={() => setView("month")}
              data-testid="button-view-month"
              className={`rounded-none border-0 ${view === "month" ? "bg-yellow-400 text-blue-900 font-bold" : "bg-white/10 text-white"}`}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />Month
            </Button>
            <Button
              size="sm"
              onClick={() => setView("week")}
              data-testid="button-view-week"
              className={`rounded-none border-0 border-l border-white/20 ${view === "week" ? "bg-yellow-400 text-blue-900 font-bold" : "bg-white/10 text-white"}`}
            >
              <List className="h-4 w-4 mr-1.5" />Week
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar + Sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main Calendar */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Calendar Nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev} data-testid="button-prev-period">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} data-testid="button-next-period">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
                Today
              </Button>
            </div>
            <span className="font-black text-sm text-blue-900 uppercase tracking-tight" data-testid="text-period-label">{periodLabel}</span>
            <div className="w-32" />
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Loading events…
            </div>
          ) : view === "month" ? (
            <MonthView
              currentDate={currentDate}
              events={events}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          ) : (
            <div className="flex-1 p-4">
              <WeekView
                currentDate={currentDate}
                events={events}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
              />
            </div>
          )}
        </Card>

        {/* Sidebar */}
        <UpcomingSidebar
          events={events}
          onEventClick={handleEventClick}
          onAdd={handleAddEvent}
        />
      </div>

      <EventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedEvent(null); }}
        event={selectedEvent}
        defaultDate={defaultDialogDate}
      />
    </div>
  );
}
