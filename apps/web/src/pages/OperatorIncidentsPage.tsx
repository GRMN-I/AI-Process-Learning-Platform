import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { incidentSeverityMeta, type IncidentItem, type RoleOption } from "@/lib/operatorData";
import api from "@/services/api";

export default function OperatorIncidentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    severity: "medium",
    role_id: "",
    location: "",
  });

  const { data: incidents = [], isLoading } = useQuery<IncidentItem[]>({
    queryKey: ["operator-incidents"],
    queryFn: () => api.get("/incidents").then((r) => r.data),
  });

  const { data: roles = [] } = useQuery<RoleOption[]>({
    queryKey: ["operator-incidents", "roles"],
    queryFn: () => api.get("/roles").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api
        .post("/incidents", {
          description: form.description,
          severity: form.severity,
          role_id: form.role_id || undefined,
          location: form.location,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-incidents"] });
      setShowForm(false);
      setForm({ description: "", severity: "medium", role_id: "", location: "" });
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
          <p className="mt-1 text-sm text-gray-500">
            Reportá desvíos operativos y consultá el historial general de incidencias.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nueva incidencia
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Descripción</span>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Describí lo sucedido y el contexto operativo."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Severidad</span>
              <select
                value={form.severity}
                onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Rol</span>
              <select
                value={form.role_id}
                onChange={(event) => setForm((current) => ({ ...current, role_id: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Sin rol</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Ubicación</span>
              <input
                type="text"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Ej: Sucursal Centro"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar incidencia
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !incidents.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No hay incidencias registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => {
            const severity = incidentSeverityMeta[incident.severity] ?? {
              label: incident.severity,
              className: "bg-gray-100 text-gray-700",
            };

            return (
              <Link
                key={incident.id}
                to={`/incidents/${incident.id}`}
                className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severity.className}`}>
                        {severity.label}
                      </span>
                      {incident.role_name && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {incident.role_name}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-gray-700">{incident.description}</p>
                    <p className="mt-3 text-xs text-gray-400">
                      {new Date(incident.created_at).toLocaleString("es-AR")}
                      {incident.location ? ` · ${incident.location}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-indigo-600" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
