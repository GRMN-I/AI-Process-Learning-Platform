import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Radar, Sparkles } from "lucide-react";
import api from "@/services/api";

interface ChangeEvent {
  id: string;
  title: string;
  description: string;
  source_type: string;
  status: string;
  effective_from?: string | null;
}

interface ImpactAssessment {
  id: string;
  procedure_title: string;
  version_number?: number | null;
  training_title?: string | null;
  confidence: number;
  impact_level: string;
  rationale?: string | null;
}

export default function ChangeEventsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    source_type: "manual",
    status: "draft",
    effective_from: "",
  });
  const [impacts, setImpacts] = useState<Record<string, ImpactAssessment[]>>({});

  const { data: items, isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ["change-events"],
    queryFn: () => api.get("/change-events").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/change-events", {
        ...form,
        effective_from: form.effective_from || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-events"] });
      setForm({
        title: "",
        description: "",
        source_type: "manual",
        status: "draft",
        effective_from: "",
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (changeEventId: string) =>
      api.post(`/change-events/${changeEventId}/analyze-impact`).then((r) => r.data),
    onSuccess: (data, changeEventId) => {
      setImpacts((current) => ({ ...current, [changeEventId]: data }));
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change events</h1>
        <p className="mt-1 text-sm text-gray-500">
          Intake de cambios internos o externos y análisis de impacto sobre procedimientos versionados.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
        className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 md:grid-cols-2"
      >
        <input
          required
          placeholder="Título"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        <select
          value={form.source_type}
          onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value }))}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="manual">Manual</option>
          <option value="regulation">Normativa</option>
          <option value="incident">Incidente</option>
          <option value="audit">Auditoría</option>
          <option value="supplier_change">Cambio de proveedor</option>
          <option value="equipment_change">Cambio de equipamiento</option>
          <option value="process_improvement">Mejora operativa</option>
        </select>
        <textarea
          required
          rows={3}
          placeholder="Descripción del cambio"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          className="md:col-span-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        <select
          value={form.status}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="closed">Closed</option>
        </select>
        <input
          type="date"
          value={form.effective_from}
          onChange={(event) =>
            setForm((current) => ({ ...current, effective_from: event.target.value }))
          }
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar change event
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {items?.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      {item.source_type}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {item.status}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-gray-900">{item.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
                <button
                  onClick={() => analyzeMutation.mutate(item.id)}
                  disabled={analyzeMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                >
                  {analyzeMutation.isPending && analyzeMutation.variables === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Analizar impacto
                </button>
              </div>

              {impacts[item.id]?.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {impacts[item.id].map((impact) => (
                    <div key={impact.id} className="rounded-xl bg-gray-50 p-4">
                      <div className="flex items-center gap-2">
                        <Radar className="h-4 w-4 text-indigo-600" />
                        <p className="font-medium text-gray-900">
                          {impact.procedure_title}
                          {impact.version_number != null && (
                            <span className="ml-2 text-xs text-gray-500">v{impact.version_number}</span>
                          )}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Impacto: {impact.impact_level} · Confianza {(impact.confidence * 100).toFixed(0)}%
                      </p>
                      {impact.training_title && (
                        <p className="mt-2 text-xs text-indigo-700">
                          Training derivado disponible: {impact.training_title}
                        </p>
                      )}
                      {impact.rationale && (
                        <p className="mt-2 text-sm text-gray-600">{impact.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
