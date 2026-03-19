import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { incidentSeverityMeta, type IncidentItem } from "@/lib/operatorData";
import api from "@/services/api";

export default function OperatorIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: incidents = [], isLoading } = useQuery<IncidentItem[]>({
    queryKey: ["operator-incidents", "detail-list"],
    queryFn: () => api.get("/incidents").then((r) => r.data),
  });

  const incident = useMemo(() => incidents.find((item) => item.id === id) ?? null, [id, incidents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-lg font-semibold">Incidencia no encontrada</h1>
        <Link to="/incidents" className="mt-4 inline-flex text-sm font-medium underline">
          Volver a incidencias
        </Link>
      </div>
    );
  }

  const severity = incidentSeverityMeta[incident.severity] ?? {
    label: incident.severity,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pt-8">
      <Link
        to="/incidents"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a incidencias
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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

        <h1 className="mt-4 text-2xl font-bold text-gray-900">Detalle de incidencia</h1>
        <p className="mt-2 text-sm text-gray-500">
          Registrada el {new Date(incident.created_at).toLocaleString("es-AR")}
          {incident.location ? ` · ${incident.location}` : ""}
        </p>

        <div className="mt-6 rounded-xl bg-gray-50 p-5">
          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{incident.description}</p>
        </div>
      </div>
    </div>
  );
}
