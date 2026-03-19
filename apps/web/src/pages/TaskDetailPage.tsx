import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { ArrowLeft, CheckSquare, Clock, Link as LinkIcon, Loader2, Sparkles, Unlink } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  roles?: Array<{ id: string; code: string; name: string }>;
  procedures?: Array<{ id: string; procedure_id: string; code: string; title: string; is_primary: boolean }>;
  location?: string;
  created_at?: string;
}

interface ProcedureOption {
  id: string;
  code: string;
  title: string;
}

interface SuggestedTraining {
  procedure_id?: string | null;
  procedure_version_id?: string | null;
  training_id?: string | null;
  title: string;
  score: number;
  snippet?: string | null;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", location: "" });
  const [selectedProcedureId, setSelectedProcedureId] = useState("");

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["task", id],
    queryFn: () => api.get(`/tasks/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });

  const { data: procedures } = useQuery<ProcedureOption[]>({
    queryKey: ["procedures"],
    queryFn: () => api.get("/procedures").then((r) => r.data),
  });

  const { data: suggestions, isLoading: isLoadingSuggestions } = useQuery<SuggestedTraining[]>({
    queryKey: ["task-suggestions", id],
    queryFn: () => api.post(`/tasks/${id}/suggest-trainings`).then((r) => r.data),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title ?? "",
      description: task.description ?? "",
      location: task.location ?? "",
    });
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/tasks/${id}`, form).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const linkProcedureMutation = useMutation({
    mutationFn: (procedureId: string) =>
      api.post(`/tasks/${id}/procedure-links`, { procedure_id: procedureId }).then((r) => r.data),
    onSuccess: () => {
      setSelectedProcedureId("");
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const unlinkProcedureMutation = useMutation({
    mutationFn: (procedureId: string) =>
      api.delete(`/tasks/${id}/procedure-links/${procedureId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-8">
      <div className="space-y-3">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a tareas
        </Link>
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <CheckSquare className="mt-1 h-6 w-6 text-indigo-500" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              {task.description && <p className="mt-2 text-sm text-gray-600">{task.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                {!!task.roles?.length && <span>Roles: {task.roles.map((role) => role.name).join(", ")}</span>}
                {task.location && <span>Ubicación: {task.location}</span>}
                {task.created_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(task.created_at).toLocaleDateString("es-AR")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate();
          }}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold text-gray-900">Editar tarea</h2>
          <div className="mt-4 space-y-3">
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Título"
            />
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Descripción"
            />
            <input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Ubicación"
            />
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
              value={selectedProcedureId}
              onChange={(event) => setSelectedProcedureId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            >
              <option value="">Agregar procedimiento</option>
              {procedures
                ?.filter((procedure) => !task.procedures?.some((linked) => linked.procedure_id === procedure.id))
                .map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>
                    {procedure.code} · {procedure.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!selectedProcedureId || linkProcedureMutation.isPending}
              onClick={() => linkProcedureMutation.mutate(selectedProcedureId)}
              className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              Vincular
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {!task.procedures?.length ? (
              <p className="text-sm text-gray-400">Esta tarea todavía no tiene procedimientos vinculados.</p>
            ) : (
              task.procedures.map((procedure) => (
                <div
                  key={procedure.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {procedure.code} · {procedure.title}
                    </p>
                    {procedure.is_primary && <p className="text-xs text-gray-400">Marcado como principal</p>}
                  </div>
                  <button
                    type="button"
                    disabled={unlinkProcedureMutation.isPending}
                    onClick={() => unlinkProcedureMutation.mutate(procedure.procedure_id)}
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Procedimientos sugeridos</h2>
        </div>
        {isLoadingSuggestions ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando procedimientos relevantes…
          </div>
        ) : !suggestions?.length ? (
          <p className="text-sm text-gray-400">No se encontraron procedimientos relacionados.</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((item) => (
              <div
                key={item.training_id ?? item.procedure_version_id ?? item.title}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-400">Confianza: {(item.score * 100).toFixed(0)}%</p>
                  {item.snippet && <p className="mt-1 max-w-3xl text-xs text-gray-500">{item.snippet}</p>}
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                  <LinkIcon className="h-3 w-3" />
                  Sugerida
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
