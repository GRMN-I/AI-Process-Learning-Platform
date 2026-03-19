import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import api from "@/services/api";
import { getStoredUser } from "@/lib/auth";

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

interface UserRoleAssignment {
  id: string;
  role_id: string;
  location: string | null;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  role: RoleOption;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  location: string | null;
  created_at: string;
  role_assignments: UserRoleAssignment[];
}

interface RoleAssignmentFormState {
  id?: string;
  role_id: string;
  location: string;
  status: string;
  starts_on: string;
  ends_on: string;
}

interface UserFormState {
  name: string;
  email: string;
  location: string;
  password: string;
  role_assignments: RoleAssignmentFormState[];
}

const emptyAssignment: RoleAssignmentFormState = {
  role_id: "",
  location: "",
  status: "active",
  starts_on: "",
  ends_on: "",
};

const emptyForm: UserFormState = {
  name: "",
  email: "",
  location: "",
  password: "",
  role_assignments: [emptyAssignment],
};

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

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "Sin fecha";
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = getStoredUser();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const { data: users, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const { data: roles } = useQuery<RoleOption[]>({
    queryKey: ["roles"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      location: string | null;
      password: string;
      role_assignments: Array<{
        role_id: string;
        location: string | null;
        status: string;
        starts_on?: string;
        ends_on?: string;
      }>;
    }) => api.post("/users", payload).then((r) => r.data as UserRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: {
        name: string;
        email: string;
        location: string | null;
        password?: string;
        role_assignments: Array<{
          id?: string;
          role_id: string;
          location: string | null;
          status: string;
          starts_on?: string;
          ends_on?: string;
        }>;
      };
    }) => api.patch(`/users/${userId}`, payload).then((r) => r.data as UserRecord),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (currentUser?.id === updatedUser.id) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...currentUser,
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            location: updatedUser.location,
          })
        );
      }
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const activeMutation = editingUser ? updateMutation : createMutation;

  function openCreateModal() {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(user: UserRecord) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      location: user.location ?? "",
      password: "",
      role_assignments: user.role_assignments.length
        ? user.role_assignments.map((assignment) => ({
            id: assignment.id,
            role_id: assignment.role_id,
            location: assignment.location ?? "",
            status: assignment.status,
            starts_on: assignment.starts_on ?? "",
            ends_on: assignment.ends_on ?? "",
          }))
        : [emptyAssignment],
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  function setAssignment(index: number, patch: Partial<RoleAssignmentFormState>) {
    setForm((current) => ({
      ...current,
      role_assignments: current.role_assignments.map((assignment, assignmentIndex) =>
        assignmentIndex === index ? { ...assignment, ...patch } : assignment
      ),
    }));
  }

  function addAssignmentRow() {
    setForm((current) => ({
      ...current,
      role_assignments: [...current.role_assignments, { ...emptyAssignment }],
    }));
  }

  function removeAssignmentRow(index: number) {
    setForm((current) => ({
      ...current,
      role_assignments:
        current.role_assignments.length === 1
          ? [{ ...emptyAssignment }]
          : current.role_assignments.filter((_, assignmentIndex) => assignmentIndex !== index),
    }));
  }

  function buildAssignmentsPayload() {
    return form.role_assignments
      .filter((assignment) => assignment.role_id)
      .map((assignment) => ({
        ...(assignment.id ? { id: assignment.id } : {}),
        role_id: assignment.role_id,
        location: assignment.location.trim() || null,
        status: assignment.status,
        ...(assignment.starts_on ? { starts_on: assignment.starts_on } : {}),
        ...(assignment.ends_on ? { ends_on: assignment.ends_on } : {}),
      }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name: form.name,
      email: form.email,
      location: form.location.trim() || null,
      role_assignments: buildAssignmentsPayload(),
    };

    if (editingUser) {
      updateMutation.mutate({
        userId: editingUser.id,
        payload: {
          ...payload,
          ...(form.password.trim() ? { password: form.password } : {}),
        },
      });
      return;
    }

    createMutation.mutate({
      ...payload,
      password: form.password,
    });
  }

  function handleDelete(user: UserRecord) {
    const confirmed = window.confirm(`Eliminar a ${user.name}? Esta accion no se puede deshacer.`);
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona perfiles y asignaciones de roles activas o historicas por usuario.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !users?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No hay usuarios cargados</p>
          <p className="mt-1 text-sm text-gray-400">
            Crea el primero y asignale uno o varios roles operativos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left font-medium text-gray-600">Usuario</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Asignaciones</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Ubicacion base</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Alta</th>
                <th className="px-5 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const isCurrentUser = currentUser?.id === user.id;
                return (
                  <tr key={user.id} className="align-top hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-gray-500">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-72 flex-wrap gap-2">
                        {user.role_assignments.length ? (
                          user.role_assignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className={`rounded-xl border px-3 py-2 ${
                                assignment.status === "active"
                                  ? "border-indigo-200 bg-indigo-50"
                                  : "border-gray-200 bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-900">
                                <BriefcaseBusiness className="h-3.5 w-3.5" />
                                {assignment.role.name}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {assignment.location || "Sin ubicacion"} · {assignment.status}
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">Sin roles asignados</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {user.location || "Sin ubicacion"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={isCurrentUser || deleteMutation.isPending}
                          title={isCurrentUser ? "No puedes eliminar tu propio usuario" : "Eliminar usuario"}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteMutation.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getErrorMessage(deleteMutation.error, "No se pudo eliminar el usuario.")}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingUser ? "Editar usuario" : "Nuevo usuario"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {editingUser
                    ? "Actualiza el perfil y ajusta las asignaciones de roles."
                    : "Crea un usuario y opcionalmente asignale varios roles desde el inicio."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Nombre</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="Ej: Sofia Jefa de Turno"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="persona@demo.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Ubicacion base</span>
                  <input
                    value={form.location}
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="Buenos Aires"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    {editingUser ? "Nueva password (opcional)" : "Password"}
                  </span>
                  <input
                    required={!editingUser}
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder={editingUser ? "Dejar vacio para mantener la actual" : "Minimo 6 caracteres"}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Asignaciones de roles</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Si quitas una asignacion existente del formulario, se marcara como inactiva al guardar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAssignmentRow}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar asignacion
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {form.role_assignments.map((assignment, index) => (
                    <div key={`${assignment.id ?? "new"}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_0.8fr_auto]">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-600">Rol</span>
                          <select
                            value={assignment.role_id}
                            onChange={(event) => setAssignment(index, { role_id: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="">Seleccionar rol</option>
                            {roles?.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-600">Ubicacion</span>
                          <input
                            value={assignment.location}
                            onChange={(event) => setAssignment(index, { location: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                            placeholder="Sucursal o area"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-600">Estado</span>
                          <select
                            value={assignment.status}
                            onChange={(event) => setAssignment(index, { status: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="active">Activa</option>
                            <option value="inactive">Inactiva</option>
                          </select>
                        </label>

                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removeAssignmentRow(index)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Quitar
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Inicio
                          </span>
                          <input
                            type="date"
                            value={assignment.starts_on}
                            onChange={(event) => setAssignment(index, { starts_on: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Fin
                          </span>
                          <input
                            type="date"
                            value={assignment.ends_on}
                            onChange={(event) => setAssignment(index, { ends_on: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          />
                        </label>
                      </div>

                      {assignment.id && (
                        <p className="mt-3 text-xs text-gray-400">
                          Asignacion existente. Inicio: {formatDate(assignment.starts_on || null)}.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {activeMutation.isError && (
                <p className="text-sm text-red-600">
                  {getErrorMessage(activeMutation.error, "No se pudo guardar el usuario.")}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activeMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {activeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingUser ? "Guardar cambios" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
