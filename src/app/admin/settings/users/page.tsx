// src/app/admin/settings/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Clock,
  Mail,
  Loader2,
  Save,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Plus
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: "orders" | "products" | "customers" | "marketing" | "settings" | "analytics";
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault?: boolean;
}

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  twoFactorEnabled: boolean;
  createdAt: string;
}

const defaultPermissions: Permission[] = [
  // Commandes
  {
    id: "view_orders",
    name: "Voir les commandes",
    description: "Consulter la liste des commandes et leurs détails",
    category: "orders"
  },
  {
    id: "manage_orders",
    name: "Gérer les commandes",
    description: "Modifier le statut des commandes et gérer les remboursements",
    category: "orders"
  },
  // Produits
  {
    id: "view_products",
    name: "Voir les produits",
    description: "Consulter le catalogue de produits",
    category: "products"
  },
  {
    id: "manage_products",
    name: "Gérer les produits",
    description: "Ajouter, modifier et supprimer des produits",
    category: "products"
  },
  // Clients
  {
    id: "view_customers",
    name: "Voir les clients",
    description: "Consulter la liste des clients et leurs informations",
    category: "customers"
  },
  {
    id: "manage_customers",
    name: "Gérer les clients",
    description: "Modifier les informations clients et gérer les remboursements",
    category: "customers"
  },
  // Marketing
  {
    id: "view_marketing",
    name: "Voir les campagnes",
    description: "Consulter les campagnes marketing",
    category: "marketing"
  },
  {
    id: "manage_marketing",
    name: "Gérer les campagnes",
    description: "Créer et modifier les campagnes marketing",
    category: "marketing"
  },
  // Paramètres
  {
    id: "view_settings",
    name: "Voir les paramètres",
    description: "Consulter les paramètres de la boutique",
    category: "settings"
  },
  {
    id: "manage_settings",
    name: "Gérer les paramètres",
    description: "Modifier les paramètres de la boutique",
    category: "settings"
  },
  // Analytics
  {
    id: "view_analytics",
    name: "Voir les analyses",
    description: "Consulter les statistiques et rapports",
    category: "analytics"
  }
];

const defaultRoles: Role[] = [
  {
    id: "admin",
    name: "Administrateur",
    description: "Accès complet à toutes les fonctionnalités",
    permissions: defaultPermissions.map(p => p.id),
    isDefault: true
  },
  {
    id: "manager",
    name: "Gérant",
    description: "Peut gérer les commandes et les produits",
    permissions: ["view_orders", "manage_orders", "view_products", "manage_products", "view_customers", "view_analytics"]
  },
  {
    id: "support",
    name: "Support",
    description: "Peut voir les commandes et gérer le service client",
    permissions: ["view_orders", "view_customers", "manage_customers"]
  }
];

interface InviteData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

export default function TeamSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData>({
    email: "",
    firstName: "",
    lastName: "",
    roleId: defaultRoles[0].id
  });
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      // Récupérer les membres de l'équipe
      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (teamError) throw teamError;

      // Récupérer les rôles personnalisés
      const { data: rolesData, error: rolesError } = await supabase
        .from("team_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fusionner les rôles par défaut avec les rôles personnalisés
      const customRoles = rolesData || [];
      setRoles([...defaultRoles, ...customRoles]);

      // Associer les rôles aux membres
      const membersWithRoles = teamData?.map(member => ({
        ...member,
        role: roles.find(r => r.id === member.roleId) || defaultRoles[0]
      })) || [];

      setMembers(membersWithRoles);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les membres de l'équipe",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      // 1. Créer l'utilisateur dans Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: Math.random().toString(36).slice(-8), // Mot de passe temporaire
        options: {
          data: {
            firstName: inviteData.firstName,
            lastName: inviteData.lastName,
            roleId: inviteData.roleId
          }
        }
      });

      if (authError) throw authError;

      // 2. Ajouter le membre à l'équipe
      const { error: teamError } = await supabase
        .from("team_members")
        .insert({
          user_id: authData.user?.id,
          email: inviteData.email,
          first_name: inviteData.firstName,
          last_name: inviteData.lastName,
          role_id: inviteData.roleId,
          invited_by: session.user.id
        });

      if (teamError) throw teamError;

      toast({
        title: "Invitation envoyée",
        description: `Une invitation a été envoyée à ${inviteData.email}`,
        variant: "success",
      });

      setInviteDialogOpen(false);
      setInviteData({
        email: "",
        firstName: "",
        lastName: "",
        roleId: defaultRoles[0].id
      });
      
      fetchTeamMembers();
    } catch (error) {
      console.error("Error inviting team member:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'inviter le membre",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, roleId: string) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("team_members")
        .update({ role_id: roleId })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Rôle mis à jour",
        description: "Le rôle du membre a été mis à jour avec succès",
        variant: "success",
      });

      fetchTeamMembers();
    } catch (error) {
      console.error("Error updating member role:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMemberStatus = async (memberId: string, isActive: boolean) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("team_members")
        .update({ is_active: isActive })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: isActive ? "Compte activé" : "Compte désactivé",
        description: `Le compte a été ${isActive ? "activé" : "désactivé"} avec succès`,
        variant: "success",
      });

      fetchTeamMembers();
    } catch (error) {
      console.error("Error toggling member status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du compte",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      setIsLoading(true);

      // 1. Supprimer le membre de l'équipe
      const { error: teamError } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (teamError) throw teamError;

      toast({
        title: "Membre supprimé",
        description: "Le membre a été supprimé de l'équipe avec succès",
        variant: "success",
      });

      fetchTeamMembers();
    } catch (error) {
      console.error("Error removing team member:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le membre",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRole = async (roleName: string, permissions: string[]) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("team_roles")
        .insert({
          name: roleName,
          permissions
        });

      if (error) throw error;

      toast({
        title: "Rôle créé",
        description: "Le nouveau rôle a été créé avec succès",
        variant: "success",
      });

      fetchTeamMembers(); // Cette fonction récupérera aussi les rôles mis à jour
    } catch (error) {
      console.error("Error creating role:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rôle",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Gestion de l'équipe
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gérez les membres de votre équipe et leurs permissions
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Inviter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un nouveau membre</DialogTitle>
              <DialogDescription>
                Envoyez une invitation à un nouveau membre de l'équipe
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData({
                      ...inviteData,
                      firstName: e.target.value
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData({
                      ...inviteData,
                      lastName: e.target.value
                    })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({
                    ...inviteData,
                    email: e.target.value
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={inviteData.roleId}
                  onValueChange={(value) => setInviteData({
                    ...inviteData,
                    roleId: value
                  })}
                >
                  <SelectTrigger id="role" className="mt-1">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleInviteMember}
                disabled={!inviteData.email || !inviteData.firstName || !inviteData.lastName || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Invitation en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer l'invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des membres */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{member.firstName} {member.lastName}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={member.role.id}
                    onValueChange={(value) => updateMemberRole(member.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={member.isActive}
                    onCheckedChange={(checked) => toggleMemberStatus(member.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  {member.lastLoginAt ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{new Date(member.lastLoginAt).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Jamais connecté</span>
                  )}
                </TableCell>
                <TableCell>
                  {member.twoFactorEnabled ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <Shield className="w-4 h-4" />
                      <span>Activé</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Shield className="w-4 h-4" />
                      <span>Désactivé</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(member.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Gestion des rôles */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Rôles et permissions
          </h2>
          <Button
            variant="outline"
            onClick={() => setSelectedRole(null)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer un rôle
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liste des rôles */}
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                  selectedRole?.id === role.id
                    ? "border-brand-blue bg-brand-blue/5"
                    : "border-gray-200 hover:border-brand-blue"
                }`}
              >
                <div className="font-medium">{role.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {role.description}
                </div>
                {role.isDefault && (
                  <div className="flex items-center gap-1 text-xs text-brand-blue mt-2">
                    <Info className="w-3 h-3" />
                    Rôle par défaut
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Détails du rôle */}
          <div className="md:col-span-2">
            {selectedRole && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du rôle</Label>
                    <Input
                      value={selectedRole.name}
                      onChange={(e) => setSelectedRole({
                        ...selectedRole,
                        name: e.target.value
                      })}
                      className="mt-1"
                      disabled={selectedRole.isDefault}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={selectedRole.description}
                      onChange={(e) => setSelectedRole({
                        ...selectedRole,
                        description: e.target.value
                      })}
                      className="mt-1"
                      disabled={selectedRole.isDefault}
                    />
                  </div>
                </div>

                {/* Liste des permissions */}
                <div>
                  <Label className="mb-4 block">Permissions</Label>
                  <div className="space-y-6">
                    {Object.entries(
                      defaultPermissions.reduce((acc, permission) => {
                        if (!acc[permission.category]) {
                          acc[permission.category] = [];
                        }
                        acc[permission.category].push(permission);
                        return acc;
                      }, {} as Record<string, Permission[]>)
                    ).map(([category, permissions]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="font-medium capitalize">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between p-2 rounded-lg border"
                            >
                              <div>
                                <div className="font-medium">
                                  {permission.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {permission.description}
                                </div>
                              </div>
                              <Switch
                                checked={selectedRole.permissions.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  const newPermissions = checked
                                    ? [...selectedRole.permissions, permission.id]
                                    : selectedRole.permissions.filter(p => p !== permission.id);
                                  setSelectedRole({
                                    ...selectedRole,
                                    permissions: newPermissions
                                  });
                                }}
                                disabled={selectedRole.isDefault}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {!selectedRole.isDefault && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRole(null)}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={async () => {
                        if (selectedRole.id) {
                          // Mise à jour du rôle existant
                          await createRole(selectedRole.name, selectedRole.permissions);
                        } else {
                          // Création d'un nouveau rôle
                          await createRole(selectedRole.name, selectedRole.permissions);
                        }
                        setSelectedRole(null);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Sauvegarde en cours...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Sauvegarder les modifications
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}