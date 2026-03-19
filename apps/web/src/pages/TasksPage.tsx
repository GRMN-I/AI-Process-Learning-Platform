import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import {
  CheckSquare,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Clock,
  Unlink,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  roles?: Array<{ id: string; code: string; name: string }>;
  procedures?: Array<{ id: string; procedure_id: string; code: string; title: string; is_primary: boolean }>;
  location?: string;
  created_at?: string;
}

interface SuggestedTraining {
  training_id: string;
  title: string;
  score: number;
  snippet?: string | null;
}

interface ProcedureOption {
  id: string;
  code: string;
  title: string;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, SuggestedTraining[]>>({});
  const [loadingSugg, setLoadingSugg] = useState<string | null>(null);
  const [selectedProcedureByTask, setSelectedProcedureByTask] = useState<Record<string, string>>({});

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
  });

  const { data: procedures } = useQuery<ProcedureOption[]>({
    queryKey: ["procedures"],
    queryFn: () => api.get("/procedures").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post("/tasks", payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setForm({ title: "", description: "", location: "" });
    },
  });

  const linkProcedureMutation = useMutation({
    mutationFn: ({ taskId, procedureId }: { taskId: string; procedureId: string }) =>
      api.post(`/tasks/${taskId}/procedure-links`, { procedure_id: procedureId }).then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedProcedureByTask((current) => ({ ...current, [variables.taskId]: "" }));
    },
  });

  const unlinkProcedureMutation = useMutation({
    mutationFn: ({ taskId, procedureId }: { taskId: string; procedureId: string }) =>
      api.delete(`/tasks/${taskId}/procedure-links/${procedureId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  async function fetchSuggestions(taskId: string) {
    if (expandedId === taskId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(taskId);
    if (suggestions[taskId]) return;

    setLoadingSugg(taskId);
    try {
      const { data } = await api.post(`/tasks/${taskId}/suggest-trainings`);
      setSuggestions((prev) => ({ ...prev, [taskId]: data }));
    } catch {
      setSuggestions((prev) => ({ ...prev, [taskId]: [] }));
    } finally {
      setLoadingSugg(null);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <div className="mx-auto max-w-5xl pt-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tareas operativas, sus procedimientos y sugerencias de training
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Título</span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Ej: Limpieza de freidora"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Descripción</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Describe la tarea…"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-1">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Ubicación</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Ej: Sucursal Centro"
              />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Tarea
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-600">Error al crear la tarea.</p>
          )}
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !tasks?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <CheckSquare className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No hay tareas creadas</p>
          <p className="mt-1 text-sm text-gray-400">
            Crea una tarea y obtén sugerencias de capacitaciones
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isExpanded = expandedId === task.id;
            const suggs = suggestions[task.id];
            const isLoadingThis = loadingSugg === task.id;
            return (
              <div
                key={task.id}
                className="rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start gap-4 p-5">
                  <CheckSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/tasks/${task.id}`} className="block">
                      <h3 className="text-sm font-semibold text-gray-900 hover:text-indigo-700">
                        {task.title}
                      </h3>
                    </Link>
                    {task.description && (
                      <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      {!!task.roles?.length && (
                        <span>Roles: {task.roles.map((role) => role.name).join(", ")}</span>
                      )}
                      {!!task.procedures?.length && (
                        <span>
                          Procedimientos: {task.procedures.map((procedure) => procedure.code).join(", ")}
                        </span>
                      )}
                      {task.location && <span>Ubicación: {task.location}</span>}
                      {task.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.created_at).toLocaleDateString("es-AR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/tasks/${task.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Ver detalles
                  </Link>
                  <button
                    onClick={() => fetchSuggestions(task.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    Sugerir Capacitaciones
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="mb-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-gray-500">Procedimientos vinculados</p>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedProcedureByTask[task.id] ?? ""}
                            onChange={(event) =>
                              setSelectedProcedureByTask((current) => ({
                                ...current,
                                [task.id]: event.target.value,
                              }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
                          >
                            <option value="">Agregar procedimiento</option>
                            {procedures
                              ?.filter(
                                (procedure) =>
                                  !task.procedures?.some((linked) => linked.procedure_id === procedure.id),
                              )
                              .map((procedure) => (
                                <option key={procedure.id} value={procedure.id}>
                                  {procedure.code} · {procedure.title}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              !selectedProcedureByTask[task.id] || linkProcedureMutation.isPending
                            }
                            onClick={() =>
                              linkProcedureMutation.mutate({
                                taskId: task.id,
                                procedureId: selectedProcedureByTask[task.id],
                              })
                            }
                            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                          >
                            Vincular
                          </button>
                        </div>
                      </div>
                      {!task.procedures?.length ? (
                        <p className="text-sm text-gray-400">
                          Esta tarea todavía no tiene procedimientos vinculados.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {task.procedures.map((procedure) => (
                            <div
                              key={procedure.id}
                              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {procedure.code} · {procedure.title}
                                </p>
                                {procedure.is_primary && (
                                  <p className="text-xs text-gray-400">Marcado como principal</p>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={unlinkProcedureMutation.isPending}
                                onClick={() =>
                                  unlinkProcedureMutation.mutate({
                                    taskId: task.id,
                                    procedureId: procedure.procedure_id,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Unlink className="h-3 w-3" />
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isLoadingThis ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando capacitaciones relevantes…
                      </div>
                    ) : !suggs?.length ? (
                      <p className="text-sm text-gray-400">
                        No se encontraron capacitaciones relacionadas.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500">
                          Capacitaciones sugeridas:
                        </p>
                        {suggs.map((s) => (
                          <div
                            key={s.training_id}
                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {s.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                Confianza: {(s.score * 100).toFixed(0)}%
                              </p>
                              {s.snippet && (
                                <p className="mt-1 max-w-xl text-xs text-gray-500">{s.snippet}</p>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                              <LinkIcon className="h-3 w-3" />
                              Sugerida
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
