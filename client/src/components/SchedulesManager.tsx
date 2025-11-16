import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WorkSchedule, User, Site } from "@shared/schema";

export function SchedulesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [formData, setFormData] = useState({
    userId: "",
    siteId: "",
    scheduledDate: "",
    startTime: "",
    endTime: "",
    notes: "",
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<WorkSchedule[]>({
    queryKey: ['/api/admin/work-schedules'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['/api/admin/sites'],
  });

  const baristas = users.filter(u => u.role === 'barista');

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/admin/work-schedules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/work-schedules'] });
      toast({ title: t('admin.schedules.created') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: t('admin.schedules.error'), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest('PATCH', `/api/admin/work-schedules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/work-schedules'] });
      toast({ title: t('admin.schedules.updated') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: t('admin.schedules.error'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/work-schedules/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/work-schedules'] });
      toast({ title: t('admin.schedules.deleted') });
    },
    onError: () => {
      toast({ title: t('admin.schedules.error'), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ userId: "", siteId: "", scheduledDate: "", startTime: "", endTime: "", notes: "" });
    setEditingSchedule(null);
  };

  const handleSubmit = () => {
    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      userId: schedule.userId,
      siteId: schedule.siteId,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      notes: schedule.notes || "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.schedules.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin.schedules.subtitle')}</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-schedule">
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.schedules.addSchedule')}
        </Button>
      </div>

      {schedulesLoading ? (
        <Card className="p-8 text-center">{t('common.loading')}</Card>
      ) : schedules.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t('admin.schedules.noSchedules')}</Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => {
            const barista = users.find(u => u.id === schedule.userId);
            const site = sites.find(s => s.id === schedule.siteId);
            return (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{barista?.firstName} {barista?.lastName}</h3>
                      <p className="text-sm text-muted-foreground">{site?.name}</p>
                      <p className="text-sm mt-1">
                        {schedule.scheduledDate} | {schedule.startTime} - {schedule.endTime}
                      </p>
                      {schedule.notes && <p className="text-sm text-muted-foreground mt-1">{schedule.notes}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(schedule)} data-testid={`button-edit-schedule-${schedule.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(schedule.id)} data-testid={`button-delete-schedule-${schedule.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchedule ? t('admin.schedules.editSchedule') : t('admin.schedules.addSchedule')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.schedules.barista')}</Label>
              <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
                <SelectTrigger data-testid="select-barista">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {baristas.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('admin.schedules.site')}</Label>
              <Select value={formData.siteId} onValueChange={(v) => setFormData({ ...formData, siteId: v })}>
                <SelectTrigger data-testid="select-site">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('admin.schedules.date')}</Label>
              <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} data-testid="input-date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.schedules.startTime')}</Label>
                <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} data-testid="input-start-time" />
              </div>
              <div>
                <Label>{t('admin.schedules.endTime')}</Label>
                <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} data-testid="input-end-time" />
              </div>
            </div>
            <div>
              <Label>{t('admin.schedules.notes')}</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="input-notes" />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-schedule">
              {createMutation.isPending || updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
