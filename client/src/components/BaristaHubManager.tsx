import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, Megaphone, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.barista.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin.barista.subtitle')}</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="button-add-announcement">
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
              <Card key={announcement.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <Megaphone className="w-5 h-5 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <Badge variant={announcement.type === 'promotion' ? 'default' : announcement.type === 'incentive' ? 'secondary' : 'outline'}>
                          {announcement.type}
                        </Badge>
                        {!announcement.isActive && <Badge variant="destructive">{t('admin.barista.inactive')}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                      {announcement.expiresAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('admin.barista.expires')}: {new Date(announcement.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ id: announcement.id, isActive: !announcement.isActive })}
                      data-testid={`button-toggle-announcement-${announcement.id}`}
                    >
                      {announcement.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(announcement)} data-testid={`button-edit-announcement-${announcement.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(announcement.id)} data-testid={`button-delete-announcement-${announcement.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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
