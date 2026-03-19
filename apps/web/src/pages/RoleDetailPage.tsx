import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { ArrowLeft, BriefcaseBusiness, Loader2, Unlink } from "lucide-react";

interface RoleProcedure {
  id: string;
  procedure_id: string;
  procedure_code: string;
  procedure_title: string;
  is_required: boolean;
}

interface RoleDetail {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  procedures: RoleProcedure[];
}

interface ProcedureOption {
  id: string;
  code: string;
  title: string;
}

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", description: "", is_active: true });
  const [procedureId, setProcedureId] = useState("");

  const { data: role, isLoading } = useQuery<RoleDetail>({
    queryKey: ["role", id],
    queryFn: () => api.get(`/roles/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });

  const { data: procedures } = useQuery<ProcedureOption[]>({
    queryKey: ["procedures"],
    queryFn: () => api.get("/procedures").then((r) => r.data),
  });

  useEffect(() => {
    if (!role) return;
    setForm({
      code: role.code,
      name: role.name,
      description: role.description ?? "",
      is_active: role.is_active,
    });
  }, [role]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/roles/${id}`, form).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role", id] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const linkProcedureMutation = useMutation({
    mutationFn: () =>
      api
        .post("/roles/procedure-links", { role_id: id, procedure_id: procedureId, is_required: true })
        .then((r) => r.data),
    onSuccess: () => {
      setProcedureId("");
      queryClient.invalidateQueries({ queryKey: ["role", id] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
    },
  });

  const unlinkProcedureMutation = useMutation({
    mutationFn: (linkId: string) => api.delete(`/roles/procedure-links/${linkId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role", id] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
    },
  });

  if (isLoading || !role) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const availableProcedures =
    procedures?.filter((procedure) => !role.procedures.some((linked) => linked.procedure_id === procedure.id)) ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-8">
      <div className="space-y-3">
        <Link
          to="/roles"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a roles
        </Link>
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <BriefcaseBusiness className="mt-1 h-6 w-6 text-indigo-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{role.code}</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{role.name}</h1>
              <p className="mt-2 text-sm text-gray-600">{role.description || "Sin descripción."}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-2.5 py-1">
                  Estado: {role.is_active ? "Activo" : "Inactivo"}
                </span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                  {role.procedures.length} procedimientos vinculados
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate();
          }}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold text-gray-900">Editar rol</h2>
          <div className="mt-4 space-y-3">
            <input
              required
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Código"
            />
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Nombre"
            />
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Descripción"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Rol activo
            </label>
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        </form>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Procedimientos vinculados</h2>
          <div className="mt-4 flex items-center gap-2">
            <select
              value={procedureId}
              onChange={(event) => setProcedureId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="">Seleccionar procedimiento</option>
              {availableProcedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>
                  {procedure.code} · {procedure.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!procedureId || linkProcedureMutation.isPending}
              onClick={() => linkProcedureMutation.mutate()}
              className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              Vincular
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {!role.procedures.length ? (
              <p className="text-sm text-gray-400">Este rol todavía no tiene procedimientos vinculados.</p>
            ) : (
              role.procedures.map((procedure) => (
                <div
                  key={procedure.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {procedure.procedure_code} · {procedure.procedure_title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {procedure.is_required ? "Requerido" : "Opcional"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={unlinkProcedureMutation.isPending}
                    onClick={() => unlinkProcedureMutation.mutate(procedure.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Unlink className="h-3 w-3" />
                    Quitar
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
