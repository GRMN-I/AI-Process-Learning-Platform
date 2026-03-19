import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { getStoredUser } from "@/lib/auth";
import { readStatusMeta, trainingStatusMeta, type ComplianceItem } from "@/lib/operatorData";
import api from "@/services/api";

export default function OperatorProceduresPage() {
  const user = getStoredUser();
  const [readFilter, setReadFilter] = useState<ComplianceItem["read_status"] | "all">("all");
  const [trainingFilter, setTrainingFilter] = useState<ComplianceItem["training_status"] | "all">("all");

  const { data: compliance = [], isLoading } = useQuery<ComplianceItem[]>({
    queryKey: ["operator-procedures", user?.id],
    queryFn: () => api.get("/compliance", { params: { user_id: user?.id } }).then((r) => r.data),
    enabled: Boolean(user?.id),
  });

  const procedures = useMemo(() => {
    const byProcedure = new Map<string, ComplianceItem>();
    compliance.forEach((item) => {
      if (!byProcedure.has(item.procedure_id)) {
        byProcedure.set(item.procedure_id, item);
      }
    });
    return Array.from(byProcedure.values());
  }, [compliance]);

  const filteredProcedures = useMemo(
    () =>
      procedures.filter((item) => {
        const matchesRead = readFilter === "all" || item.read_status === readFilter;
        const matchesTraining = trainingFilter === "all" || item.training_status === trainingFilter;
        return matchesRead && matchesTraining;
      }),
    [procedures, readFilter, trainingFilter],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procedimientos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Procedimientos visibles para tus roles activos, con estado de lectura y training de la version vigente.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-44 flex-col gap-2 text-sm">
            <span className="font-medium text-gray-700">Filtrar por lectura</span>
            <select
              value={readFilter}
              onChange={(event) => setReadFilter(event.target.value as ComplianceItem["read_status"] | "all")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-400"
            >
              <option value="all">Todos</option>
              <option value="sin_leer">Sin leer</option>
              <option value="leido">Leido</option>
            </select>
          </label>

          <label className="flex min-w-44 flex-col gap-2 text-sm">
            <span className="font-medium text-gray-700">Filtrar por training</span>
            <select
              value={trainingFilter}
              onChange={(event) => setTrainingFilter(event.target.value as ComplianceItem["training_status"] | "all")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-400"
            >
              <option value="all">Todos</option>
              <option value="sin_training">Sin training</option>
              <option value="incompleto">Incompleto</option>
              <option value="completo">Completo</option>
            </select>
          </label>

          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Mostrando {filteredProcedures.length} de {procedures.length}
          </div>
        </div>
      </div>

      {!procedures.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            No hay procedimientos asociados a este usuario.
          </p>
        </div>
      ) : !filteredProcedures.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No hay procedimientos que coincidan con esos filtros.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProcedures.map((item) => {
            const readStatus = readStatusMeta[item.read_status];
            const trainingStatus = trainingStatusMeta[item.training_status];

            return (
              <Link
                key={item.id}
                to={`/procedures/${item.procedure_id}`}
                className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      {item.role_name || "Rol activo"}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-gray-900">{item.procedure_title}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${readStatus.className}`}>
                      {readStatus.label}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${trainingStatus.className}`}>
                      {trainingStatus.label}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1">
                    {item.version_number ? `Versión v${item.version_number}` : "Sin versión publicada"}
                  </span>
                  {item.last_score != null && (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
                      Último score: {item.last_score}%
                    </span>
                  )}
                  {item.training_title && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                      {item.training_title}
                    </span>
                  )}
                  {item.read_at && (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
                      Leido {new Date(item.read_at).toLocaleDateString("es-AR")}
                    </span>
                  )}
                </div>

                <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
                  Ver detalle
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
