import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { getStoredUser } from "@/lib/auth";
import type { AssignmentItem, ComplianceItem } from "@/lib/operatorData";
import api from "@/services/api";

const assignmentStatusMeta: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  assigned: { label: "Asignado", className: "bg-blue-100 text-blue-800", icon: Clock },
  in_progress: { label: "En progreso", className: "bg-amber-100 text-amber-800", icon: Clock },
  completed: { label: "Completado", className: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

export default function OperatorTrainingsPage() {
  const user = getStoredUser();

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<AssignmentItem[]>({
    queryKey: ["operator-trainings", "assignments", user?.id],
    queryFn: () => api.get("/assignments", { params: { user_id: user?.id } }).then((r) => r.data),
    enabled: Boolean(user?.id),
  });

  const { data: compliance = [], isLoading: complianceLoading } = useQuery<ComplianceItem[]>({
    queryKey: ["operator-trainings", "compliance", user?.id],
    queryFn: () => api.get("/compliance", { params: { user_id: user?.id } }).then((r) => r.data),
    enabled: Boolean(user?.id),
  });

  const complianceByAssignmentId = useMemo(
    () => new Map(compliance.filter((item) => item.assignment_id).map((item) => [item.assignment_id as string, item])),
    [compliance],
  );

  if (assignmentsLoading || complianceLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trainings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Capacitaciones asignadas a tu usuario para revisar y responder.
        </p>
      </div>

      {!assignments.length ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center text-sm text-gray-500">
          No tenés trainings asignados en este momento.
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const status = assignmentStatusMeta[assignment.status] ?? {
              label: assignment.status,
              className: "bg-gray-100 text-gray-700",
              icon: Clock,
            };
            const Icon = status.icon;
            const complianceItem = complianceByAssignmentId.get(assignment.id);

            return (
              <Link
                key={assignment.id}
                to={`/trainings/${assignment.id}`}
                className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-gray-900">
                        {assignment.training_title || "Training asignado"}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      {complianceItem?.procedure_title && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                          {complianceItem.procedure_title}
                        </span>
                      )}
                      {assignment.due_date && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1">
                          Vence {new Date(assignment.due_date).toLocaleDateString("es-AR")}
                        </span>
                      )}
                      {assignment.score != null && (
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
                          Puntaje: {assignment.score}%
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-sm font-medium text-indigo-600">Abrir</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
