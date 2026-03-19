import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2, Mail, MapPin, Plus, Users, X } from "lucide-react";

import api from "@/services/api";

interface UserRoleAssignment {
  id: string;
  role_id: string;
  location?: string | null;
  status?: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  location: string | null;
  created_at: string;
  role_assignments: UserRoleAssignment[];
}

interface RoleOption {
  id: string;
  name: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail === "string"
  ) {
    return (error as { response?: { data?: { detail?: string } } }).response!.data!.detail!;
  }
  return fallback;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    email: "",
    password: "",
    roleId: "",
  });
  const { data: users, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });
  const { data: roles } = useQuery<RoleOption[]>({
    queryKey: ["roles"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      api
        .post("/users", {
          name: form.name,
          location: form.location || null,
          email: form.email,
          password: form.password,
          role_assignments: form.roleId
            ? [
                {
                  role_id: form.roleId,
                  location: form.location || null,
                  status: "active",
                },
              ]
            : [],
        })
        .then((r) => r.data as UserRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["role-assignments"] });
      setForm({ name: "", location: "", email: "", password: "", roleId: "" });
      setShowForm(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingUser) {
        throw new Error("No user selected");
      }

      const selectedAssignment = editingUser.role_assignments.find((assignment) => assignment.role_id === form.roleId);

      return api
        .patch(`/users/${editingUser.id}`, {
          name: form.name,
          location: form.location || null,
          email: form.email,
          ...(form.password ? { password: form.password } : {}),
          role_assignments: form.roleId
            ? [
                {
                  ...(selectedAssignment ? { id: selectedAssignment.id } : {}),
                  role_id: form.roleId,
                  location: form.location || null,
                  status: "active",
                },
              ]
            : [],
        })
        .then((r) => r.data as UserRecord);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["role-assignments"] });
      closeDrawer();
    },
  });

  function closeDrawer() {
    setShowForm(false);
    setEditingUser(null);
    setForm({ name: "", location: "", email: "", password: "", roleId: "" });
  }

  function openCreateDrawer() {
    setEditingUser(null);
    setForm({ name: "", location: "", email: "", password: "", roleId: "" });
    setShowForm(true);
  }

  function openEditDrawer(user: UserRecord) {
    const activeAssignment =
      user.role_assignments.find((assignment) => assignment.status === "active") ?? user.role_assignments[0];

    setEditingUser(user);
    setForm({
      name: user.name,
      location: activeAssignment?.location ?? user.location ?? "",
      email: user.email,
      password: "",
      roleId: activeAssignment?.role_id ?? "",
    });
    setShowForm(true);
  }

  const activeMutation = editingUser ? updateMutation : createMutation;

  return (
    <>
      <style>{`
        @keyframes userDrawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes userDrawerSlideIn {
          from { transform: translateX(24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-6 pt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="mt-1 text-sm text-gray-500">
              Administrá usuarios, sus datos base y las asignaciones de rol activas.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50">
            <div
              className="fixed inset-0 bg-black/30"
              style={{ animation: "userDrawerFadeIn 180ms ease-out" }}
              onClick={() => setShowForm(false)}
            />
            <div
              className="fixed right-0 top-0 flex h-screen w-full max-w-md flex-col bg-white shadow-xl"
              style={{ animation: "userDrawerSlideIn 220ms ease-out" }}
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  activeMutation.mutate();
                }}
                className="flex h-full flex-col"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingUser ? "Editar usuario" : "Nuevo usuario"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {editingUser
                        ? "Modifique los datos necesarios para actualizar el usuario."
                        : "Complete los datos necesarios para la creación del usuario."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDrawer}
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
                      placeholder="Nombre del usuario"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Ubicación</span>
                    <input
                      placeholder="Ubicación"
                      value={form.location}
                      onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico</span>
                    <input
                      required
                      type="email"
                      placeholder="correo@empresa.com"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Rol</span>
                    <select
                      value={form.roleId}
                      onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    >
                      <option value="">Sin rol</option>
                      {roles?.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Contraseña</span>
                    <input
                      required={!editingUser}
                      type="password"
                      placeholder={editingUser ? "Dejar en blanco para conservar la actual" : "Contraseña"}
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  {activeMutation.isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {getErrorMessage(
                        activeMutation.error,
                        editingUser ? "No se pudo actualizar el usuario." : "No se pudo crear el usuario."
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={activeMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {activeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingUser ? "Guardar cambios" : "Crear usuario"}
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
        ) : !users?.length ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => openEditDrawer(user)}
                className="block w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-900">{user.name}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
                    <MapPin className="h-3 w-3" />
                    {user.location || "Sin ubicación"}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                    {user.role_assignments.length} roles
                  </span>
                </div>

                {user.role_assignments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {user.role_assignments.slice(0, 3).map((assignment) => (
                      <span
                        key={assignment.id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {assignment.role.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
