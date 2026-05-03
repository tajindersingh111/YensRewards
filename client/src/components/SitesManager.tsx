import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, MapPin, Clock, Calendar } from "lucide-react";
import type { Site } from "@shared/schema";

interface SiteFormData {
  name: string;
  channelName: string;
  type: "stall" | "mobile_van";
  location: string;
  operatingDays: string[];
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const PREDEFINED_LOCATIONS = [
  "Yens Head Office",
  "River",
  "Market",
  "custom",
] as const;

export default function SitesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("Yens Head Office");
  const [formData, setFormData] = useState<SiteFormData>({
    name: "",
    channelName: "",
    type: "stall",
    location: "",
    operatingDays: [],
    openTime: "09:00",
    closeTime: "21:00",
    isActive: true,
  });

  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ['/api/admin/sites'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
      return await apiRequest('POST', '/api/admin/sites', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sites'] });
      toast({ title: t('sites.success'), description: t('sites.siteCreated') });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: t('sites.error'), description: t('sites.createFailed'), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SiteFormData> }) => {
      return await apiRequest('PATCH', `/api/admin/sites/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sites'] });
      toast({ title: t('sites.success'), description: t('sites.siteUpdated') });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: t('sites.error'), description: t('sites.updateFailed'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/sites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sites'] });
      toast({ title: t('sites.success'), description: t('sites.siteDeleted') });
    },
    onError: () => {
      toast({ title: t('sites.error'), description: t('sites.deleteFailed'), variant: "destructive" });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/sites/seed-defaults');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sites'] });
      toast({
        title: t('sites.success'),
        description: t('sites.seedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('sites.error'),
        description: error.message || t('sites.seedFailed'),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEditingSite(null);
    setSelectedLocation("Yens Head Office");
    setFormData({
      name: "",
      channelName: "",
      type: "stall",
      location: "",
      operatingDays: [],
      openTime: "09:00",
      closeTime: "21:00",
      isActive: true,
    });
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    const isPredefined = PREDEFINED_LOCATIONS.slice(0, -1).includes(site.location as any);
    setSelectedLocation(isPredefined ? site.location : "custom");
    setFormData({
      name: site.name,
      channelName: site.channelName,
      type: site.type as "stall" | "mobile_van",
      location: site.location,
      operatingDays: site.operatingDays || [],
      openTime: site.openTime || "09:00",
      closeTime: site.closeTime || "21:00",
      isActive: site.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (site: Site) => {
    if (confirm(t('sites.deleteConfirm', { name: site.name }))) {
      deleteMutation.mutate(site.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSite) {
      updateMutation.mutate({ id: editingSite.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleOperatingDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      operatingDays: prev.operatingDays.includes(day)
        ? prev.operatingDays.filter((d) => d !== day)
        : [...prev.operatingDays, day],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Branded header ── */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-yellow-400 rounded-xl p-3 shrink-0 shadow-lg">
            <MapPin className="h-5 w-5 text-blue-900" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black uppercase tracking-tight leading-none">{t('sites.title')}</h2>
            <p className="text-blue-300 text-[11px] font-bold uppercase tracking-[0.15em] mt-1.5 opacity-90">{t('sites.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sites.length < 5 && (
              <Button
                onClick={() => {
                  if (confirm(t('sites.seedConfirm'))) {
                    seedDefaultsMutation.mutate();
                  }
                }}
                variant="outline"
                className="border-white/30 text-white bg-transparent gap-2"
                disabled={seedDefaultsMutation.isPending}
                data-testid="button-seed-defaults"
              >
                {seedDefaultsMutation.isPending ? t('common.loading') : t('sites.seedDefaults')}
              </Button>
            )}
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className="bg-yellow-400 text-blue-900 font-bold gap-2"
              data-testid="button-add-site"
            >
              <Plus className="w-4 h-4" />
              {t('sites.addSite')}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="p-0 border-none shadow-2xl rounded-[2rem] max-w-2xl overflow-hidden">
          <div className="bg-blue-900 rounded-t-[2rem] p-6 flex items-center gap-4">
            <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
              <MapPin className="h-4 w-4 text-blue-900" />
            </div>
            <h2 className="text-base font-black uppercase tracking-tight text-white leading-none">
              {editingSite ? t('sites.editSite') : t('sites.addNewSite')}
            </h2>
          </div>
          <div className="max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('sites.siteName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('sites.siteNamePlaceholder')}
                  data-testid="input-site-name"
                />
              </div>
              <div>
                <Label htmlFor="channelName">{t('sites.channelName')} *</Label>
                <Input
                  id="channelName"
                  value={formData.channelName}
                  onChange={(e) => setFormData({ ...formData, channelName: e.target.value.toUpperCase() })}
                  required
                  placeholder={t('sites.channelNamePlaceholder')}
                  data-testid="input-channel-name"
                  maxLength={20}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">{t('sites.siteType')} *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "stall" | "mobile_van") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger data-testid="select-site-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stall">{t('sites.typeStall')}</SelectItem>
                    <SelectItem value="mobile_van">{t('sites.typeMobileVan')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div></div>
            </div>

            <div>
              <Label htmlFor="location">{t('sites.location')} *</Label>
              <Select
                value={selectedLocation}
                onValueChange={(value) => {
                  setSelectedLocation(value);
                  if (value !== "custom") {
                    setFormData({ ...formData, location: value });
                  }
                }}
              >
                <SelectTrigger data-testid="select-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yens Head Office">Yens Head Office</SelectItem>
                  <SelectItem value="River">River</SelectItem>
                  <SelectItem value="Market">Market</SelectItem>
                  <SelectItem value="custom">{t('sites.customLocation')}</SelectItem>
                </SelectContent>
              </Select>
              {selectedLocation === "custom" && (
                <Input
                  id="custom-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  placeholder={t('sites.locationPlaceholder')}
                  className="mt-2"
                  data-testid="input-custom-location"
                />
              )}
            </div>

            <div>
              <Label>{t('sites.operatingDays')} *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={formData.operatingDays.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleOperatingDay(day)}
                    data-testid={`button-day-${day}`}
                  >
                    {t(`sites.days.${day}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">{t('sites.operatingHoursStart')} *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.openTime}
                  onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                  required
                  data-testid="input-hours-start"
                />
              </div>
              <div>
                <Label htmlFor="endTime">{t('sites.operatingHoursEnd')} *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.closeTime}
                  onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                  required
                  data-testid="input-hours-end"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">{t('sites.isActive')}</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-blue-900/10 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-cancel"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-site"
              >
                {editingSite ? t('sites.update') : t('sites.create')}
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {sites.length === 0 ? (
        <Card className="border-none shadow-xl rounded-[2rem] bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-900/5 flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-blue-900/30" />
            </div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-sm">{t('sites.noSites')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card key={site.id} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-2xl transition-shadow" data-testid={`site-card-${site.id}`}>
              {/* Card top stripe */}
              <div className="bg-blue-900 px-6 pt-5 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase text-blue-400 tracking-[0.25em] mb-1">{site.type === "stall" ? "Fixed Stall" : "Mobile Van"}</p>
                    <h3 className="text-base font-black text-white uppercase tracking-tight truncate" data-testid={`text-site-name-${site.id}`}>{site.name}</h3>
                    <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mt-0.5">{site.channelName}</p>
                  </div>
                  <div className="shrink-0">
                    {site.isActive ? (
                      <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{t('sites.active')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('sites.inactive')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-blue-900" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">{site.location}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 text-blue-900" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">{site.openTime || "N/A"} – {site.closeTime || "N/A"}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-900" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(site.operatingDays || []).map((day) => (
                      <span key={day} className="text-[9px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                        {t(`sites.days.${day}`)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleEdit(site)}
                    variant="outline"
                    size="sm"
                    className="flex-1 font-black uppercase tracking-wide text-[10px] rounded-xl border-slate-200"
                    data-testid={`button-edit-${site.id}`}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    onClick={() => handleDelete(site)}
                    variant="outline"
                    size="sm"
                    className="flex-1 font-black uppercase tracking-wide text-[10px] rounded-xl border-red-100 text-red-500 hover:text-red-600"
                    data-testid={`button-delete-${site.id}`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
