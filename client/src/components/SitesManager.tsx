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
  "custom", // Option to enter custom location
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
        description: t('sites.seedSuccess')
      });
    },
    onError: (error: any) => {
      toast({ 
        title: t('sites.error'), 
        description: error.message || t('sites.seedFailed'),
        variant: "destructive" 
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
    // Check if location matches a predefined option
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
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('sites.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('sites.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {sites.length < 5 && (
            <Button
              onClick={() => {
                if (confirm(t('sites.seedConfirm'))) {
                  seedDefaultsMutation.mutate();
                }
              }}
              variant="outline"
              className="gap-2"
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
            className="gap-2"
            data-testid="button-add-site"
          >
            <Plus className="w-4 h-4" />
            {t('sites.addSite')}
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSite ? t('sites.editSite') : t('sites.addNewSite')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  // Auto-populate location field for predefined options
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
                  onChange={(e) =>
                    setFormData({ ...formData, openTime: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, closeTime: e.target.value })
                  }
                  required
                  data-testid="input-hours-end"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">{t('sites.isActive')}</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-cancel"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-site"
              >
                {editingSite ? t('sites.update') : t('sites.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('sites.noSites')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card key={site.id} className="overflow-hidden border-2 border-yellow-400" data-testid={`site-card-${site.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`text-site-name-${site.id}`}>
                      {site.name}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                      {site.channelName}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Badge
                      variant={site.type === "stall" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {t(`sites.type${site.type === "stall" ? "Stall" : "MobileVan"}`)}
                    </Badge>
                    {site.isActive ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {t('sites.active')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                        {t('sites.inactive')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{site.location}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {site.openTime || "N/A"} - {site.closeTime || "N/A"}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {(site.operatingDays || []).map((day) => (
                      <Badge key={day} variant="outline" className="text-xs">
                        {t(`sites.days.${day}`)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleEdit(site)}
                    variant="outline"
                    size="sm"
                    className="flex-1 hover-elevate active-elevate-2"
                    data-testid={`button-edit-${site.id}`}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    onClick={() => handleDelete(site)}
                    variant="outline"
                    size="sm"
                    className="flex-1 hover-elevate active-elevate-2"
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
