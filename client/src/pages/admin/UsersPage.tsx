import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Users, Pencil, Lock, ShieldCheck, ShieldOff } from "lucide-react";
import { User } from "@shared/schema";
import QRCodeSVG from "react-qr-code";


const roleColors = {
  admin: "bg-red-500 text-white",
  manager: "bg-blue-500 text-white",
  barista: "bg-green-500 text-white",
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingDetailsUser, setEditingDetailsUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [twoFAUser, setTwoFAUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "barista",
  });
  const [editDetails, setEditDetails] = useState({
    email: "",
    firstName: "",
    lastName: "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAUri, setTwoFAUri] = useState("");
  const [twoFAToken, setTwoFAToken] = useState("");
  const [twoFAStep, setTwoFAStep] = useState<"setup" | "verify">("setup");
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return await apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.users.userCreated"),
        description: t("admin.users.userCreatedDesc"),
      });
      setAddDialogOpen(false);
      setNewUser({ email: "", firstName: "", lastName: "", role: "barista" });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.userCreateFailed"),
        description: error.message || t("admin.users.genericError"),
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.users.roleUpdated"),
        description: t("admin.users.roleUpdatedDesc"),
      });
      setEditingUser(null);
      setEditingRole("");
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.roleUpdateFailed"),
        description: error.message || t("admin.users.genericError"),
        variant: "destructive",
      });
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: async ({ id, details }: { id: string; details: typeof editDetails }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}/details`, details);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.users.detailsUpdated"),
        description: t("admin.users.detailsUpdatedDesc"),
      });
      setEditingDetailsUser(null);
    },
    onError: (error: any) => {
      const errorMessage = error.message?.includes("already in use") 
        ? t("admin.users.emailInUse")
        : error.message || t("admin.users.genericError");
      toast({
        title: t("admin.users.detailsUpdateFailed"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.users.userDeleted"),
        description: t("admin.users.userDeletedDesc"),
      });
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.userDeleteFailed"),
        description: error.message || t("admin.users.genericError"),
        variant: "destructive",
      });
    },
  });

  // Password management mutation
  const setPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return await apiRequest("POST", `/api/admin/users/${id}/password`, { password });
    },
    onSuccess: () => {
      toast({
        title: t("admin.users.passwordSet"),
        description: t("admin.users.passwordSetDesc"),
      });
      setPasswordUser(null);
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.passwordSetFailed"),
        description: error.message || t("admin.users.genericError"),
        variant: "destructive",
      });
    },
  });

  // 2FA setup mutation (get QR code)
  const setup2FAMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/users/${id}/2fa/setup`, {});
    },
    onSuccess: (data: any) => {
      setTwoFASecret(data.secret);
      setTwoFAUri(data.uri);
      setTwoFAStep("verify");
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.twoFASetupFailed"),
        description: error.message || t("admin.users.genericError"),
        variant: "destructive",
      });
    },
  });

  // Enable 2FA mutation (with verification)
  const enable2FAMutation = useMutation({
    mutationFn: async ({ id, secret, token }: { id: string; secret: string; token: string }) => {
      return await apiRequest("POST", `/api/admin/users/${id}/2fa/enable`, { secret, token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.users.twoFAEnabled"),
        description: t("admin.users.twoFAEnabledDesc"),
      });
      setTwoFAUser(null);
      setTwoFASecret("");
      setTwoFAUri("");
      setTwoFAToken("");
      setTwoFAStep("setup");
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.twoFAEnableFailed"),
        description: error.message || t("admin.users.genericError"),
        variant: "destructive",
      });
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/users/${id}/2fa/disable`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t("admin.users.twoFADisabled"),
        description: t("admin.users.twoFADisabledDesc"),
      });
      setTwoFAUser(null);
    },
    onError: (error: any) => {
      toast({
        title: t("admin.users.twoFADisableFailed"),
        description: error.message || t("admin.users.genericError"),
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.role) {
      toast({
        title: t("admin.users.validationError"),
        description: t("admin.users.emailRoleRequired"),
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newUser);
  };

  const [editingRole, setEditingRole] = useState<string>("");

  const handleUpdateRole = () => {
    if (editingUser && editingRole) {
      updateRoleMutation.mutate({ id: editingUser.id, role: editingRole });
    }
  };

  const handleUpdateDetails = () => {
    if (editingDetailsUser && editDetails.email) {
      updateDetailsMutation.mutate({ id: editingDetailsUser.id, details: editDetails });
    }
  };

  const handleSetPassword = () => {
    if (!password || password.length < 8) {
      toast({
        title: t("admin.users.validationError"),
        description: t("admin.users.passwordMinLength"),
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: t("admin.users.validationError"),
        description: t("admin.users.passwordMismatch"),
        variant: "destructive",
      });
      return;
    }
    if (passwordUser) {
      setPasswordMutation.mutate({ id: passwordUser.id, password });
    }
  };

  const handleSetup2FA = () => {
    if (twoFAUser) {
      setup2FAMutation.mutate(twoFAUser.id);
    }
  };

  const handleEnable2FA = () => {
    if (!twoFAToken || twoFAToken.length !== 6) {
      toast({
        title: t("admin.users.validationError"),
        description: t("admin.users.invalidToken"),
        variant: "destructive",
      });
      return;
    }
    if (twoFAUser && twoFASecret) {
      enable2FAMutation.mutate({ 
        id: twoFAUser.id, 
        secret: twoFASecret, 
        token: twoFAToken 
      });
    }
  };

  const handleDisable2FA = () => {
    if (twoFAUser) {
      disable2FAMutation.mutate(twoFAUser.id);
    }
  };

  // Password strength checker
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, text: "", color: "" };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 1, text: t("admin.users.passwordWeak"), color: "text-red-500" };
    if (strength <= 3) return { strength: 2, text: t("admin.users.passwordMedium"), color: "text-yellow-500" };
    return { strength: 3, text: t("admin.users.passwordStrong"), color: "text-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.users.subtitle")}</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <UserPlus className="w-4 h-4 mr-2" />
              {t("admin.users.addUser")}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-user">
            <DialogHeader>
              <DialogTitle>{t("admin.users.addUserTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.addUserDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("admin.users.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("admin.users.emailPlaceholder")}
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("admin.users.firstNameLabel")}</Label>
                <Input
                  id="firstName"
                  placeholder={t("admin.users.firstNamePlaceholder")}
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  data-testid="input-firstName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("admin.users.lastNameLabel")}</Label>
                <Input
                  id="lastName"
                  placeholder={t("admin.users.lastNamePlaceholder")}
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  data-testid="input-lastName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t("admin.users.roleLabel")}</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger id="role" data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("admin.users.roleAdmin")}</SelectItem>
                    <SelectItem value="manager">{t("admin.users.roleManager")}</SelectItem>
                    <SelectItem value="barista">{t("admin.users.roleBarista")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                data-testid="button-cancel"
              >
                {t("admin.users.cancel")}
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={createMutation.isPending}
                data-testid="button-create-user"
              >
                {createMutation.isPending ? t("admin.users.creating") : t("admin.users.createUser")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("admin.users.noUsers")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.users.noUsersDesc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t("admin.users.user")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t("admin.users.email")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t("admin.users.role")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t("admin.users.created")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{t("admin.users.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || (user.email ? user.email[0].toUpperCase() : "U");
                  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown User";
                  
                  return (
                    <tr key={user.id} className="border-b hover-elevate" data-testid={`row-user-${user.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.profileImageUrl || undefined} alt={fullName} />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-foreground">{user.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                          {t(`admin.users.role${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` as any)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground text-sm">
                          {new Date(user.createdAt!).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingDetailsUser(user);
                              setEditDetails({
                                email: user.email || "",
                                firstName: user.firstName || "",
                                lastName: user.lastName || "",
                              });
                            }}
                            data-testid={`button-edit-details-${user.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            {t("admin.users.editDetails")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                            data-testid={`button-edit-role-${user.id}`}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            {t("admin.users.changeRole")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPasswordUser(user)}
                            data-testid={`button-set-password-${user.id}`}
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            {t("admin.users.setPassword")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTwoFAUser(user);
                              setTwoFAStep("setup");
                              setTwoFASecret("");
                              setTwoFAUri("");
                              setTwoFAToken("");
                            }}
                            data-testid={`button-2fa-${user.id}`}
                          >
                            {user.twoFactorEnabled ? (
                              <>
                                <ShieldOff className="w-4 h-4 mr-1" />
                                {t("admin.users.disable2FA")}
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4 mr-1" />
                                {t("admin.users.setup2FA")}
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeletingUser(user)}
                            data-testid={`button-delete-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Role Dialog */}
      <Dialog 
        open={!!editingUser} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
            setEditingRole("");
          } else if (editingUser) {
            setEditingRole(editingUser.role);
          }
        }}
      >
        <DialogContent data-testid="dialog-edit-role">
          <DialogHeader>
            <DialogTitle>{t("admin.users.editRoleTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.editRoleDesc", { email: editingUser?.email })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editRole">{t("admin.users.role")}</Label>
              <Select
                value={editingRole || editingUser?.role}
                onValueChange={setEditingRole}
              >
                <SelectTrigger id="editRole" data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("admin.users.roleAdmin")}</SelectItem>
                  <SelectItem value="manager">{t("admin.users.roleManager")}</SelectItem>
                  <SelectItem value="barista">{t("admin.users.roleBarista")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingUser(null);
                setEditingRole("");
              }}
              data-testid="button-cancel-edit"
            >
              {t("admin.users.cancel")}
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending || !editingRole}
              data-testid="button-save-role"
            >
              {updateRoleMutation.isPending ? t("admin.users.updating") : t("admin.users.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog 
        open={!!editingDetailsUser} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingDetailsUser(null);
          }
        }}
      >
        <DialogContent data-testid="dialog-edit-details">
          <DialogHeader>
            <DialogTitle>{t("admin.users.editDetailsTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.editDetailsDesc", { email: editingDetailsUser?.email })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEmail">{t("admin.users.emailLabel")}</Label>
              <Input
                id="editEmail"
                type="email"
                value={editDetails.email}
                onChange={(e) => setEditDetails({ ...editDetails, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFirstName">{t("admin.users.firstNameLabel")}</Label>
              <Input
                id="editFirstName"
                value={editDetails.firstName}
                onChange={(e) => setEditDetails({ ...editDetails, firstName: e.target.value })}
                data-testid="input-edit-firstName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLastName">{t("admin.users.lastNameLabel")}</Label>
              <Input
                id="editLastName"
                value={editDetails.lastName}
                onChange={(e) => setEditDetails({ ...editDetails, lastName: e.target.value })}
                data-testid="input-edit-lastName"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingDetailsUser(null)}
              data-testid="button-cancel-edit-details"
            >
              {t("admin.users.cancel")}
            </Button>
            <Button
              onClick={handleUpdateDetails}
              disabled={updateDetailsMutation.isPending || !editDetails.email}
              data-testid="button-save-details"
            >
              {updateDetailsMutation.isPending ? t("admin.users.updating") : t("admin.users.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.deleteDesc", { email: deletingUser?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("admin.users.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("admin.users.deleting") : t("admin.users.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Password Dialog */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => {
        if (!open) {
          setPasswordUser(null);
          setPassword("");
          setConfirmPassword("");
        }
      }}>
        <DialogContent data-testid="dialog-set-password">
          <DialogHeader>
            <DialogTitle>{t("admin.users.setPasswordTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.setPasswordDesc", { email: passwordUser?.email })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("admin.users.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("admin.users.passwordPlaceholder")}
                data-testid="input-password"
              />
              {password && (
                <p className={`text-sm ${passwordStrength.color}`}>
                  {t("admin.users.strength")}: {passwordStrength.text}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("admin.users.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("admin.users.confirmPasswordPlaceholder")}
                data-testid="input-confirm-password"
                className={confirmPassword && password !== confirmPassword ? "border-destructive" : ""}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive" data-testid="error-password-mismatch">
                  {t("admin.users.passwordMismatch")}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("admin.users.passwordRequirements")}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordUser(null);
                setPassword("");
                setConfirmPassword("");
              }}
              data-testid="button-cancel-password"
            >
              {t("admin.users.cancel")}
            </Button>
            <Button
              onClick={handleSetPassword}
              disabled={
                setPasswordMutation.isPending || 
                !password || 
                !confirmPassword || 
                password !== confirmPassword ||
                password.length < 8
              }
              data-testid="button-save-password"
            >
              {setPasswordMutation.isPending ? t("admin.users.setting") : t("admin.users.setPassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Management Dialog */}
      <Dialog open={!!twoFAUser} onOpenChange={(open) => {
        if (!open) {
          setTwoFAUser(null);
          setTwoFASecret("");
          setTwoFAUri("");
          setTwoFAToken("");
          setTwoFAStep("setup");
        }
      }}>
        <DialogContent data-testid="dialog-2fa">
          <DialogHeader>
            <DialogTitle>
              {twoFAUser?.twoFactorEnabled ? t("admin.users.disable2FATitle") : t("admin.users.setup2FATitle")}
            </DialogTitle>
            <DialogDescription>
              {twoFAUser?.twoFactorEnabled 
                ? t("admin.users.disable2FADesc", { email: twoFAUser?.email })
                : t("admin.users.setup2FADesc", { email: twoFAUser?.email })
              }
            </DialogDescription>
          </DialogHeader>
          
          {twoFAUser?.twoFactorEnabled ? (
            /* Disable 2FA */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("admin.users.disable2FAWarning")}
              </p>
            </div>
          ) : twoFAStep === "setup" ? (
            /* Step 1: Initiate Setup */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("admin.users.twoFAInstructions")}
              </p>
            </div>
          ) : (
            /* Step 2: Verify and Enable */
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-md">
                {twoFAUri && <QRCodeSVG value={twoFAUri} size={200} />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="twoFAToken">{t("admin.users.verificationCode")}</Label>
                <Input
                  id="twoFAToken"
                  type="text"
                  value={twoFAToken}
                  onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  data-testid="input-2fa-token"
                />
                <p className="text-sm text-muted-foreground">
                  {t("admin.users.scanQRCode")}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTwoFAUser(null);
                setTwoFASecret("");
                setTwoFAUri("");
                setTwoFAToken("");
                setTwoFAStep("setup");
              }}
              data-testid="button-cancel-2fa"
            >
              {t("admin.users.cancel")}
            </Button>
            {twoFAUser?.twoFactorEnabled ? (
              <Button
                onClick={handleDisable2FA}
                disabled={disable2FAMutation.isPending}
                variant="destructive"
                data-testid="button-confirm-disable-2fa"
              >
                {disable2FAMutation.isPending ? t("admin.users.disabling") : t("admin.users.disable2FA")}
              </Button>
            ) : twoFAStep === "setup" ? (
              <Button
                onClick={handleSetup2FA}
                disabled={setup2FAMutation.isPending}
                data-testid="button-setup-2fa"
              >
                {setup2FAMutation.isPending ? t("admin.users.generating") : t("admin.users.generateQR")}
              </Button>
            ) : (
              <Button
                onClick={handleEnable2FA}
                disabled={enable2FAMutation.isPending || !twoFAToken || twoFAToken.length !== 6}
                data-testid="button-enable-2fa"
              >
                {enable2FAMutation.isPending ? t("admin.users.enabling") : t("admin.users.enable2FA")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
