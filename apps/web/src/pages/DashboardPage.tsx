import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import {
  BookOpen,
  BarChart3,
  AlertTriangle,
  Loader2,
  GitBranch,
  Radar,
} from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardData {
  total_trainings: number;
  total_procedures: number;
  resolved_incidents: number;
  pending_incidents: number;
  total_roles: number;
  completion_rate: number;
  average_score: number;
  overdue_count: number;
  compliance_gap_count: number;
  open_change_events: number;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const stats = [
    {
      label: "Procedimientos",
      value: data?.total_procedures ?? 0,
      icon: GitBranch,
      color: "bg-indigo-50 text-indigo-600",
      ring: "ring-indigo-500/20",
      to: "/procedures",
    },
    {
      label: "Trainings",
      value: data?.total_trainings ?? 0,
      icon: BookOpen,
      color: "bg-blue-50 text-blue-600",
      ring: "ring-blue-500/20",
    },
    {
      label: "Incidentes pendientes",
      value: data?.pending_incidents ?? 0,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      ring: "ring-red-500/20",
      to: "/incidents",
    },
    {
      label: "Incidentes resueltos",
      value: data?.resolved_incidents ?? 0,
      icon: Radar,
      color: "bg-fuchsia-50 text-fuchsia-600",
      ring: "ring-fuchsia-500/20",
      to: "/incidents",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl pt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visualice los principales indicadores del sistema y obtenga una vision clara y actualizada de su estado general.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const cardContent = (
            <div
              className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${
                s.to ? "transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color} ring-4 ${s.ring}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="mt-1 text-sm text-gray-500">{s.label}</p>
            </div>
          );

          if (s.to) {
            return (
              <Link key={s.label} to={s.to} className="block">
                {cardContent}
              </Link>
            );
          }

          return <div key={s.label}>{cardContent}</div>;
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 text-gray-900">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold">Resumen</h2>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          El sistema cuenta con{" "}
          <span className="font-medium text-gray-700">{data?.total_procedures ?? 0}</span>{" "}
          procedimientos,{" "}
          <span className="font-medium text-gray-700">{data?.total_trainings ?? 0}</span> trainings
          derivados y{" "}
          <span className="font-medium text-gray-700">{data?.resolved_incidents ?? 0}</span>{" "}
          incidentes resueltos.
          {(data?.pending_incidents ?? 0) > 0 && (
            <span className="text-red-600">
              {" "}
              Hay {data?.pending_incidents} incidentes pendientes de análisis.
            </span>
          )}
        </p>
      </div>

    </div>
  );
}
