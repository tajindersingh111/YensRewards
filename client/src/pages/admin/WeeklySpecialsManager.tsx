import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import type { WeeklySpecial } from "@shared/schema";

export default function WeeklySpecialsManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<WeeklySpecial | null>(null);
  const [deletingSpecial, setDeletingSpecial] = useState<WeeklySpecial | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    bonusPoints: 5,
    imageUrl: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const { data: specials = [], isLoading } = useQuery<WeeklySpecial[]>({
    queryKey: ["/api/weekly-special"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/weekly-special", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special/active"] });
      toast({
        title: t("admin.specials.created"),
        description: t("admin.specials.createdDesc"),
      });
      setAddDialogOpen(false);
      setFormData({ 
        title: "", 
        description: "", 
        bonusPoints: 5, 
        imageUrl: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.specials.createFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WeeklySpecial> }) => {
      return await apiRequest("PATCH", `/api/weekly-special/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special/active"] });
      toast({
        title: t("admin.specials.updated"),
        description: t("admin.specials.updatedDesc"),
      });
      setEditingSpecial(null);
    },
    onError: (error: any) => {
      toast({
        title: t("admin.specials.updateFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/weekly-special/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special/active"] });
      toast({
        title: t("admin.specials.deleted"),
        description: t("admin.specials.deletedDesc"),
      });
      setDeletingSpecial(null);
    },
    onError: (error: any) => {
      toast({
        title: t("admin.specials.deleteFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleActive = async (special: WeeklySpecial) => {
    await updateMutation.mutateAsync({
      id: special.id,
      data: { isActive: !special.isActive },
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingSpecial) return;
    updateMutation.mutate({
      id: editingSpecial.id,
      data: formData,
    });
  };

  const openEditDialog = (special: WeeklySpecial) => {
    setEditingSpecial(special);
    setFormData({
      title: special.title,
      description: special.description,
      bonusPoints: special.bonusPoints,
      imageUrl: special.imageUrl || "",
      startDate: special.startDate,
      endDate: special.endDate,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.specials.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.specials.description")}</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-special">
          <Plus className="w-4 h-4 mr-2" />
          {t("admin.specials.add")}
        </Button>
      </div>

      <div className="grid gap-4">
        {specials.length === 0 ? (
          <Card className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("admin.specials.noSpecials")}</p>
            <Button onClick={() => setAddDialogOpen(true)} variant="outline" className="mt-4" data-testid="button-add-first-special">
              <Plus className="w-4 h-4 mr-2" />
              {t("admin.specials.addFirst")}
            </Button>
          </Card>
        ) : (
          specials.map((special) => (
            <Card key={special.id} className="p-4" data-testid={`special-card-${special.id}`}>
              <div className="flex items-start gap-4">
                {special.imageUrl && (
                  <img
                    src={special.imageUrl}
                    alt={special.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{special.title}</h3>
                        <Badge variant={special.isActive ? "default" : "secondary"} data-testid={`badge-status-${special.id}`}>
                          {special.isActive ? t("admin.specials.active") : t("admin.specials.inactive")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{special.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <span className="font-medium text-yellow-600">+{special.bonusPoints}</span> {t("admin.specials.bonusPoints")}
                        </span>
                        <span>
                          {t("admin.specials.validUntil")} {new Date(special.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(special)}
                        data-testid={`button-toggle-${special.id}`}
                      >
                        {special.isActive ? <XCircle className="w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        {special.isActive ? t("admin.specials.deactivate") : t("admin.specials.activate")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(special)}
                        data-testid={`button-edit-${special.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingSpecial(special)}
                        data-testid={`button-delete-${special.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen || !!editingSpecial} onOpenChange={(open) => {
        if (!open) {
          setAddDialogOpen(false);
          setEditingSpecial(null);
          setFormData({ 
            title: "", 
            description: "", 
            bonusPoints: 5, 
            imageUrl: "",
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
        }
      }}>
        <DialogContent data-testid="dialog-special-form">
          <DialogHeader>
            <DialogTitle>
              {editingSpecial ? t("admin.specials.edit") : t("admin.specials.add")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("admin.specials.titleLabel")}</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("admin.specials.titlePlaceholder")}
                data-testid="input-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.specials.descriptionLabel")}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("admin.specials.descriptionPlaceholder")}
                rows={3}
                data-testid="input-description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.specials.bonusPointsLabel")}</label>
              <Input
                type="number"
                value={formData.bonusPoints}
                onChange={(e) => setFormData({ ...formData, bonusPoints: parseInt(e.target.value) || 0 })}
                min={1}
                data-testid="input-bonus-points"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.specials.imageUrlLabel")}</label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder={t("admin.specials.imageUrlPlaceholder")}
                data-testid="input-image-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("admin.specials.startDateLabel")}</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("admin.specials.endDateLabel")}</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddDialogOpen(false);
              setEditingSpecial(null);
              setFormData({ 
                title: "", 
                description: "", 
                bonusPoints: 5, 
                imageUrl: "",
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              });
            }} data-testid="button-cancel">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={editingSpecial ? handleUpdate : handleCreate}
              disabled={!formData.title || !formData.description || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {createMutation.isPending || updateMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSpecial} onOpenChange={(open) => !open && setDeletingSpecial(null)}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>{t("admin.specials.deleteConfirm")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("admin.specials.deleteMessage")} <strong>{deletingSpecial?.title}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSpecial(null)} data-testid="button-delete-cancel">
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSpecial && deleteMutation.mutate(deletingSpecial.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
