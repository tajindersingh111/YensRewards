import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key, Shield, ShieldCheck, Download, DatabaseBackup, Github,
  Building2, Save, Loader2, CheckCircle2, Wrench,
} from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bizSettings, setBizSettings] = useState<Record<string, string>>({});
  const [bizDirty, setBizDirty] = useState(false);

  const { data: userStatus } = useQuery<{ hasPassword: boolean; twoFactorEnabled: boolean; qrCode?: string }>({
    queryKey: ['/api/auth/account-status'],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
  });

  useEffect(() => {
    if (settingsData && Object.keys(bizSettings).length === 0) {
      setBizSettings(settingsData);
    }
  }, [settingsData]);

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      return await apiRequest("POST", "/api/auth/set-password", {
        currentPassword: userStatus?.hasPassword ? currentPassword : undefined,
        newPassword,
      });
    },
    onSuccess: () => {
      toast({ title: "Security Protocol Updated", description: "Your administrative password has been changed." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/account-status'] });
    },
    onError: (error: any) => toast({ title: "Update Failed", description: error.message, variant: "destructive" }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      return await apiRequest("PUT", "/api/admin/settings", settings);
    },
    onSuccess: () => {
      setBizDirty(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: "System Parameters Saved", description: "Global business configurations have been updated." });
    },
    onError: () => {
      toast({ title: t('common.error'), description: "Failed to save settings", variant: "destructive" });
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/backup/run", {});
      return res as { success: boolean; message: string };
    },
    onSuccess: (data) => {
      toast({ title: "Backup Complete", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Backup Failed", description: error.message || "Could not back up data to GitHub", variant: "destructive" });
    },
  });

  const handleDownloadFile = (filename: string) => {
    window.location.href = `/api/admin/downloads/${filename}`;
    toast({ title: t('settings.downloadStarted'), description: t('settings.downloadStartedDesc') });
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* ── EXECUTIVE VAULT HEADER ── */}
      <div className="bg-blue-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="flex items-center gap-5 relative z-10">
          <div className="bg-yellow-400 rounded-2xl p-4 shadow-lg shrink-0 transform -rotate-3">
            <Shield className="h-6 w-6 text-blue-900" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">System Vault</h2>
            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-80">Security & Global Parameters</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="security" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm h-14 w-full max-w-md">
          <TabsTrigger
            value="security"
            data-testid="tab-security"
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-blue-900 data-[state=active]:text-yellow-400"
          >
            <Key className="w-3.5 h-3.5 mr-2" /> Auth
          </TabsTrigger>
          <TabsTrigger
            value="business"
            data-testid="tab-business"
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-blue-900 data-[state=active]:text-yellow-400"
          >
            <Building2 className="w-3.5 h-3.5 mr-2" /> Business
          </TabsTrigger>
          <TabsTrigger
            value="system"
            data-testid="tab-data"
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-blue-900 data-[state=active]:text-yellow-400"
          >
            <DatabaseBackup className="w-3.5 h-3.5 mr-2" /> Backup
          </TabsTrigger>
        </TabsList>

        {/* ── SECURITY / AUTH TAB ── */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100">
              <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">Administrative Credentials</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Logged in as <span className="text-blue-900">{user?.email || ''}</span>
              </p>
            </div>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {userStatus?.hasPassword && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="rounded-xl border-slate-100 font-bold"
                      data-testid="input-current-password"
                      placeholder="Current"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-xl border-slate-100 font-bold"
                    data-testid="input-new-password"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Confirm New</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-xl border-slate-100 font-bold"
                    data-testid="input-confirm-password"
                    placeholder="Confirm"
                  />
                </div>
              </div>
              <Button
                onClick={() => passwordMutation.mutate()}
                disabled={passwordMutation.isPending || !newPassword}
                className="bg-yellow-400 text-blue-900 font-black uppercase text-xs px-8 h-12 rounded-xl shadow-lg"
                data-testid="button-save-password"
              >
                {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Access Key
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardContent className="p-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="bg-blue-900/5 p-4 rounded-2xl shrink-0">
                  <ShieldCheck className="w-6 h-6 text-blue-900" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-blue-900 uppercase">Two-Factor Authentication</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Layer Security Protocol</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {userStatus?.twoFactorEnabled ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-1.5 rounded-full font-black text-[9px] uppercase">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Enabled
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1.5 rounded-full font-black text-[9px] uppercase">
                    Highly Recommended
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BUSINESS TAB ── */}
        <TabsContent value="business" className="space-y-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Shop Name (Display)</Label>
                    <Input
                      value={bizSettings['shop_name'] || ""}
                      onChange={(e) => { setBizSettings({ ...bizSettings, shop_name: e.target.value }); setBizDirty(true); }}
                      className="rounded-2xl border-slate-100 font-black text-blue-900 uppercase"
                      data-testid="input-shop-name"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Protocol (LINE ID)</Label>
                    <Input
                      value={bizSettings['contact_line'] || ""}
                      onChange={(e) => { setBizSettings({ ...bizSettings, contact_line: e.target.value }); setBizDirty(true); }}
                      className="rounded-2xl border-slate-100 font-bold"
                      data-testid="input-contact-line"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Phone</Label>
                    <Input
                      value={bizSettings['shop_phone'] || ""}
                      onChange={(e) => { setBizSettings({ ...bizSettings, shop_phone: e.target.value }); setBizDirty(true); }}
                      className="rounded-2xl border-slate-100 font-bold"
                      data-testid="input-shop-phone"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Email</Label>
                    <Input
                      type="email"
                      value={bizSettings['shop_email'] || ""}
                      onChange={(e) => { setBizSettings({ ...bizSettings, shop_email: e.target.value }); setBizDirty(true); }}
                      className="rounded-2xl border-slate-100 font-bold"
                      data-testid="input-shop-email"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Points per ฿100 Spent</Label>
                    <Input
                      type="number"
                      min="1"
                      value={bizSettings['points_per_100_baht'] || ""}
                      onChange={(e) => { setBizSettings({ ...bizSettings, points_per_100_baht: e.target.value }); setBizDirty(true); }}
                      className="rounded-2xl border-slate-100 font-bold"
                      data-testid="input-points-per-100"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Annual Revenue Target (฿)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={bizSettings['annual_revenue_target'] || ""}
                      onChange={(e) => { setBizSettings({ ...bizSettings, annual_revenue_target: e.target.value }); setBizDirty(true); }}
                      className="rounded-2xl border-slate-100 font-bold"
                      data-testid="input-annual-revenue-target"
                    />
                  </div>
                </div>

                {bizDirty && (
                  <Button
                    onClick={() => updateSettingsMutation.mutate(bizSettings)}
                    disabled={updateSettingsMutation.isPending}
                    className="w-full bg-blue-900 text-yellow-400 font-black uppercase h-14 rounded-2xl shadow-2xl"
                    data-testid="button-save-business-settings"
                  >
                    {updateSettingsMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <Save className="w-4 h-4 mr-2" />}
                    Commit Global Changes
                  </Button>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── BACKUP TAB ── */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 group transition-all duration-500">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-blue-900/5 p-5 rounded-3xl transition-colors">
                  <DatabaseBackup className="w-8 h-8 text-blue-900" />
                </div>
                <h3 className="font-black text-blue-900 uppercase tracking-tight">GitHub + Sheets Backup</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Sales & customers → GitHub <span className="font-mono">backups/</span> + Google Sheets in your Drive
                </p>
                <Button
                  onClick={() => backupMutation.mutate()}
                  disabled={backupMutation.isPending}
                  className="w-full bg-yellow-400 text-blue-900 font-black uppercase text-[10px] h-12 rounded-xl shadow-lg"
                  data-testid="button-run-backup"
                >
                  {backupMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Backing Up...</>
                    : <><DatabaseBackup className="w-3.5 h-3.5 mr-2" /> Back Up Now</>}
                </Button>
              </div>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 group transition-all duration-500">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-slate-100 p-5 rounded-3xl transition-colors">
                  <Github className="w-8 h-8 text-slate-900" />
                </div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Failed Records Export</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Download CSV of customer records that failed to import
                </p>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadFile('failed_customers_export.csv')}
                  className="w-full font-black uppercase text-[10px] h-12 rounded-xl border-slate-200"
                  data-testid="button-download-failed-customers"
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> Download CSV
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
