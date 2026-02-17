"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getPlanPrices, createPlan, updatePlan, deletePlan, getCommissionConfig, updateCommissionConfig, getCurrentUserRole, getAllUsers, updateUserRole } from "@/lib/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, Settings2, Users } from "lucide-react";

type Plan = { id: number; name: string; price: number };

export default function SettingsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Commission config state
  const [commConfig, setCommConfig] = useState({
    sellerFreeCommission: 8,
    sellerPaidCommission: 10,
    installerFreePercentage: 0.5,
    installerPaidPercentage: 0.7,
  });
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [commForm, setCommForm] = useState(commConfig);
  const [commSaving, setCommSaving] = useState(false);

  // Users state
  type UserRow = { id: string; name: string; email: string; role: "admin" | "agent"; createdAt: Date };
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    const data = await getPlanPrices();
    setPlans(data);
    setLoading(false);
  }, []);

  const loadCommConfig = useCallback(async () => {
    const config = await getCommissionConfig();
    setCommConfig(config);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await getAllUsers();
    setUsers(data);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res?.role !== "admin") {
        router.replace("/installations");
        return;
      }
    });
    loadPlans();
    loadCommConfig();
    loadUsers();
  }, [loadPlans, loadCommConfig, loadUsers, router]);

  const handleRoleChange = async (userId: string, newRole: "admin" | "agent") => {
    setRoleUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al actualizar rol");
    } finally {
      setRoleUpdating(null);
    }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanPrice("");
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(String(plan.price));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim() || !planPrice) return;
    setSaving(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, planName, Number(planPrice));
      } else {
        await createPlan(planName, Number(planPrice));
      }
      setDialogOpen(false);
      loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlan(deleteTarget.id);
      setDeleteTarget(null);
      loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar plan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <span>⚙️</span> Configuración
      </h1>

      {/* Plans Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Planes
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nuevo Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">Cargando...</div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">No hay planes configurados aún.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Nombre del Plan</TableHead>
                  <TableHead className="text-right">Precio (USD)</TableHead>
                  <TableHead className="w-24 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="text-muted-foreground font-mono text-xs">{plan.id}</TableCell>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-right font-mono">${plan.price.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Editar plan"
                          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Eliminar plan"
                          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => setDeleteTarget(plan)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plan" : "Nuevo Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Actualizar el nombre y precio del plan." : "Agregar un nuevo plan al sistema."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="planName">Nombre del Plan</Label>
              <Input
                id="planName"
                placeholder="ej. RESIDENCIAL 400"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="planPrice">Precio (USD)</Label>
              <Input
                id="planPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !planName.trim() || !planPrice}>
                {saving ? "Guardando..." : editingPlan ? "Guardar Cambios" : "Crear Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Plan</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Config Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configuración de Comisiones
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={() => { setCommForm(commConfig); setCommDialogOpen(true); }}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Comisión Vendedor Gratis</p>
              <p className="text-xl font-bold">${commConfig.sellerFreeCommission}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Comisión Vendedor Pagado</p>
              <p className="text-xl font-bold">${commConfig.sellerPaidCommission}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">% Instalador Gratis</p>
              <p className="text-xl font-bold">{(commConfig.installerFreePercentage * 100).toFixed(0)}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">% Instalador Pagado</p>
              <p className="text-xl font-bold">{(commConfig.installerPaidPercentage * 100).toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">Cargando...</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">No se encontraron usuarios.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead className="w-40">Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleChange(user.id, v as "admin" | "agent")}
                        disabled={roleUpdating === user.id}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Commission Config Edit Dialog */}
      <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Configuración de Comisiones</DialogTitle>
            <DialogDescription>Actualizar valores de comisión para vendedores e instaladores.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCommSaving(true);
              try {
                await updateCommissionConfig(commForm);
                setCommDialogOpen(false);
                loadCommConfig();
              } catch (err) {
                alert(err instanceof Error ? err.message : "Error al guardar configuración");
              } finally {
                setCommSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>Comisión Vendedor Gratis ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={commForm.sellerFreeCommission}
                onChange={(e) => setCommForm((f) => ({ ...f, sellerFreeCommission: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Comisión Vendedor Pagado ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={commForm.sellerPaidCommission}
                onChange={(e) => setCommForm((f) => ({ ...f, sellerPaidCommission: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Porcentaje Instalador Gratis (%)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                value={Math.round(commForm.installerFreePercentage * 100)}
                onChange={(e) => setCommForm((f) => ({ ...f, installerFreePercentage: Number(e.target.value) / 100 }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Porcentaje Instalador Pagado (%)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                value={Math.round(commForm.installerPaidPercentage * 100)}
                onChange={(e) => setCommForm((f) => ({ ...f, installerPaidPercentage: Number(e.target.value) / 100 }))}
                required
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setCommDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={commSaving}>
                {commSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
