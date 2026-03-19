import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, GitBranch, Loader2, Plus, Trash2, User, X } from "lucide-react";
import { Link } from "react-router-dom";

import api from "@/services/api";

interface Role {
  id: string;
  name: string;
  procedure_count: number;
}

interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  status: string;
}

function buildRoleCode(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return normalized ? `${normalized}-${suffix}` : `ROL-${suffix}`;
}

export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  });
  const { data: roleAssignments } = useQuery<UserRoleAssignment[]>({
    queryKey: ["role-assignments"],
    queryFn: () => api.get("/roles/assignments").then((r) => r.data),
  });

  const activeUsersByRole = useMemo(() => {
    const counts = new Map<string, Set<string>>();

    for (const assignment of roleAssignments ?? []) {
      if (assignment.status !== "active") continue;

      const users = counts.get(assignment.role_id) ?? new Set<string>();
      users.add(assignment.user_id);
      counts.set(assignment.role_id, users);
    }

    return counts;
  }, [roleAssignments]);

  const createMutation = useMutation({
    mutationFn: () =>
      api
        .post("/roles", {
          code: buildRoleCode(form.name),
          name: form.name,
          description: form.description || null,
        })
        .then((r) => r.data as Role),
    onSuccess: (createdRole) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setForm({ name: "", description: "" });
      setShowForm(false);
      void createdRole;
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-assignments"] });
    },
  });

  function handleDelete(role: Role) {
    const confirmed = window.confirm(`Eliminar el rol "${role.name}"? Esta accion no se puede deshacer.`);
    if (!confirmed) return;
    deleteMutation.mutate(role.id);
  }

  return (
    <>
      <style>{`
        @keyframes roleDrawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes roleDrawerSlideIn {
          from { transform: translateX(24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Listado de roles operativos vinculados con los procesos de la organización
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo rol
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/30"
            style={{ animation: "roleDrawerFadeIn 180ms ease-out" }}
            onClick={() => setShowForm(false)}
          />
          <div
            className="fixed right-0 top-0 flex h-screen w-full max-w-md flex-col bg-white shadow-xl"
            style={{ animation: "roleDrawerSlideIn 220ms ease-out" }}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
              className="flex h-full flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Nuevo rol</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Complete los datos necesarios para la creación del rol.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Nombre</span>
                  <input
                    required
                    placeholder="Nombre del rol"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Descripción</span>
                  <textarea
                    rows={4}
                    placeholder="Descripción"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !roles?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No hay roles definidos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <Link to={`/roles/${role.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <BriefcaseBusiness className="h-5 w-5 flex-shrink-0 text-gray-300" />
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(role)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Eliminar rol"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Link to={`/roles/${role.id}`} className="mt-3 block">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="group relative inline-flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {activeUsersByRole.get(role.id)?.size ?? 0}
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-36 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-center text-xs text-white shadow-lg group-hover:block">
                      Cantidad de usuarios asociados a este rol
                    </span>
                  </span>
                  <span className="group relative inline-flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-gray-400" />
                    {role.procedure_count ?? 0}
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-36 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-center text-xs text-white shadow-lg group-hover:block">
                      Cantidad de procesos asociados a este rol
                    </span>
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
