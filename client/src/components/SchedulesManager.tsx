/* LEF'S PREMIER YENS STAFF LOGISTICS COMMANDER */
/* Changes: Tactical Shift Tags, Protocol Toggles, and Executive Branding */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Calendar, User, MapPin, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WorkSchedule, User as UserType, Site } from "@shared/schema";

export function SchedulesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);

  const [scheduleMode, setScheduleModeState] = useState<'single' | 'weekly'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('scheduleMode');
      return (saved === 'weekly' ? 'weekly' : 'single');
    }
    return 'single';
  });

  const setScheduleMode = (mode: 'single' | 'weekly') => {
    setScheduleModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scheduleMode', mode);
    }
  };

  const [formData, setFormData] = useState({
    userId: "", siteId: "", scheduledDate: "", startTime: "", endTime: "", notes: "",
  });

  const [weeklyFormData, setWeeklyFormData] = useState({
    userId: "", siteId: "", weekStartDate: "", daysOfWeek: [] as string[],
    repeatWeeks: 1, startTime: "", endTime: "", notes: "",
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<WorkSchedule[]>({
    queryKey: ['/api/admin/work-schedules'],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['/api/admin/sites'],
  });

  const baristas = users.filter(u => u.role === 'barista');

  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/admin/work-schedules', data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/work-schedules'] });
      toast({ title: response.mode === 'weekly' ? t('admin.schedules.weeklyCreated', { count: response.schedulesCreated }) : t('admin.schedules.created') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast({ title: t('admin.schedules.error'), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      await apiRequest('PATCH', `/api/admin/work-schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/work-schedules'] });
      toast({ title: t('admin.schedules.updated') });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('DELETE', `/api/admin/work-schedules/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/work-schedules'] });
      toast({ title: t('admin.schedules.deleted') });
    },
  });

  const resetForm = () => {
    setFormData({ userId: "", siteId: "", scheduledDate: "", startTime: "", endTime: "", notes: "" });
    setWeeklyFormData({ userId: "", siteId: "", weekStartDate: "", daysOfWeek: [], repeatWeeks: 1, startTime: "", endTime: "", notes: "" });
    setEditingSchedule(null);
  };

  const handleSubmit = () => {
    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: formData });
    } else {
      if (scheduleMode === 'weekly') {
        if (!weeklyFormData.userId || !weeklyFormData.siteId) return toast({ title: t('admin.schedules.validationBaristaAndSite'), variant: 'destructive' });
        if (weeklyFormData.daysOfWeek.length === 0) return toast({ title: t('admin.schedules.validationSelectDays'), variant: 'destructive' });
        createMutation.mutate({ mode: 'weekly', ...weeklyFormData });
      } else {
        createMutation.mutate({ mode: 'single', ...formData });
      }
    }
  };

  const toggleDayOfWeek = (day: string) => {
    setWeeklyFormData(prev => ({
      ...prev, daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day]
    }));
  };

  const handleEdit = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      userId: schedule.userId, siteId: schedule.siteId, scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime, endTime: schedule.endTime, notes: schedule.notes || "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Branded Header ── */}
      <div className="bg-blue-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-yellow-400 rounded-2xl p-4 shadow-lg shrink-0 transform -rotate-3">
              <Calendar className="h-6 w-6 text-blue-900" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{t('admin.schedules.title')}</h2>
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-80">{t('admin.schedules.subtitle')}</p>
            </div>
          </div>
          <Button
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="bg-yellow-400 text-blue-900 font-black uppercase text-xs px-8 h-14 rounded-2xl shadow-xl transition-all active:scale-95"
            data-testid="button-add-schedule"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('admin.schedules.addSchedule')}
          </Button>
        </div>
      </div>

      {schedulesLoading ? (
        <div className="text-center py-20 font-black text-slate-300 uppercase tracking-widest animate-pulse">Synchronizing Schedules...</div>
      ) : schedules.length === 0 ? (
        <Card className="p-20 text-center border-dashed bg-slate-50/50 rounded-[3rem]">
          <Calendar className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest">{t('admin.schedules.noSchedules')}</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {schedules.map((schedule) => {
            const barista = users.find(u => u.id === schedule.userId);
            const site = sites.find(s => s.id === schedule.siteId);
            return (
              <Card key={schedule.id} className="border-none shadow-xl rounded-[2.5rem] bg-white group hover:shadow-2xl transition-all duration-500 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      <div className="bg-blue-900/5 rounded-2xl p-4 shrink-0 group-hover:bg-blue-900 transition-colors duration-300">
                        <User className="w-6 h-6 text-blue-900 group-hover:text-yellow-400 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-blue-900 uppercase tracking-tight text-lg truncate leading-none">
                          {barista?.firstName} {barista?.lastName}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" /> {site?.name}
                          </span>
                        </div>

                        {/* TACTICAL SHIFT TAG */}
                        <div className="mt-4 flex items-center gap-2">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 flex items-center gap-3">
                            <Clock className="w-3.5 h-3.5 text-blue-900/40" />
                            <span className="text-xs font-black text-blue-900 uppercase tracking-tighter">
                              {schedule.scheduledDate} · {schedule.startTime} — {schedule.endTime}
                            </span>
                          </div>
                        </div>

                        {schedule.notes && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-3 italic opacity-70">
                            Note: {schedule.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)} className="h-11 w-11 rounded-xl text-blue-900" data-testid={`button-edit-schedule-${schedule.id}`}>
                        <Edit className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(schedule.id)} className="h-11 w-11 rounded-xl text-red-400" data-testid={`button-delete-schedule-${schedule.id}`}>
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Logistics Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <div className="bg-blue-900 p-8 flex items-center gap-5">
            <div className="bg-yellow-400 rounded-2xl p-3.5 shadow-lg shrink-0">
              <Calendar className="h-6 w-6 text-blue-900" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">
                {editingSchedule ? 'Modify Logistics' : 'Deploy Barista'}
              </h2>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.2em] mt-2">
                Operational Schedule Protocol
              </p>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            <div className="p-8 space-y-8">
              {!editingSchedule && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.mode')}</Label>
                  <div className="flex gap-3">
                    {(['single', 'weekly'] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        onClick={() => setScheduleMode(mode)}
                        className={`flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                          scheduleMode === mode ? 'bg-blue-900 text-yellow-400 shadow-xl' : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {t(`admin.schedules.${mode === 'single' ? 'singleDay' : 'weeklySchedule'}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.barista')}</Label>
                  <Select
                    value={scheduleMode === 'single' ? formData.userId : weeklyFormData.userId}
                    onValueChange={(v) => scheduleMode === 'single' ? setFormData({ ...formData, userId: v }) : setWeeklyFormData({ ...weeklyFormData, userId: v })}
                  >
                    <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200" data-testid="select-barista">
                      <SelectValue placeholder="Select Barista" />
                    </SelectTrigger>
                    <SelectContent>
                      {baristas.map(u => <SelectItem key={u.id} value={u.id} className="font-bold">{u.firstName} {u.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.site')}</Label>
                  <Select
                    value={scheduleMode === 'single' ? formData.siteId : weeklyFormData.siteId}
                    onValueChange={(v) => scheduleMode === 'single' ? setFormData({ ...formData, siteId: v }) : setWeeklyFormData({ ...weeklyFormData, siteId: v })}
                  >
                    <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200" data-testid="select-site">
                      <SelectValue placeholder="Select Site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {scheduleMode === 'single' ? (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.date')}</Label>
                  <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} className="h-12 rounded-xl font-bold" data-testid="input-date" />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.weekStart')}</Label>
                    <Input
                      type="date"
                      value={weeklyFormData.weekStartDate}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        const day = d.getDay();
                        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                        d.setDate(diff);
                        setWeeklyFormData({ ...weeklyFormData, weekStartDate: d.toISOString().split('T')[0] });
                      }}
                      className="h-12 rounded-xl font-bold"
                      data-testid="input-week-start"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.daysOfWeek')}</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <Button
                          key={day}
                          type="button"
                          variant="outline"
                          onClick={() => toggleDayOfWeek(day)}
                          data-testid={`button-day-${day}`}
                          className={`h-12 px-0 font-black uppercase text-[9px] rounded-xl transition-all ${
                            weeklyFormData.daysOfWeek.includes(day) ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-lg scale-105' : 'bg-white text-slate-400'
                          }`}
                        >
                          {t(`admin.schedules.days.${day}`).substring(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.repeatWeeks')}</Label>
                    <Select value={String(weeklyFormData.repeatWeeks)} onValueChange={(v) => setWeeklyFormData({ ...weeklyFormData, repeatWeeks: Number(v) })}>
                      <SelectTrigger className="h-12 rounded-xl font-bold border-slate-200" data-testid="select-repeat-weeks"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 4, 8, 12].map(num => <SelectItem key={num} value={String(num)} className="font-bold">{t('admin.schedules.weeks', { count: num })}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.startTime')}</Label>
                  <Input
                    type="time"
                    value={scheduleMode === 'single' ? formData.startTime : weeklyFormData.startTime}
                    onChange={(e) => scheduleMode === 'single' ? setFormData({ ...formData, startTime: e.target.value }) : setWeeklyFormData({ ...weeklyFormData, startTime: e.target.value })}
                    className="h-12 rounded-xl font-bold"
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.endTime')}</Label>
                  <Input
                    type="time"
                    value={scheduleMode === 'single' ? formData.endTime : weeklyFormData.endTime}
                    onChange={(e) => scheduleMode === 'single' ? setFormData({ ...formData, endTime: e.target.value }) : setWeeklyFormData({ ...weeklyFormData, endTime: e.target.value })}
                    className="h-12 rounded-xl font-bold"
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('admin.schedules.notes')}</Label>
                <Textarea
                  value={scheduleMode === 'single' ? formData.notes : weeklyFormData.notes}
                  onChange={(e) => scheduleMode === 'single' ? setFormData({ ...formData, notes: e.target.value }) : setWeeklyFormData({ ...weeklyFormData, notes: e.target.value })}
                  className="rounded-2xl min-h-[100px] border-slate-200"
                  placeholder="Optional shift instructions..."
                  data-testid="input-notes"
                />
              </div>

              {scheduleMode === 'weekly' && weeklyFormData.daysOfWeek.length > 0 && (
                <div className="p-5 bg-blue-900/5 rounded-[1.5rem] border border-blue-900/10 flex items-start gap-4">
                  <Info className="w-5 h-5 text-blue-900 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-blue-900 uppercase tracking-tight">{t('admin.schedules.summary')}</p>
                    <p className="text-[10px] font-bold text-blue-900/60 uppercase tracking-widest mt-1">
                      {t('admin.schedules.summaryText', { days: weeklyFormData.daysOfWeek.length, weeks: weeklyFormData.repeatWeeks, total: weeklyFormData.daysOfWeek.length * weeklyFormData.repeatWeeks })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 bg-slate-50 flex gap-4">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-14 bg-yellow-400 text-blue-900 font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl transition-all"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-schedule"
            >
              {createMutation.isPending || updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
