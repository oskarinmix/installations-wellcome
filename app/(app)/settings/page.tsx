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
import { getPlanPrices, createPlan, updatePlan, deletePlan, getCommissionConfig, updateCommissionConfig, getCurrentUserRole, getAllUsers, updateUserRole, getCommissionRules, createCommissionRule, updateCommissionRule, deleteCommissionRule, getBcvRate, setBcvRate, getBcvRateHistory, deleteBcvRate } from "@/lib/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, Settings2, Users, Sliders, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type Plan = { id: number; name: string; price: number };

type CommissionValueType = "FIXED" | "PERCENTAGE";
type CommissionRule = {
  id: number;
  name: string;
  sellerFreeType: CommissionValueType;
  sellerFreeValue: number;
  sellerPaidType: CommissionValueType;
  sellerPaidValue: number;
  installerFreeType: CommissionValueType;
  installerFreeValue: number;
  installerPaidType: CommissionValueType;
  installerPaidValue: number;
  _count: { sellers: number };
};

type CommissionRuleForm = Omit<CommissionRule, "id" | "_count">;

const defaultRuleForm: CommissionRuleForm = {
  name: "",
  sellerFreeType: "FIXED",
  sellerFreeValue: 8,
  sellerPaidType: "FIXED",
  sellerPaidValue: 10,
  installerFreeType: "PERCENTAGE",
  installerFreeValue: 0.5,
  installerPaidType: "PERCENTAGE",
  installerPaidValue: 0.7,
};

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

  // Commission Rules state
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [ruleForm, setRuleForm] = useState<CommissionRuleForm>(defaultRuleForm);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<CommissionRule | null>(null);
  const [deletingRule, setDeletingRule] = useState(false);

  // BCV Rate state
  type BcvRateRow = { id: number; rate: number; effectiveDate: Date; createdAt: Date };
  const [bcvCurrent, setBcvCurrent] = useState<{ rate: number; date: string } | null>(null);
  const [bcvHistory, setBcvHistory] = useState<BcvRateRow[]>([]);
  const [bcvRateInput, setBcvRateInput] = useState("");
  const [bcvDateInput, setBcvDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [bcvSaving, setBcvSaving] = useState(false);
  const [deletingBcvId, setDeletingBcvId] = useState<number | null>(null);

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

  const loadRules = useCallback(async () => {
    const data = await getCommissionRules();
    setRules(data as CommissionRule[]);
  }, []);

  const loadBcv = useCallback(async () => {
    const [current, history] = await Promise.all([getBcvRate(), getBcvRateHistory()]);
    setBcvCurrent(current);
    setBcvHistory(history as BcvRateRow[]);
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
    loadRules();
    loadBcv();
    loadUsers();
  }, [loadPlans, loadCommConfig, loadRules, loadBcv, loadUsers, router]);

  const handleSetBcvRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(bcvRateInput);
    if (!rate || !bcvDateInput) return;
    setBcvSaving(true);
    try {
      await setBcvRate(rate, bcvDateInput);
      setBcvRateInput("");
      toast.success("Tasa BCV guardada correctamente");
      loadBcv();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar tasa BCV");
    } finally {
      setBcvSaving(false);
    }
  };

  const handleDeleteBcvRate = async (id: number) => {
    setDeletingBcvId(id);
    try {
      await deleteBcvRate(id);
      toast.success("Registro eliminado");
      loadBcv();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar registro");
    } finally {
      setDeletingBcvId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "agent") => {
    setRoleUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("Rol actualizado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar rol");
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
      toast.success(editingPlan ? "Plan actualizado correctamente" : "Plan creado correctamente");
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar plan");
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
      toast.success("Plan eliminado correctamente");
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar plan");
    } finally {
      setDeleting(false);
    }
  };

  const openCreateRule = () => {
    setEditingRule(null);
    setRuleForm(defaultRuleForm);
    setRuleDialogOpen(true);
  };

  const openEditRule = (rule: CommissionRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      sellerFreeType: rule.sellerFreeType,
      sellerFreeValue: rule.sellerFreeValue,
      sellerPaidType: rule.sellerPaidType,
      sellerPaidValue: rule.sellerPaidValue,
      installerFreeType: rule.installerFreeType,
      installerFreeValue: rule.installerFreeValue,
      installerPaidType: rule.installerPaidType,
      installerPaidValue: rule.installerPaidValue,
    });
    setRuleDialogOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.name.trim()) return;
    setRuleSaving(true);
    try {
      if (editingRule) {
        await updateCommissionRule(editingRule.id, ruleForm);
      } else {
        await createCommissionRule(ruleForm);
      }
      setRuleDialogOpen(false);
      toast.success(editingRule ? "Regla actualizada correctamente" : "Regla creada correctamente");
      loadRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar regla");
    } finally {
      setRuleSaving(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleTarget) return;
    setDeletingRule(true);
    try {
      await deleteCommissionRule(deleteRuleTarget.id);
      setDeleteRuleTarget(null);
      toast.success("Regla eliminada correctamente");
      loadRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar regla");
    } finally {
      setDeletingRule(false);
    }
  };

  const formatRuleValue = (type: CommissionValueType, value: number) =>
    type === "FIXED" ? `${value} (fijo)` : `${(value * 100).toFixed(0)}% (porcentaje)`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <span>⚙️</span> Configuración
      </h1>

      {/* BCV Rate Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tasa BCV
            {bcvCurrent && bcvCurrent.rate > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                Tasa actual: <strong className="text-foreground">{bcvCurrent.rate.toFixed(2)} Bs/$</strong>
                <span className="ml-2 text-xs">({bcvCurrent.date})</span>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Set new rate form */}
          <form onSubmit={handleSetBcvRate} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tasa (Bs/$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="ej. 97.50"
                value={bcvRateInput}
                onChange={(e) => setBcvRateInput(e.target.value)}
                className="w-40"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha de Vigencia</Label>
              <Input
                type="date"
                value={bcvDateInput}
                onChange={(e) => setBcvDateInput(e.target.value)}
                className="w-44"
                required
              />
            </div>
            <Button type="submit" disabled={bcvSaving} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              {bcvSaving ? "Guardando..." : "Registrar Tasa"}
            </Button>
          </form>

          {/* History table */}
          {bcvHistory.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha de Vigencia</TableHead>
                    <TableHead className="text-right">Tasa (Bs/$)</TableHead>
                    <TableHead>Registrado</TableHead>
                    <TableHead className="w-16 text-center">Eliminar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bcvHistory.map((row, i) => (
                    <TableRow key={row.id} className={i === 0 ? "bg-amber-50 dark:bg-amber-950/20 font-medium" : ""}>
                      <TableCell>
                        {new Date(row.effectiveDate).toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" })}
                        {i === 0 && <span className="ml-2 text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded px-1 py-0.5">Actual</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{row.rate.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleDeleteBcvRate(row.id)}
                          disabled={deletingBcvId === row.id}
                          className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {bcvHistory.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay tasas registradas aún.</p>
          )}
        </CardContent>
      </Card>

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
            <div className="overflow-x-auto">
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
            </div>
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

      {/* Commission Rules Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              Reglas de Comisión
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={openCreateRule}>
              <Plus className="h-4 w-4" /> Nueva Regla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm">No hay reglas de comisión configuradas.</p>
              <p className="text-xs mt-1">Las reglas permiten personalizar comisiones por vendedor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-center">Vendedor FREE</TableHead>
                    <TableHead className="text-center">Vendedor PAID</TableHead>
                    <TableHead className="text-center">Instalador FREE</TableHead>
                    <TableHead className="text-center">Instalador PAID</TableHead>
                    <TableHead className="text-center">Vendedores</TableHead>
                    <TableHead className="w-20 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatRuleValue(rule.sellerFreeType, rule.sellerFreeValue)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatRuleValue(rule.sellerPaidType, rule.sellerPaidValue)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatRuleValue(rule.installerFreeType, rule.installerFreeValue)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{formatRuleValue(rule.installerPaidType, rule.installerPaidValue)}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-xs font-semibold">
                          {rule._count.sellers}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            title="Editar regla"
                            className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => openEditRule(rule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            title="Eliminar regla"
                            className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => setDeleteRuleTarget(rule)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
            <div className="overflow-x-auto">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Rule Create/Edit Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regla de Comisión" : "Nueva Regla de Comisión"}</DialogTitle>
            <DialogDescription>
              Define valores personalizados de comisión para vendedor e instalador.
              <span className="block mt-1 text-xs">Para porcentaje, usar valor entre 0 y 1 (ej: 0.5 = 50%)</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="ruleName">Nombre de la Regla</Label>
              <Input
                id="ruleName"
                placeholder="ej. Premium, Especial"
                value={ruleForm.name}
                onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Seller FREE */}
              <div className="space-y-1">
                <Label className="text-xs">Vendedor FREE — Tipo</Label>
                <Select
                  value={ruleForm.sellerFreeType}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, sellerFreeType: v as CommissionValueType }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fijo</SelectItem>
                    <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vendedor FREE — Valor</Label>
                <Input
                  type="number" step="0.01" min="0"
                  className="h-8 text-xs"
                  value={ruleForm.sellerFreeValue}
                  onChange={(e) => setRuleForm((f) => ({ ...f, sellerFreeValue: Number(e.target.value) }))}
                  required
                />
              </div>
              {/* Seller PAID */}
              <div className="space-y-1">
                <Label className="text-xs">Vendedor PAID — Tipo</Label>
                <Select
                  value={ruleForm.sellerPaidType}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, sellerPaidType: v as CommissionValueType }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fijo</SelectItem>
                    <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vendedor PAID — Valor</Label>
                <Input
                  type="number" step="0.01" min="0"
                  className="h-8 text-xs"
                  value={ruleForm.sellerPaidValue}
                  onChange={(e) => setRuleForm((f) => ({ ...f, sellerPaidValue: Number(e.target.value) }))}
                  required
                />
              </div>
              {/* Installer FREE */}
              <div className="space-y-1">
                <Label className="text-xs">Instalador FREE — Tipo</Label>
                <Select
                  value={ruleForm.installerFreeType}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, installerFreeType: v as CommissionValueType }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fijo</SelectItem>
                    <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instalador FREE — Valor</Label>
                <Input
                  type="number" step="0.01" min="0"
                  className="h-8 text-xs"
                  value={ruleForm.installerFreeValue}
                  onChange={(e) => setRuleForm((f) => ({ ...f, installerFreeValue: Number(e.target.value) }))}
                  required
                />
              </div>
              {/* Installer PAID */}
              <div className="space-y-1">
                <Label className="text-xs">Instalador PAID — Tipo</Label>
                <Select
                  value={ruleForm.installerPaidType}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, installerPaidType: v as CommissionValueType }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fijo</SelectItem>
                    <SelectItem value="PERCENTAGE">Porcentaje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instalador PAID — Valor</Label>
                <Input
                  type="number" step="0.01" min="0"
                  className="h-8 text-xs"
                  value={ruleForm.installerPaidValue}
                  onChange={(e) => setRuleForm((f) => ({ ...f, installerPaidValue: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setRuleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={ruleSaving || !ruleForm.name.trim()}>
                {ruleSaving ? "Guardando..." : editingRule ? "Guardar Cambios" : "Crear Regla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation Dialog */}
      <Dialog open={!!deleteRuleTarget} onOpenChange={(open) => !open && setDeleteRuleTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Regla de Comisión</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{deleteRuleTarget?.name}</strong>?
              {deleteRuleTarget && deleteRuleTarget._count.sellers > 0 && (
                <span className="block mt-1 text-amber-600 dark:text-amber-400">
                  {deleteRuleTarget._count.sellers} vendedor{deleteRuleTarget._count.sellers !== 1 ? "es" : ""} usan esta regla y volverán a la configuración global.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRuleTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteRule} disabled={deletingRule}>
              {deletingRule ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                toast.success("Configuración guardada correctamente");
                loadCommConfig();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Error al guardar configuración");
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
