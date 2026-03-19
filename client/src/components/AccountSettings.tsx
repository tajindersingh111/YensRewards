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
import { CheckCircle2, AlertCircle, Key, Shield, Download, FileText } from "lucide-react";

export default function AccountSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);

  // Check if user has password set
  const { data: userStatus } = useQuery<{ hasPassword: boolean; twoFactorEnabled: boolean; qrCode?: string }>({
    queryKey: ['/api/auth/account-status'],
  });

  // Set/update password mutation
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

  // Enable 2FA mutation
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

  // Verify 2FA mutation
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

  // Disable 2FA mutation
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
      title: "Download Started",
      description: "Your file download has started.",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t('admin.settings.account')}</h2>
        <p className="text-xs text-muted-foreground">{t('admin.settings.accountSubtitle')}</p>
      </div>

      {/* Data Downloads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Downloads
          </CardTitle>
          <CardDescription>
            Export and download customer data files for analysis or backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="font-medium">Failed Customer Records</p>
                <p className="text-sm text-muted-foreground">
                  133 customer records that failed to import
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleDownloadFile('failed_customers_export.csv')}
              size="sm"
              data-testid="button-download-failed-customers"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Download the CSV file, fix any errors (phone numbers, email typos, etc.), and re-upload via the Customers tab → CSV Import feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('admin.settings.baristaAccess')}
              </CardTitle>
              <CardDescription>{t('admin.settings.baristaAccessDesc')}</CardDescription>
            </div>
            {userStatus?.hasPassword && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t('admin.settings.passwordIsSet')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {userStatus?.hasPassword 
                ? `Use this email and password to sign into the Barista app: ${user?.email || ''}`
                : `Set a password to access the Barista app with your email: ${user?.email || ''}`
              }
            </AlertDescription>
          </Alert>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Email Display (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
                data-testid="input-email-readonly"
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.settings.emailHelp')}
              </p>
            </div>
            {userStatus?.hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('admin.settings.currentPassword')}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required={userStatus?.hasPassword}
                  data-testid="input-current-password"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">{t('admin.settings.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                data-testid="input-new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('admin.settings.confirmPassword')}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              type="submit"
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
        </CardContent>
      </Card>

      {/* 2FA Section - Only show if password is set */}
      {userStatus?.hasPassword && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('admin.settings.twoFactorSetup')}
                </CardTitle>
                <CardDescription>{t('admin.settings.enable2FA')}</CardDescription>
              </div>
              {userStatus?.twoFactorEnabled && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Enabled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!userStatus?.twoFactorEnabled && !showQRCode && (
              <Button
                onClick={() => enable2FAMutation.mutate()}
                disabled={enable2FAMutation.isPending}
                data-testid="button-enable-2fa"
              >
                {enable2FAMutation.isPending ? t('common.loading') : t('admin.settings.enable2FA')}
              </Button>
            )}

            {showQRCode && userStatus?.qrCode && (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={userStatus.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {t('admin.settings.scanQR')}
                </p>
                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="2fa-code">{t('admin.settings.enterCode')}</Label>
                    <Input
                      id="2fa-code"
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      required
                      maxLength={6}
                      placeholder="000000"
                      data-testid="input-2fa-code"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={verify2FAMutation.isPending}
                    data-testid="button-verify-2fa"
                  >
                    {verify2FAMutation.isPending ? t('common.loading') : t('admin.settings.verify')}
                  </Button>
                </form>
              </div>
            )}

            {userStatus?.twoFactorEnabled && (
              <Button
                variant="destructive"
                onClick={() => disable2FAMutation.mutate()}
                disabled={disable2FAMutation.isPending}
                data-testid="button-disable-2fa"
              >
                {disable2FAMutation.isPending ? t('common.loading') : t('admin.settings.disable2FA')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
