import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { clearAuth } from "@/lib/auth";
import api from "@/services/api";

type SeedMode = "demo" | "full";

export default function DevSeedPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reseedMutation = useMutation({
    mutationFn: async (mode: SeedMode) => {
      const path = mode === "demo" ? "/dev/seed/reseed-demo" : "/dev/seed/reseed-full";
      return api.post(path).then((response) => response.data);
    },
    onSuccess: (_data, mode) => {
      setError("");
      setMessage(
        mode === "demo"
          ? "Reseed demo ejecutado correctamente. Vas a volver al login."
          : "Full reseed ejecutado correctamente. Vas a volver al login."
      );

      window.setTimeout(() => {
        clearAuth();
        navigate("/login");
      }, 1200);
    },
    onError: (err: any) => {
      setMessage("");
      setError(err.response?.data?.detail ?? "No se pudo ejecutar el seed.");
    },
  });

  function handleRun(mode: SeedMode) {
    const confirmed = window.confirm(
      mode === "demo"
        ? "Esto va a borrar y recrear la data demo. ¿Querés continuar?"
        : "Esto va a borrar toda la base y volver a sembrar la demo. ¿Querés continuar?"
    );

    if (!confirmed) return;
    reseedMutation.mutate(mode);
  }

  const runningMode = reseedMutation.variables;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dev Seed</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vista oculta para resetear la data de la demo desde el frontend.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Herramienta destructiva</p>
            <p className="mt-1">
              Después de ejecutar cualquiera de estas acciones, la sesión actual puede dejar de ser
              válida. Por eso la pantalla te redirige nuevamente al login.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Reseed demo</h2>
              <p className="text-sm text-gray-500">Borra solo la data creada por el seed.</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Útil para volver a un estado limpio de demo sin tocar data ajena al seed.
          </p>

          <button
            type="button"
            onClick={() => handleRun("demo")}
            disabled={reseedMutation.isPending}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {reseedMutation.isPending && runningMode === "demo" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Ejecutar reseed demo
          </button>
        </section>

        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Full reseed</h2>
              <p className="text-sm text-gray-500">Borra toda la base y vuelve a sembrar.</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Esta opción es la más destructiva: limpia toda la data funcional antes de recrear la
            demo.
          </p>

          <button
            type="button"
            onClick={() => handleRun("full")}
            disabled={reseedMutation.isPending}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {reseedMutation.isPending && runningMode === "full" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Ejecutar full reseed
          </button>
        </section>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
