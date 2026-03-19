import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import api from "@/services/api";

interface ComplianceRow {
  id: string;
  user_name: string;
  role_name?: string | null;
  procedure_title: string;
  version_number?: number | null;
  training_title?: string | null;
  status: string;
  due_date?: string | null;
  last_score?: number | null;
}

const statusStyles: Record<string, string> = {
  compliant: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_training: "bg-blue-100 text-blue-700",
  missing_training: "bg-red-100 text-red-700",
};

export default function CompliancePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<ComplianceRow[]>({
    queryKey: ["compliance"],
    queryFn: () => api.get("/compliance").then((r) => r.data),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post("/compliance/sync"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="mx-auto max-w-5xl pt-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance operativo</h1>
          <p className="mt-1 text-sm text-gray-500">
            Brechas entre roles activos, procedimientos vigentes y evidencia de capacitación.
          </p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Recalcular
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            No hay obligaciones calculadas todavía.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-gray-600">
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Procedimiento</th>
                <th className="px-4 py-3">Training</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Puntaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.user_name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.role_name || "Sin rol"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.procedure_title}
                    {row.version_number != null && (
                      <span className="ml-2 text-xs text-gray-400">v{row.version_number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.training_title || "Falta training"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusStyles[row.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.last_score != null ? `${row.last_score}%` : <AlertTriangle className="h-4 w-4" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
