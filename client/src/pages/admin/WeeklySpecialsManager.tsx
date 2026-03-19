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
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Sparkles, Trophy, Star, Zap, Heart, Gift, TrendingUp, Target, Award, Rocket, Crown } from "lucide-react";
import type { WeeklySpecial } from "@shared/schema";

// Icon options for specials (no image upload needed!)
const SPECIAL_ICONS = [
  { id: 'trophy', Icon: Trophy, color: 'text-yellow-500' },
  { id: 'star', Icon: Star, color: 'text-yellow-400' },
  { id: 'zap', Icon: Zap, color: 'text-blue-500' },
  { id: 'heart', Icon: Heart, color: 'text-red-500' },
  { id: 'gift', Icon: Gift, color: 'text-green-500' },
  { id: 'trending', Icon: TrendingUp, color: 'text-emerald-500' },
  { id: 'target', Icon: Target, color: 'text-orange-500' },
  { id: 'award', Icon: Award, color: 'text-purple-500' },
  { id: 'rocket', Icon: Rocket, color: 'text-indigo-500' },
  { id: 'crown', Icon: Crown, color: 'text-amber-500' },
];

// Gradient background themes
const COLOR_THEMES = [
  { id: 'yellow', name: 'Sunshine', gradient: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-900' },
  { id: 'blue', name: 'Ocean', gradient: 'from-blue-400 to-cyan-500', textColor: 'text-blue-900' },
  { id: 'purple', name: 'Royal', gradient: 'from-purple-400 to-pink-500', textColor: 'text-purple-900' },
  { id: 'green', name: 'Fresh', gradient: 'from-green-400 to-emerald-500', textColor: 'text-green-900' },
  { id: 'red', name: 'Fire', gradient: 'from-red-400 to-rose-500', textColor: 'text-red-900' },
];

// Quick templates
const QUICK_TEMPLATES = [
  {
    title: 'Double Points Weekend',
    description: 'Earn double points on all soft serve purchases this weekend!',
    bonusPoints: 10,
    icon: 'trophy',
    theme: 'yellow',
  },
  {
    title: 'New Customer Bonus',
    description: 'Get extra points for signing up new customers this week',
    bonusPoints: 15,
    icon: 'star',
    theme: 'blue',
  },
  {
    title: 'Top Seller Challenge',
    description: 'Sell 50+ items this week and earn a special bonus!',
    bonusPoints: 20,
    icon: 'rocket',
    theme: 'purple',
  },
];

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
    imageUrl: "trophy:yellow", // Format: "iconId:themeId"
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const { data: specials = [], isLoading } = useQuery<WeeklySpecial[]>({
    queryKey: ["/api/admin/weekly-specials"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/admin/weekly-specials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/weekly-specials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special/active"] });
      toast({
        title: t("admin.specials.created"),
        description: t("admin.specials.createdDesc"),
      });
      setAddDialogOpen(false);
      resetForm();
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
      return await apiRequest("PATCH", `/api/admin/weekly-specials/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/weekly-specials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special/active"] });
      toast({
        title: t("admin.specials.updated"),
        description: t("admin.specials.updatedDesc"),
      });
      setEditingSpecial(null);
      resetForm();
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
      return await apiRequest("DELETE", `/api/admin/weekly-specials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/weekly-specials"] });
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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      bonusPoints: 5,
      imageUrl: "trophy:yellow",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  };

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
      imageUrl: special.imageUrl || "trophy:yellow",
      startDate: special.startDate,
      endDate: special.endDate,
    });
  };

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setFormData({
      ...formData,
      title: template.title,
      description: template.description,
      bonusPoints: template.bonusPoints,
      imageUrl: `${template.icon}:${template.theme}`,
    });
  };

  // Parse imageUrl to get icon and theme
  const parseImageUrl = (imageUrl: string | null) => {
    const [iconId = 'trophy', themeId = 'yellow'] = (imageUrl || 'trophy:yellow').split(':');
    const iconData = SPECIAL_ICONS.find(i => i.id === iconId) || SPECIAL_ICONS[0];
    const themeData = COLOR_THEMES.find(t => t.id === themeId) || COLOR_THEMES[0];
    return { iconData, themeData };
  };

  const selectedIcon = formData.imageUrl.split(':')[0] || 'trophy';
  const selectedTheme = formData.imageUrl.split(':')[1] || 'yellow';

  if (isLoading) {
    return <div className="text-center py-8">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("admin.specials.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("admin.specials.description")}</p>
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
          specials.map((special) => {
            const { iconData, themeData } = parseImageUrl(special.imageUrl);
            const IconComponent = iconData.Icon;
            
            return (
              <Card key={special.id} className="overflow-hidden" data-testid={`special-card-${special.id}`}>
                <div className={`bg-gradient-to-r ${themeData.gradient} p-4`}>
                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                      <IconComponent className={`w-8 h-8 text-white`} />
                    </div>
                    <div className="flex-1 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{special.title}</h3>
                        <Badge variant={special.isActive ? "default" : "secondary"} className="bg-white/30 text-white border-white/50">
                          {special.isActive ? t("admin.specials.active") : t("admin.specials.inactive")}
                        </Badge>
                      </div>
                      <p className="text-white/90 text-sm mb-2">{special.description}</p>
                      <div className="flex items-center gap-4 text-xs text-white/80">
                        <span className="font-semibold bg-white/20 px-2 py-1 rounded">
                          +{special.bonusPoints} {t("admin.specials.bonusPoints")}
                        </span>
                        <span>
                          {t("admin.specials.validUntil")} {new Date(special.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(special)}
                        className="text-white hover:bg-white/20"
                        data-testid={`button-toggle-${special.id}`}
                      >
                        {special.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(special)}
                        className="text-white hover:bg-white/20"
                        data-testid={`button-edit-${special.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingSpecial(special)}
                        className="text-white hover:bg-white/20"
                        data-testid={`button-delete-${special.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen || !!editingSpecial} onOpenChange={(open) => {
        if (!open) {
          setAddDialogOpen(false);
          setEditingSpecial(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-special-form">
          <DialogHeader>
            <DialogTitle>
              {editingSpecial ? t("admin.specials.edit") : t("admin.specials.add")}
            </DialogTitle>
          </DialogHeader>
          
          {/* Quick Templates */}
          {!editingSpecial && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Templates</label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_TEMPLATES.map((template, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="text-xs h-auto py-2 hover-elevate"
                    data-testid={`button-template-${idx}`}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {template.title.split(' ')[0]}...
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Icon Picker */}
            <div>
              <label className="text-sm font-medium">Choose Icon</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {SPECIAL_ICONS.map((icon) => {
                  const IconComp = icon.Icon;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: `${icon.id}:${selectedTheme}` })}
                      className={`p-3 rounded-lg border-2 transition-all hover-elevate ${
                        selectedIcon === icon.id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      data-testid={`icon-${icon.id}`}
                    >
                      <IconComp className={`w-6 h-6 mx-auto ${icon.color}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Theme Picker */}
            <div>
              <label className="text-sm font-medium">Choose Color Theme</label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: `${selectedIcon}:${theme.id}` })}
                    className={`h-12 rounded-lg bg-gradient-to-r ${theme.gradient} border-2 transition-all hover-elevate ${
                      selectedTheme === theme.id 
                        ? 'border-foreground scale-105' 
                        : 'border-transparent'
                    }`}
                    data-testid={`theme-${theme.id}`}
                  >
                    <span className="sr-only">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

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
              resetForm();
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
