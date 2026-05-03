/* LEF'S PREMIER YENS WEEKLY SPECIALS UPDATE */
/* Changes: Yens Blue branding, Premium Card Layout, and Senior Staff Campaign Flow */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, CheckCircle2, XCircle, Sparkles, Trophy, Star,
  Zap, Heart, Gift, TrendingUp, Target, Award, Rocket, Crown, Calendar, Megaphone
} from "lucide-react";
import type { WeeklySpecial } from "@shared/schema";

const SPECIAL_ICONS = [
  { id: 'trophy',   Icon: Trophy,     color: 'text-amber-400' },
  { id: 'star',     Icon: Star,       color: 'text-amber-400' },
  { id: 'zap',      Icon: Zap,        color: 'text-blue-400' },
  { id: 'heart',    Icon: Heart,      color: 'text-rose-400' },
  { id: 'gift',     Icon: Gift,       color: 'text-emerald-400' },
  { id: 'trending', Icon: TrendingUp, color: 'text-emerald-400' },
  { id: 'target',   Icon: Target,     color: 'text-orange-400' },
  { id: 'award',    Icon: Award,      color: 'text-purple-400' },
  { id: 'rocket',   Icon: Rocket,     color: 'text-indigo-400' },
  { id: 'crown',    Icon: Crown,      color: 'text-amber-500' },
];

const COLOR_THEMES = [
  { id: 'blue',   name: 'Premium Blue',  gradient: 'from-blue-900 to-blue-800',      textColor: 'text-white' },
  { id: 'yellow', name: 'Yens Gold',     gradient: 'from-amber-400 to-orange-500',   textColor: 'text-amber-950' },
  { id: 'purple', name: 'Royal Purple',  gradient: 'from-indigo-600 to-purple-700',  textColor: 'text-white' },
  { id: 'green',  name: 'Organic Green', gradient: 'from-emerald-600 to-teal-700',   textColor: 'text-white' },
  { id: 'red',    name: 'Flash Sale',    gradient: 'from-rose-600 to-red-700',       textColor: 'text-white' },
];

const QUICK_TEMPLATES = [
  { title: 'Double Points Weekend', description: 'Earn double points on all soft serve purchases this weekend!', bonusPoints: 10, icon: 'zap',    theme: 'blue' },
  { title: 'New Flavor Launch',     description: 'Extra points for trying our new seasonal flavor!',           bonusPoints: 15, icon: 'star',   theme: 'yellow' },
  { title: 'Loyalty Sprint',        description: 'Complete 3 purchases this week for a massive bonus!',        bonusPoints: 50, icon: 'rocket', theme: 'purple' },
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
    imageUrl: "zap:blue",
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
      toast({ title: "Campaign Created", description: "Your weekly special is now scheduled." });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: t("admin.specials.createFailed"), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WeeklySpecial> }) => {
      return await apiRequest("PATCH", `/api/admin/weekly-specials/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/weekly-specials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special/active"] });
      setEditingSpecial(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: t("admin.specials.updateFailed"), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/weekly-specials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/weekly-specials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-special/active"] });
      setDeletingSpecial(null);
    },
    onError: (error: any) => {
      toast({ title: t("admin.specials.deleteFailed"), description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      bonusPoints: 5,
      imageUrl: "zap:blue",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
  };

  const openEditDialog = (special: WeeklySpecial) => {
    setEditingSpecial(special);
    setFormData({
      title: special.title,
      description: special.description,
      bonusPoints: special.bonusPoints,
      imageUrl: special.imageUrl || "zap:blue",
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

  const parseImageUrl = (imageUrl: string | null) => {
    const [iconId = 'zap', themeId = 'blue'] = (imageUrl || 'zap:blue').split(':');
    const iconData = SPECIAL_ICONS.find(i => i.id === iconId) || SPECIAL_ICONS[0];
    const themeData = COLOR_THEMES.find(t => t.id === themeId) || COLOR_THEMES[0];
    return { iconData, themeData };
  };

  if (isLoading) return <div className="text-center py-20 font-black text-slate-300 animate-pulse uppercase tracking-widest">Loading Campaigns...</div>;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="bg-blue-900 rounded-2xl p-5 flex flex-wrap items-center gap-4 shadow-xl">
        <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
          <Megaphone className="w-5 h-5 text-blue-900" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">Campaign Manager</h2>
          <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em] mt-1.5">Weekly Loyalty Incentives</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl shrink-0" data-testid="button-add-special">
          <Plus className="w-4 h-4 mr-2" /> CREATE NEW SPECIAL
        </Button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {specials.length === 0 ? (
          <Card className="md:col-span-2 p-20 text-center border-dashed bg-slate-50/50">
            <Sparkles className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest">No Active Campaigns Found</p>
            <Button onClick={() => setAddDialogOpen(true)} variant="outline" className="mt-6 font-black uppercase text-xs" data-testid="button-add-first-special">
              Create Your First Special
            </Button>
          </Card>
        ) : (
          specials.map((special) => {
            const { iconData, themeData } = parseImageUrl(special.imageUrl);
            const IconComponent = iconData.Icon;
            return (
              <Card key={special.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all rounded-[2rem] bg-white" data-testid={`special-card-${special.id}`}>
                <div className={`bg-gradient-to-br ${themeData.gradient} p-8 relative`}>
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <IconComponent className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl">
                        <IconComponent className={`w-8 h-8 ${themeData.textColor}`} />
                      </div>
                      <Badge className={`${special.isActive ? 'bg-emerald-500' : 'bg-slate-700'} text-white font-black text-[9px] uppercase border-none px-3`}>
                        {special.isActive ? 'LIVE NOW' : 'INACTIVE'}
                      </Badge>
                    </div>
                    <h3 className={`text-2xl font-black ${themeData.textColor} tracking-tight leading-none uppercase mb-2`}>{special.title}</h3>
                    <p className={`text-sm font-bold ${themeData.textColor} opacity-80 line-clamp-2 mb-6`}>{special.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                        <Star className="w-4 h-4 text-[#FCD34D] fill-[#FCD34D]" />
                        <span className={`text-sm font-black ${themeData.textColor}`}>+{special.bonusPoints} PTS</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(special)} className="h-10 w-10 bg-white/10 rounded-xl transition-all" data-testid={`button-edit-${special.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingSpecial(special)} className="h-10 w-10 bg-white/10 rounded-xl transition-all" data-testid={`button-delete-${special.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Ends: {new Date(special.endDate).toLocaleDateString()}
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => updateMutation.mutate({ id: special.id, data: { isActive: !special.isActive } })}
                    className={`text-[10px] font-black uppercase ${special.isActive ? 'text-red-500' : 'text-emerald-600'}`}
                    data-testid={`button-toggle-${special.id}`}
                  >
                    {special.isActive ? 'Pause' : 'Launch'}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen || !!editingSpecial} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); setEditingSpecial(null); resetForm(); } }}>
        <DialogContent className="max-w-xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white" data-testid="dialog-special-form">
          <div className="bg-blue-900 rounded-t-[2rem] p-6 flex items-center gap-4">
            <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
              <Megaphone className="h-4 w-4 text-blue-900" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white leading-none">{editingSpecial ? 'Edit Campaign' : 'Create Campaign'}</h2>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em] mt-1.5">Design your weekly customer incentive</p>
            </div>
          </div>

          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
            {!editingSpecial && (
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quick Start Templates</Label>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_TEMPLATES.map((template, idx) => (
                    <Button key={idx} variant="outline" size="sm" onClick={() => applyTemplate(template)} className="text-[10px] font-black h-10 rounded-xl" data-testid={`button-template-${idx}`}>
                      {template.title.split(' ')[0]}...
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Campaign Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="rounded-xl font-bold h-12" data-testid="input-title" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Bonus Points</Label>
                <Input type="number" value={formData.bonusPoints} onChange={(e) => setFormData({ ...formData, bonusPoints: parseInt(e.target.value) || 0 })} className="rounded-xl font-bold h-12" data-testid="input-bonus-points" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Promotion Message</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="rounded-2xl font-medium min-h-[100px]" data-testid="input-description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="rounded-xl font-bold" data-testid="input-start-date" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">End Date</Label>
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="rounded-xl font-bold" data-testid="input-end-date" />
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 flex gap-4">
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditingSpecial(null); resetForm(); }} className="flex-1 h-12 rounded-xl font-black uppercase text-xs" data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={editingSpecial ? () => updateMutation.mutate({ id: editingSpecial.id, data: formData }) : () => createMutation.mutate(formData)}
              disabled={!formData.title || !formData.description || createMutation.isPending || updateMutation.isPending}
              className="flex-1 h-12 bg-yellow-400 text-blue-900 font-black rounded-xl uppercase text-xs shadow-lg"
              data-testid="button-save"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Campaign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSpecial} onOpenChange={(open) => !open && setDeletingSpecial(null)}>
        <DialogContent className="p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden" data-testid="dialog-delete-confirm">
          <div className="bg-blue-900 rounded-t-[2rem] p-6 flex items-center gap-4">
            <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
              <Trash2 className="h-4 w-4 text-blue-900" />
            </div>
            <h2 className="text-base font-black uppercase tracking-tight text-white leading-none">
              {t("admin.specials.deleteConfirm")}
            </h2>
          </div>
          <div className="p-8">
            <p className="text-sm text-muted-foreground">
              {t("admin.specials.deleteMessage")} <strong>{deletingSpecial?.title}</strong>?
            </p>
          </div>
          <div className="flex gap-3 px-8 pb-8">
            <Button variant="outline" className="flex-1 border-blue-900/10 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl" onClick={() => setDeletingSpecial(null)} data-testid="button-delete-cancel">{t("common.cancel")}</Button>
            <Button variant="destructive" className="flex-1 font-black uppercase text-[10px] tracking-widest rounded-xl" onClick={() => deletingSpecial && deleteMutation.mutate(deletingSpecial.id)} disabled={deleteMutation.isPending} data-testid="button-delete-confirm">
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
