import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { getStoredUser } from "@/lib/auth";
import api from "@/services/api";
import type { AssignmentItem, ComplianceItem } from "@/lib/operatorData";

export default function OperatorHomePage() {
  const user = getStoredUser();

  const { data: compliance = [], isLoading: complianceLoading } = useQuery<ComplianceItem[]>({
    queryKey: ["operator-home", "compliance", user?.id],
    queryFn: () => api.get("/compliance", { params: { user_id: user?.id } }).then((r) => r.data),
    enabled: Boolean(user?.id),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<AssignmentItem[]>({
    queryKey: ["operator-home", "assignments", user?.id],
    queryFn: () => api.get("/assignments", { params: { user_id: user?.id } }).then((r) => r.data),
    enabled: Boolean(user?.id),
  });

  const pendingAssignments = useMemo(
    () => assignments.filter((item) => item.status === "assigned" || item.status === "in_progress"),
    [assignments],
  );
  const completedAssignments = useMemo(
    () => assignments.filter((item) => item.status === "completed"),
    [assignments],
  );

  if (complianceLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pt-8">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-sm font-medium text-indigo-100">Home operativa</p>
        <h1 className="mt-2 text-3xl font-bold">Hola, {user?.name ?? "Operador"}</h1>
        <p className="mt-3 max-w-2xl text-sm text-indigo-100">
          Desde acá podés revisar los procedimientos asociados a tus roles, resolver tus trainings
          pendientes y reportar incidencias operativas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/trainings"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
          >
            Ir a mis trainings
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/incidents"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Reportar incidencia
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<ClipboardList className="h-5 w-5 text-indigo-600" />}
          label="Procedimientos asignados"
          value={compliance.length}
          detail="Asociados a tus roles activos"
        />
        <SummaryCard
          icon={<BookOpen className="h-5 w-5 text-amber-600" />}
          label="Trainings pendientes"
          value={pendingAssignments.length}
          detail="Por responder o completar"
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-green-600" />}
          label="Trainings completados"
          value={completedAssignments.length}
          detail="Con registro de envío"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tus procedimientos activos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Procedimientos relevantes según tus roles actuales.
              </p>
            </div>
            <Link to="/procedures" className="text-indigo-600 hover:text-indigo-700">
              <ChevronRight className="h-5 w-5 shrink-0" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {!compliance.length ? (
              <EmptyState message="No hay procedimientos activos para este usuario." />
            ) : (
              compliance.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to={`/procedures/${item.procedure_id}`}
                  className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{item.procedure_title}</h3>
                      <p className="mt-1 text-xs text-gray-500">{item.role_name || "Rol sin nombre"}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {item.version_number ? `v${item.version_number}` : "Sin versión"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Próximos trainings</h2>
              <p className="mt-1 text-sm text-gray-500">Continuá tus capacitaciones pendientes.</p>
            </div>
            <Link to="/trainings" className="text-indigo-600 hover:text-indigo-700">
              <ChevronRight className="h-5 w-5 shrink-0" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {!pendingAssignments.length ? (
              <EmptyState message="No tenés trainings pendientes en este momento." />
            ) : (
              pendingAssignments.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to={`/trainings/${item.id}`}
                  className="block rounded-xl border border-gray-200 p-4 transition hover:border-indigo-200 hover:shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-gray-900">
                    {item.training_title || "Training asignado"}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.due_date
                      ? `Vence ${new Date(item.due_date).toLocaleDateString("es-AR")}`
                      : "Sin fecha de vencimiento"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">{icon}</div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="mt-4 text-sm font-medium text-gray-900">{label}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}
