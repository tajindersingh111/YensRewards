import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, parseISO, differenceInMinutes, addDays, subDays } from "date-fns";
import { Calendar, Clock, Users, TrendingUp, Download, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Timer, Star, ShoppingCart, UserPlus, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  location: string | null;
  isActive: boolean;
}

interface Site {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  userId: string;
  siteId: string;
  date: string;
  clockInTime: string;
  clockOutTime: string | null;
  notes: string | null;
}

interface WorkSchedule {
  id: string;
  userId: string;
  siteId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  notes: string | null;
}

interface BaristaPerformance {
  id: string;
  userId: string;
  weekStart: string;
  transactionCount: number;
  specialOffersSold: number;
  newCustomerSignups: number;
  totalPoints: number;
  weeklyRank: number | null;
  user: User;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function userName(user: User) {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email || "Unknown";
}

function userInitials(user: User) {
  return [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

function minutesToHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function scheduleMinutes(schedule: WorkSchedule) {
  const [sh, sm] = schedule.startTime.split(":").map(Number);
  const [eh, em] = schedule.endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function entryMinutes(entry: TimeEntry) {
  if (!entry.clockOutTime) return null;
  return differenceInMinutes(new Date(entry.clockOutTime), new Date(entry.clockInTime));
}

function getMondayOfWeek(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ users, schedules, timeEntries, sites }: {
  users: User[];
  schedules: WorkSchedule[];
  timeEntries: TimeEntry[];
  sites: Site[];
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = addDays(getMondayOfWeek(new Date()), weekOffset * 7);
  const sunday = addDays(monday, 6);
  const weekLabel = `${format(monday, "d MMM")} – ${format(sunday, "d MMM yyyy")}`;

  const siteName = (id: string) => sites.find(s => s.id === id)?.name ?? id;

  const baristas = users.filter(u => u.role === "barista" || u.role === "manager");

  const weekSchedules = schedules.filter(s => s.scheduledDate >= format(monday, "yyyy-MM-dd") && s.scheduledDate <= format(sunday, "yyyy-MM-dd"));
  const weekEntries = timeEntries.filter(e => e.date >= format(monday, "yyyy-MM-dd") && e.date <= format(sunday, "yyyy-MM-dd"));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setWeekOffset(o => o - 1)} data-testid="button-week-prev">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center" data-testid="text-week-label">{weekLabel}</span>
        <Button size="icon" variant="outline" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0} data-testid="button-week-next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} data-testid="button-week-today">This week</Button>
        )}
      </div>

      <div className="grid gap-3">
        {baristas.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No barista accounts found</CardContent></Card>
        )}
        {baristas.map(u => {
          const mySchedules = weekSchedules.filter(s => s.userId === u.id);
          const myEntries = weekEntries.filter(e => e.userId === u.id);
          const scheduledMins = mySchedules.reduce((sum, s) => sum + scheduleMinutes(s), 0);
          const workedMins = myEntries.reduce((sum, e) => sum + (entryMinutes(e) ?? 0), 0);
          const openEntry = myEntries.find(e => !e.clockOutTime);
          const shifts = myEntries.filter(e => e.clockOutTime).length;
          const attendancePct = scheduledMins > 0 ? Math.min(100, Math.round((workedMins / scheduledMins) * 100)) : null;

          return (
            <Card key={u.id} data-testid={`card-barista-${u.id}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{userInitials(u)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium" data-testid={`text-barista-name-${u.id}`}>{userName(u)}</div>
                      <div className="text-xs text-muted-foreground capitalize">{u.role}{u.location ? ` · ${u.location}` : ""}</div>
                    </div>
                    {openEntry && (
                      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 gap-1 no-default-active-elevate" data-testid={`badge-clocked-in-${u.id}`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Clocked In
                      </Badge>
                    )}
                    {!u.isActive && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold" data-testid={`text-scheduled-${u.id}`}>{scheduledMins > 0 ? minutesToHours(scheduledMins) : "—"}</div>
                      <div className="text-xs text-muted-foreground">Scheduled</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold" data-testid={`text-worked-${u.id}`}>{workedMins > 0 ? minutesToHours(workedMins) : "—"}</div>
                      <div className="text-xs text-muted-foreground">Worked</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold" data-testid={`text-shifts-${u.id}`}>{shifts}</div>
                      <div className="text-xs text-muted-foreground">Shifts</div>
                    </div>
                    {attendancePct !== null && (
                      <div className="text-center">
                        <div className={`font-semibold ${attendancePct >= 90 ? "text-green-600 dark:text-green-400" : attendancePct >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}
                          data-testid={`text-attendance-${u.id}`}>{attendancePct}%</div>
                        <div className="text-xs text-muted-foreground">Attendance</div>
                      </div>
                    )}
                  </div>
                </div>

                {mySchedules.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mySchedules.map(s => (
                      <div key={s.id} className="text-xs bg-muted rounded-md px-2 py-1">
                        <span className="font-medium">{format(parseISO(s.scheduledDate), "EEE d")}</span>
                        <span className="text-muted-foreground ml-1">{s.startTime}–{s.endTime} · {siteName(s.siteId)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Attendance Tab ──────────────────────────────────────────────────────────

function AttendanceTab({ users, timeEntries, sites, isLoading }: {
  users: User[];
  timeEntries: TimeEntry[];
  sites: Site[];
  isLoading: boolean;
}) {
  const [filterUser, setFilterUser] = useState("all");
  const siteName = (id: string) => sites.find(s => s.id === id)?.name ?? "—";
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const filtered = filterUser === "all" ? timeEntries : timeEntries.filter(e => e.userId === filterUser);

  function entryStatus(entry: TimeEntry) {
    if (!entry.clockOutTime) return { label: "Clocked In", color: "bg-green-500/10 text-green-700 dark:text-green-400" };
    return { label: "Completed", color: "bg-muted text-muted-foreground" };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-48" data-testid="select-filter-barista">
            <SelectValue placeholder="All baristas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All baristas</SelectItem>
            {users.filter(u => u.role !== "admin").map(u => (
              <SelectItem key={u.id} value={u.id}>{userName(u)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} records</span>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-0 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
          <div>Date</div>
          <div>Barista</div>
          <div>Site</div>
          <div>Clock In</div>
          <div>Clock Out</div>
          <div>Duration</div>
        </div>

        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 border-b last:border-0">
            {Array.from({ length: 6 }).map((_, j) => <Skeleton key={j} className="h-4 w-24" />)}
          </div>
        ))}

        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">No attendance records found</div>
        )}

        {!isLoading && filtered.map(entry => {
          const user = userMap[entry.userId];
          const mins = entryMinutes(entry);
          const status = entryStatus(entry);
          return (
            <div key={entry.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 border-b last:border-0 text-sm hover-elevate" data-testid={`row-attendance-${entry.id}`}>
              <div className="font-medium">{format(parseISO(entry.date), "EEE d MMM")}</div>
              <div>{user ? userName(user) : entry.userId}</div>
              <div className="text-muted-foreground">{siteName(entry.siteId)}</div>
              <div>{format(new Date(entry.clockInTime), "HH:mm")}</div>
              <div>{entry.clockOutTime ? format(new Date(entry.clockOutTime), "HH:mm") : <Badge className={`text-xs border-0 ${status.color}`}>{status.label}</Badge>}</div>
              <div>{mins !== null ? minutesToHours(mins) : <span className="text-muted-foreground">—</span>}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Hours Summary Tab ────────────────────────────────────────────────────────

function HoursSummaryTab({ users, schedules, timeEntries, sites }: {
  users: User[];
  schedules: WorkSchedule[];
  timeEntries: TimeEntry[];
  sites: Site[];
}) {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(getMondayOfWeek(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));

  const baristas = users.filter(u => u.role !== "admin" && u.isActive);

  const rangeSchedules = schedules.filter(s => s.scheduledDate >= startDate && s.scheduledDate <= endDate);
  const rangeEntries = timeEntries.filter(e => e.date >= startDate && e.date <= endDate);

  const summary = baristas.map(u => {
    const mySchedules = rangeSchedules.filter(s => s.userId === u.id);
    const myEntries = rangeEntries.filter(e => e.userId === u.id);
    const scheduledMins = mySchedules.reduce((sum, s) => sum + scheduleMinutes(s), 0);
    const workedMins = myEntries.reduce((sum, e) => sum + (entryMinutes(e) ?? 0), 0);
    const shifts = mySchedules.length;
    const completedShifts = myEntries.filter(e => e.clockOutTime).length;
    const diff = workedMins - scheduledMins;
    return { user: u, scheduledMins, workedMins, diff, shifts, completedShifts };
  });

  function handleExport() {
    const headers = ["Barista", "Role", "Scheduled Hours", "Actual Hours", "Difference", "Scheduled Shifts", "Completed Shifts"];
    const rows = summary.map(s => [
      userName(s.user),
      s.user.role,
      (s.scheduledMins / 60).toFixed(2),
      (s.workedMins / 60).toFixed(2),
      (s.diff / 60).toFixed(2),
      String(s.shifts),
      String(s.completedShifts),
    ]);
    exportCSV([headers, ...rows], `hours-summary-${startDate}-to-${endDate}.csv`);
  }

  const totalScheduled = summary.reduce((s, r) => s + r.scheduledMins, 0);
  const totalWorked = summary.reduce((s, r) => s + r.workedMins, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border rounded-md px-3 h-9 text-sm bg-background" data-testid="input-start-date" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border rounded-md px-3 h-9 text-sm bg-background" data-testid="input-end-date" />
        </div>
        <Button variant="outline" size="default" onClick={handleExport} data-testid="button-export-hours">
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{minutesToHours(totalScheduled)}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Scheduled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{minutesToHours(totalWorked)}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Worked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${totalWorked - totalScheduled >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {totalWorked - totalScheduled >= 0 ? "+" : ""}{minutesToHours(Math.abs(totalWorked - totalScheduled))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Variance</div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-0 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
          <div>Barista</div>
          <div>Scheduled</div>
          <div>Worked</div>
          <div>Variance</div>
          <div>Shifts</div>
          <div>Completed</div>
        </div>
        {summary.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">No baristas found</div>
        )}
        {summary.map(({ user, scheduledMins, workedMins, diff, shifts, completedShifts }) => (
          <div key={user.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 border-b last:border-0 text-sm hover-elevate" data-testid={`row-hours-${user.id}`}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{userInitials(user)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{userName(user)}</span>
            </div>
            <div>{scheduledMins > 0 ? minutesToHours(scheduledMins) : "—"}</div>
            <div>{workedMins > 0 ? minutesToHours(workedMins) : "—"}</div>
            <div className={diff > 0 ? "text-green-600 dark:text-green-400" : diff < 0 ? "text-red-600 dark:text-red-400" : ""}>
              {scheduledMins === 0 && workedMins === 0 ? "—" : `${diff >= 0 ? "+" : ""}${minutesToHours(Math.abs(diff))}`}
            </div>
            <div>{shifts}</div>
            <div className="flex items-center gap-1">
              {completedShifts}
              {completedShifts < shifts && shifts > 0 && (
                <span className="text-xs text-muted-foreground">/ {shifts}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────

function PerformanceTab({ users }: { users: User[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = addDays(getMondayOfWeek(new Date()), weekOffset * 7);
  const weekStart = format(monday, "yyyy-MM-dd");
  const weekLabel = `Week of ${format(monday, "d MMM yyyy")}`;

  const { data: performance = [], isLoading } = useQuery<BaristaPerformance[]>({
    queryKey: ["/api/admin/barista-performance/summary", weekStart],
    queryFn: async () => {
      const res = await fetch(`/api/admin/barista-performance/summary?weekStart=${weekStart}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const baristas = users.filter(u => u.role !== "admin");
  const performanceMap = Object.fromEntries(performance.map(p => [p.userId, p]));

  const rows = baristas.map(u => ({
    user: u,
    perf: performanceMap[u.id] ?? null,
  })).sort((a, b) => {
    const ra = a.perf?.weeklyRank ?? 9999;
    const rb = b.perf?.weeklyRank ?? 9999;
    return ra - rb;
  });

  const totalTransactions = performance.reduce((s, p) => s + p.transactionCount, 0);
  const totalSignups = performance.reduce((s, p) => s + p.newCustomerSignups, 0);
  const totalSpecials = performance.reduce((s, p) => s + p.specialOffersSold, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setWeekOffset(o => o - 1)} data-testid="button-perf-week-prev">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[220px] text-center" data-testid="text-perf-week-label">{weekLabel}</span>
        <Button size="icon" variant="outline" onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0} data-testid="button-perf-week-next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>This week</Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-muted-foreground" /><div className="text-xl font-bold">{totalTransactions}</div></div>
          <div className="text-xs text-muted-foreground mt-1">Total Transactions</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-muted-foreground" /><div className="text-xl font-bold">{totalSignups}</div></div>
          <div className="text-xs text-muted-foreground mt-1">New Signups</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground" /><div className="text-xl font-bold">{totalSpecials}</div></div>
          <div className="text-xs text-muted-foreground mt-1">Specials Sold</div>
        </CardContent></Card>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
          <div>Barista</div>
          <div>Rank</div>
          <div>Transactions</div>
          <div>New Customers</div>
          <div>Specials</div>
          <div>Points</div>
        </div>

        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 border-b last:border-0">
            {Array.from({ length: 6 }).map((_, j) => <Skeleton key={j} className="h-4 w-16" />)}
          </div>
        ))}

        {!isLoading && rows.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">No performance data for this week</div>
        )}

        {!isLoading && rows.map(({ user, perf }, idx) => (
          <div key={user.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 border-b last:border-0 text-sm hover-elevate" data-testid={`row-perf-${user.id}`}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{userInitials(user)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{userName(user)}</span>
            </div>
            <div>
              {perf?.weeklyRank ? (
                <Badge variant={perf.weeklyRank === 1 ? "default" : "secondary"} className="text-xs">
                  #{perf.weeklyRank}
                </Badge>
              ) : <span className="text-muted-foreground">—</span>}
            </div>
            <div className="font-medium">{perf ? perf.transactionCount : <span className="text-muted-foreground">—</span>}</div>
            <div>{perf ? perf.newCustomerSignups : <span className="text-muted-foreground">—</span>}</div>
            <div>{perf ? perf.specialOffersSold : <span className="text-muted-foreground">—</span>}</div>
            <div>{perf ? <span className="font-medium">{perf.totalPoints}</span> : <span className="text-muted-foreground">—</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BaristaManager() {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const sunday = addDays(monday, 6);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/admin/sites"],
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<WorkSchedule[]>({
    queryKey: ["/api/admin/work-schedules"],
  });

  // Fetch last 90 days of time entries by default
  const startDate = format(subDays(today, 90), "yyyy-MM-dd");
  const { data: timeEntries = [], isLoading: entriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/admin/time-entries", startDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/time-entries?startDate=${startDate}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const baristas = users.filter(u => u.role !== "admin");
  const currentlyIn = timeEntries.filter(e => !e.clockOutTime && e.date === format(today, "yyyy-MM-dd"));

  const isLoading = usersLoading || schedulesLoading || entriesLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Barista Management</h2>
          <p className="text-sm text-muted-foreground">Schedules, hours, attendance and performance</p>
        </div>
        <div className="flex items-center gap-2">
          {currentlyIn.length > 0 && (
            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-0 gap-1 no-default-active-elevate" data-testid="badge-currently-clocked-in">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {currentlyIn.length} clocked in now
            </Badge>
          )}
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span data-testid="text-barista-count"><span className="font-medium text-foreground">{baristas.length}</span> staff</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-2" data-testid="tabs-barista-manager">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Users className="h-4 w-4 mr-1.5" />Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">
            <Clock className="h-4 w-4 mr-1.5" />Attendance
          </TabsTrigger>
          <TabsTrigger value="hours" data-testid="tab-hours">
            <Timer className="h-4 w-4 mr-1.5" />Hours Summary
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <TrendingUp className="h-4 w-4 mr-1.5" />Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <OverviewTab users={users} schedules={schedules} timeEntries={timeEntries} sites={sites} />
          )}
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab users={users} timeEntries={timeEntries} sites={sites} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="hours">
          <HoursSummaryTab users={users} schedules={schedules} timeEntries={timeEntries} sites={sites} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab users={users} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
