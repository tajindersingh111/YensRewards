import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Megaphone, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BaristaAnnouncement } from "@shared/schema";

export function BaristaHubManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<BaristaAnnouncement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "general",
    priority: 0,
    isActive: true,
    expiresAt: "",
  });

  const { data: announcements = [], isLoading } = useQuery<BaristaAnnouncement[]>({
    queryKey: ['/api/admin/barista-announcements'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/admin/barista-announcements', {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/barista-announcements'] });
      toast({ title: t('admin.barista.created') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: t('admin.barista.error'), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest('PATCH', `/api/admin/barista-announcements/${id}`, {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/barista-announcements'] });
      toast({ title: t('admin.barista.updated') });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: t('admin.barista.error'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/barista-announcements/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/barista-announcements'] });
      toast({ title: t('admin.barista.deleted') });
    },
    onError: () => {
      toast({ title: t('admin.barista.error'), variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest('PATCH', `/api/admin/barista-announcements/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/barista-announcements'] });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", content: "", type: "general", priority: 0, isActive: true, expiresAt: "" });
    setEditingAnnouncement(null);
  };

  const handleSubmit = () => {
    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (announcement: BaristaAnnouncement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isActive: announcement.isActive,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-8 -mt-8" />
        <div className="flex items-center gap-4 z-10">
          <div className="bg-yellow-400 rounded-xl p-3 shadow-lg flex-shrink-0">
            <Megaphone className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">{t('admin.barista.title')}</h2>
            <p className="text-blue-300 text-[11px] font-bold uppercase tracking-[0.15em] mt-1.5 opacity-90">{t('admin.barista.subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          className="bg-yellow-400 text-blue-900 font-black uppercase text-xs px-6 h-11 rounded-xl shadow-lg z-10"
          data-testid="button-add-announcement"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.barista.addAnnouncement')}
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">{t('common.loading')}</Card>
      ) : announcements.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t('admin.barista.noAnnouncements')}</Card>
      ) : (
        <div className="grid gap-4">
          {announcements
            .sort((a, b) => b.priority - a.priority)
            .map((announcement) => (
              <Card key={announcement.id} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className={`rounded-xl p-2.5 shadow-md shrink-0 ${announcement.isActive ? "bg-yellow-400" : "bg-slate-100"}`}>
                        <Megaphone className={`w-4 h-4 ${announcement.isActive ? "text-blue-900" : "text-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-black text-blue-900 uppercase tracking-tight leading-none">{announcement.title}</h3>
                          <Badge className="bg-blue-900/10 text-blue-900 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                            {announcement.type}
                          </Badge>
                          {!announcement.isActive && <Badge variant="destructive" className="text-[8px] font-black uppercase">{t('admin.barista.inactive')}</Badge>}
                        </div>
                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{announcement.content}</p>
                        {announcement.expiresAt && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {t('admin.barista.expires')}: {new Date(announcement.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActiveMutation.mutate({ id: announcement.id, isActive: !announcement.isActive })}
                        data-testid={`button-toggle-announcement-${announcement.id}`}
                      >
                        {announcement.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(announcement)} data-testid={`button-edit-announcement-${announcement.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(announcement.id)} data-testid={`button-delete-announcement-${announcement.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? t('admin.barista.editAnnouncement') : t('admin.barista.addAnnouncement')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.barista.announcementTitle')}</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-title" />
            </div>
            <div>
              <Label>{t('admin.barista.content')}</Label>
              <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} data-testid="input-content" />
            </div>
            <div>
              <Label>{t('admin.barista.type')}</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t('admin.barista.types.general')}</SelectItem>
                  <SelectItem value="promotion">{t('admin.barista.types.promotion')}</SelectItem>
                  <SelectItem value="incentive">{t('admin.barista.types.incentive')}</SelectItem>
                  <SelectItem value="policy">{t('admin.barista.types.policy')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('admin.barista.priority')}</Label>
              <Input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} data-testid="input-priority" />
            </div>
            <div>
              <Label>{t('admin.barista.expiryDate')}</Label>
              <Input type="date" value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} data-testid="input-expiry" />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-announcement">
              {createMutation.isPending || updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
