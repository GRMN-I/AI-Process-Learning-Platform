import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Loader2, Plus, Users } from "lucide-react";
import api from "@/services/api";

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface User {
  id: string;
  name: string;
  location?: string | null;
}

interface ProcedureOption {
  id: string;
  code: string;
  title: string;
}

interface UserRoleAssignment {
  id: string;
  user_name: string;
  role_name: string;
  location?: string | null;
  status: string;
}

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [roleForm, setRoleForm] = useState({ code: "", name: "", description: "" });
  const [assignmentForm, setAssignmentForm] = useState({ user_id: "", role_id: "", location: "" });
  const [roleProcedureForm, setRoleProcedureForm] = useState({ role_id: "", procedure_id: "" });

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  });
  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });
  const { data: procedures } = useQuery<ProcedureOption[]>({
    queryKey: ["procedures"],
    queryFn: () => api.get("/procedures").then((r) => r.data),
  });
  const { data: assignments } = useQuery<UserRoleAssignment[]>({
    queryKey: ["role-assignments"],
    queryFn: () => api.get("/roles/assignments").then((r) => r.data),
  });

  const createRoleMutation = useMutation({
    mutationFn: () => api.post("/roles", roleForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setRoleForm({ code: "", name: "", description: "" });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: () =>
      api.post("/roles/assignments", {
        ...assignmentForm,
        location: assignmentForm.location || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-assignments"] });
      setAssignmentForm({ user_id: "", role_id: "", location: "" });
    },
  });

  const linkProcedureMutation = useMutation({
    mutationFn: () => api.post("/roles/procedure-links", { ...roleProcedureForm, is_required: true }),
    onSuccess: () => {
      setRoleProcedureForm({ role_id: "", procedure_id: "" });
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define roles activos, sus procedimientos requeridos y la asignación real a personas.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createRoleMutation.mutate();
            }}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Nuevo rol</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                required
                placeholder="Código"
                value={roleForm.code}
                onChange={(event) => setRoleForm((current) => ({ ...current, code: event.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
              <input
                required
                placeholder="Nombre"
                value={roleForm.name}
                onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
              <textarea
                rows={2}
                placeholder="Descripción"
                value={roleForm.description}
                onChange={(event) =>
                  setRoleForm((current) => ({ ...current, description: event.target.value }))
                }
                className="md:col-span-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={createRoleMutation.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {createRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar rol
            </button>
          </form>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              roles?.map((role) => (
                <Link
                  key={role.id}
                  to={`/roles/${role.id}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {role.code}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-gray-900">{role.name}</h3>
                    </div>
                    <BriefcaseBusiness className="h-5 w-5 text-gray-300" />
                  </div>
                  <p className="mt-3 text-sm text-gray-600">{role.description || "Sin descripción."}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              assignRoleMutation.mutate();
            }}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Asignar rol</h2>
            </div>
            <div className="mt-4 space-y-3">
              <select
                required
                value={assignmentForm.user_id}
                onChange={(event) =>
                  setAssignmentForm((current) => ({ ...current, user_id: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Usuario</option>
                {users?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={assignmentForm.role_id}
                onChange={(event) =>
                  setAssignmentForm((current) => ({ ...current, role_id: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Rol</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Ubicación opcional"
                value={assignmentForm.location}
                onChange={(event) =>
                  setAssignmentForm((current) => ({ ...current, location: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={assignRoleMutation.isPending}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Asignar
            </button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              linkProcedureMutation.mutate();
            }}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <h2 className="text-lg font-semibold text-gray-900">Vincular procedimiento requerido</h2>
            <div className="mt-4 space-y-3">
              <select
                required
                value={roleProcedureForm.role_id}
                onChange={(event) =>
                  setRoleProcedureForm((current) => ({ ...current, role_id: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Rol</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={roleProcedureForm.procedure_id}
                onChange={(event) =>
                  setRoleProcedureForm((current) => ({ ...current, procedure_id: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Procedimiento</option>
                {procedures?.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.code} · {procedure.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={linkProcedureMutation.isPending}
              className="mt-4 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              Vincular procedimiento
            </button>
          </form>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">Asignaciones activas</h2>
            <div className="mt-4 space-y-2">
              {assignments?.map((assignment) => (
                <div key={assignment.id} className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <div className="font-medium text-gray-900">{assignment.user_name}</div>
                  <div className="text-gray-500">
                    {assignment.role_name} · {assignment.location || "sin ubicación"} · {assignment.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
