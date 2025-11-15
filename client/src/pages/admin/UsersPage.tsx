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
import { UserPlus, Trash2, Shield, Users } from "lucide-react";
import { User } from "@shared/schema";


const roleColors = {
  admin: "bg-red-500 text-white",
  manager: "bg-blue-500 text-white",
  barista: "bg-green-500 text-white",
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "barista",
  });
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
                        <div className="flex items-center gap-2">
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
    </div>
  );
}
