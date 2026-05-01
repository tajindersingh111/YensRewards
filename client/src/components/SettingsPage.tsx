import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, AlertCircle, Key, Shield, Download, FileText, ChevronDown, ChevronUp, Wrench, CheckCircle, Loader2, Building2, Save } from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  // Business settings state
  const [bizSettings, setBizSettings] = useState<Record<string, string>>({});
  const [bizDirty, setBizDirty] = useState(false);

  const { data: userStatus } = useQuery<{ hasPassword: boolean; twoFactorEnabled: boolean; qrCode?: string }>({
    queryKey: ['/api/auth/account-status'],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ['/api/admin/settings'],
    select: (data) => data,
  });

  // Merge server data with local edits on first load
  const effectiveSettings = { ...(settingsData || {}), ...bizSettings };

  const saveSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => apiRequest('PUT', '/api/admin/settings', updates),
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('admin.settings.businessSaved', 'Business settings saved') });
      setBizDirty(false);
      setBizSettings({});
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('admin.settings.saveFailed', 'Failed to save settings'), variant: 'destructive' });
    },
  });

  const handleBizChange = (key: string, value: string) => {
    setBizSettings(prev => ({ ...prev, [key]: value }));
    setBizDirty(true);
  };

  const handleBizSave = () => {
    const merged = { ...(settingsData || {}), ...bizSettings };
    saveSettingsMutation.mutate(merged);
  };

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword?: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/auth/set-password", data);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: userStatus?.hasPassword ? t('admin.settings.passwordUpdated') : t('admin.settings.passwordSet'),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/account-status'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('admin.settings.passwordFailed'),
        variant: "destructive",
      });
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: async () => {
      const response: any = await apiRequest("POST", "/api/auth/setup-2fa", {});
      return response;
    },
    onSuccess: (data) => {
      setShowQRCode(true);
      queryClient.setQueryData(['/api/auth/account-status'], (old: any) => ({
        ...old,
        qrCode: data.qrCode,
      }));
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('admin.settings.twoFactorFailed'),
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (token: string) => {
      return await apiRequest("POST", "/api/auth/verify-2fa-setup", { token });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('admin.settings.twoFactorEnabled'),
      });
      setShowQRCode(false);
      setTwoFactorCode("");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/account-status'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('admin.settings.twoFactorFailed'),
        variant: "destructive",
      });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/disable-2fa", {});
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('admin.settings.twoFactorDisabled'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/account-status'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('admin.settings.twoFactorFailed'),
        variant: "destructive",
      });
    },
  });

  // Data maintenance mutations
  const fixDayOfWeekMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/sales/fix-day-of-week');
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sales-tracker-metrics'] });
      toast({
        title: "Data Fixed!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateTotalsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/sales/validate-totals', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to validate');
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.isValid ? "Totals Match!" : "Totals Mismatch",
        description: data.message,
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('admin.settings.passwordMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: t('common.error'),
        description: t('admin.settings.passwordTooShort'),
        variant: "destructive",
      });
      return;
    }

    passwordMutation.mutate({
      currentPassword: userStatus?.hasPassword ? currentPassword : undefined,
      newPassword,
    });
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    verify2FAMutation.mutate(twoFactorCode);
  };

  const handleDownloadFile = (filename: string) => {
    window.location.href = `/api/admin/downloads/${filename}`;
    toast({
      title: t('admin.settings.downloadStarted'),
      description: t('admin.settings.downloadStartedDesc'),
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold">{t('admin.settings.title')}</h2>
        <p className="text-muted-foreground">{t('admin.settings.pageDescription')}</p>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="business" className="flex items-center gap-2" data-testid="tab-business">
            <Building2 className="h-4 w-4" />
            {t('admin.settings.tabBusiness', 'Business')}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2" data-testid="tab-security">
            <Shield className="h-4 w-4" />
            {t('admin.settings.tabSecurity')}
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2" data-testid="tab-data">
            <Download className="h-4 w-4" />
            {t('admin.settings.tabData')}
          </TabsTrigger>
        </TabsList>

        {/* ── Business Settings Tab ── */}
        <TabsContent value="business" className="space-y-4">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Revenue Target */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('admin.settings.revenueTarget', 'Annual Revenue Target')}</CardTitle>
                  <CardDescription>{t('admin.settings.revenueTargetDesc', 'Used for the break-even chart and goal tracking')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="annual_revenue_target">{t('admin.settings.annualTarget', 'Annual Target (฿)')}</Label>
                    <Input
                      id="annual_revenue_target"
                      type="number"
                      min="0"
                      value={effectiveSettings['annual_revenue_target'] || ''}
                      onChange={e => handleBizChange('annual_revenue_target', e.target.value)}
                      data-testid="input-annual-revenue-target"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Loyalty Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('admin.settings.loyaltyPoints', 'Loyalty Points')}</CardTitle>
                  <CardDescription>{t('admin.settings.loyaltyPointsDesc', 'How points are earned per purchase')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="points_per_100_baht">{t('admin.settings.pointsPer100', 'Points earned per ฿100 spent')}</Label>
                    <Input
                      id="points_per_100_baht"
                      type="number"
                      min="1"
                      value={effectiveSettings['points_per_100_baht'] || ''}
                      onChange={e => handleBizChange('points_per_100_baht', e.target.value)}
                      data-testid="input-points-per-100"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tier Thresholds */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('admin.settings.tierThresholds', 'Tier Thresholds')}</CardTitle>
                  <CardDescription>{t('admin.settings.tierThresholdsDesc', 'Minimum lifetime points required for each tier')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'tier_silver_threshold', label: t('tiers.silver', 'Silver') },
                    { key: 'tier_gold_threshold', label: t('tiers.gold', 'Gold') },
                    { key: 'tier_platinum_threshold', label: t('tiers.platinum', 'Platinum') },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label} ({t('admin.settings.minPoints', 'min points')})</Label>
                      <Input
                        id={key}
                        type="number"
                        min="0"
                        value={effectiveSettings[key] || ''}
                        onChange={e => handleBizChange(key, e.target.value)}
                        data-testid={`input-${key}`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Shop Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('admin.settings.shopInfo', 'Shop Info')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop_name">{t('admin.settings.shopName', 'Shop Name')}</Label>
                    <Input
                      id="shop_name"
                      value={effectiveSettings['shop_name'] || ''}
                      onChange={e => handleBizChange('shop_name', e.target.value)}
                      data-testid="input-shop-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop_phone">{t('admin.settings.shopPhone', 'Contact Phone')}</Label>
                    <Input
                      id="shop_phone"
                      value={effectiveSettings['shop_phone'] || ''}
                      onChange={e => handleBizChange('shop_phone', e.target.value)}
                      data-testid="input-shop-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop_email">{t('admin.settings.shopEmail', 'Contact Email')}</Label>
                    <Input
                      id="shop_email"
                      type="email"
                      value={effectiveSettings['shop_email'] || ''}
                      onChange={e => handleBizChange('shop_email', e.target.value)}
                      data-testid="input-shop-email"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleBizSave}
                  disabled={!bizDirty || saveSettingsMutation.isPending}
                  data-testid="button-save-business-settings"
                >
                  {saveSettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {t('common.save', 'Save Changes')}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Key className="h-5 w-5" />
                    {t('admin.settings.baristaAccess')}
                  </CardTitle>
                  <CardDescription className="text-sm">{t('admin.settings.baristaAccessDesc')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {userStatus?.hasPassword && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Set
                    </Badge>
                  )}
                  {userStatus?.twoFactorEnabled && (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                      <Shield className="h-3 w-3" />
                      2FA
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                Login: <span className="font-medium text-foreground">{user?.email || ''}</span>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {userStatus?.hasPassword && (
                    <div className="space-y-1">
                      <Label htmlFor="current-password" className="text-xs">{t('admin.settings.currentPassword')}</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required={userStatus?.hasPassword}
                        data-testid="input-current-password"
                        placeholder="Current"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="new-password" className="text-xs">{t('admin.settings.newPassword')}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-new-password"
                      placeholder="New (min 8 chars)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm-password" className="text-xs">{t('admin.settings.confirmPassword')}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-confirm-password"
                      placeholder="Confirm"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={passwordMutation.isPending}
                  data-testid="button-save-password"
                >
                  {passwordMutation.isPending
                    ? t('common.loading')
                    : userStatus?.hasPassword
                    ? t('admin.settings.updatePassword')
                    : t('admin.settings.setPassword')}
                </Button>
              </form>

              {userStatus?.hasPassword && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {t('admin.settings.twoFactorSetup')}
                      </h4>
                      <p className="text-xs text-muted-foreground">{t('admin.settings.enable2FA')}</p>
                    </div>
                    {!userStatus?.twoFactorEnabled && !showQRCode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enable2FAMutation.mutate()}
                        disabled={enable2FAMutation.isPending}
                        data-testid="button-enable-2fa"
                      >
                        {enable2FAMutation.isPending ? t('common.loading') : 'Enable 2FA'}
                      </Button>
                    )}
                    {userStatus?.twoFactorEnabled && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => disable2FAMutation.mutate()}
                        disabled={disable2FAMutation.isPending}
                        data-testid="button-disable-2fa"
                      >
                        {disable2FAMutation.isPending ? t('common.loading') : 'Disable 2FA'}
                      </Button>
                    )}
                  </div>

                  {showQRCode && userStatus?.qrCode && (
                    <div className="mt-4 space-y-3 p-4 bg-muted rounded-lg">
                      <div className="flex justify-center">
                        <img src={userStatus.qrCode} alt="2FA QR Code" className="w-32 h-32 bg-white p-2 rounded" />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        {t('admin.settings.scanQR')}
                      </p>
                      <form onSubmit={handleVerify2FA} className="flex gap-2">
                        <Input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          required
                          maxLength={6}
                          placeholder="Enter 6-digit code"
                          data-testid="input-2fa-code"
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={verify2FAMutation.isPending}
                          data-testid="button-verify-2fa"
                        >
                          {verify2FAMutation.isPending ? '...' : 'Verify'}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {t('admin.settings.dataDownloads')}
              </CardTitle>
              <CardDescription>
                {t('admin.settings.dataDownloadsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="font-medium">{t('admin.settings.failedRecords')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.settings.failedRecordsDesc')}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownloadFile('failed_customers_export.csv')}
                  size="sm"
                  data-testid="button-download-failed-customers"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('admin.settings.downloadCSV')}
                </Button>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('admin.settings.downloadTip')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Data Maintenance Section */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Data Maintenance
              </CardTitle>
              <CardDescription>
                Tools for validating and repairing sales data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium">Verify Totals</p>
                    <p className="text-sm text-muted-foreground">
                      Check if day-of-week totals match YTD sales total
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => validateTotalsMutation.mutate()}
                  disabled={validateTotalsMutation.isPending}
                  size="sm"
                  variant="outline"
                  data-testid="button-verify-totals"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {validateTotalsMutation.isPending ? 'Checking...' : 'Verify'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
                <div className="flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-medium">Fix Day of Week Data</p>
                    <p className="text-sm text-muted-foreground">
                      Auto-calculate missing day-of-week values from dates
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => fixDayOfWeekMutation.mutate()}
                  disabled={fixDayOfWeekMutation.isPending}
                  size="sm"
                  variant="outline"
                  data-testid="button-fix-data"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  {fixDayOfWeekMutation.isPending ? 'Fixing...' : 'Fix Data'}
                </Button>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Use these tools if you notice discrepancies in your sales data after importing from Excel.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
