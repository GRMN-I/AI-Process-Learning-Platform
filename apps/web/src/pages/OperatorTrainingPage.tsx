import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getStoredUser } from "@/lib/auth";
import type { AssignmentItem, ComplianceItem, QuizQuestion, TrainingDetails } from "@/lib/operatorData";
import api from "@/services/api";

export default function OperatorTrainingPage() {
  const { id } = useParams<{ id: string }>();
  const user = getStoredUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitError, setSubmitError] = useState("");

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<AssignmentItem[]>({
    queryKey: ["operator-training", "assignments", user?.id],
    queryFn: () => api.get("/assignments", { params: { user_id: user?.id } }).then((r) => r.data),
    enabled: Boolean(user?.id),
  });

  const assignment = useMemo(() => assignments.find((item) => item.id === id) ?? null, [assignments, id]);

  const { data: training, isLoading: trainingLoading } = useQuery<TrainingDetails>({
    queryKey: ["operator-training", "details", assignment?.training_id],
    queryFn: () => api.get(`/trainings/${assignment?.training_id}`).then((r) => r.data),
    enabled: Boolean(assignment?.training_id),
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["operator-training", "quiz", assignment?.training_id],
    queryFn: () => api.get(`/trainings/${assignment?.training_id}/quiz`).then((r) => r.data),
    enabled: Boolean(assignment?.training_id),
  });

  const { data: compliance = [] } = useQuery<ComplianceItem[]>({
    queryKey: ["operator-training", "compliance", user?.id],
    queryFn: () => api.get("/compliance", { params: { user_id: user?.id } }).then((r) => r.data),
    enabled: Boolean(user?.id),
  });

  const complianceItem = useMemo(
    () => compliance.find((item) => item.assignment_id === assignment?.id) ?? null,
    [assignment?.id, compliance],
  );

  useEffect(() => {
    if (!questions.length) return;
    setAnswers((current) => {
      const next = { ...current };
      questions.forEach((question) => {
        if (!(question.id in next)) {
          next[question.id] = -1;
        }
      });
      return next;
    });
  }, [questions]);

  const submitMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/assignments/${assignment?.id}/submit`, {
          answers: questions.map((question) => ({
            question_id: question.id,
            selected: answers[question.id],
          })),
        })
        .then((r) => r.data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operator-training", "assignments", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["operator-trainings", "assignments", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["operator-home", "assignments", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["operator-home", "compliance", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["operator-procedures", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["operator-procedure-compliance", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["operator-training", "compliance", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["operator-trainings", "compliance", user?.id] }),
      ]);
      navigate("/trainings");
    },
    onError: (error: any) => {
      setSubmitError(error.response?.data?.detail ?? "No se pudo enviar el training.");
    },
  });

  const allAnswered = questions.length > 0 && questions.every((question) => (answers[question.id] ?? -1) >= 0);

  if (assignmentsLoading || trainingLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!assignment || !training) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-lg font-semibold">Training no disponible</h1>
        <p className="mt-2 text-sm">No se encontró una asignación válida para este training.</p>
        <Link to="/trainings" className="mt-4 inline-flex text-sm font-medium underline">
          Volver a trainings
        </Link>
      </div>
    );
  }

  const structure = training.structure?.structure_json;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <Link
          to="/trainings"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a trainings
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{training.title}</h1>
              <p className="mt-2 text-sm text-gray-500">
                {complianceItem?.procedure_title || training.procedure_title || "Training operativo"}
              </p>
              {training.summary && <p className="mt-3 text-sm text-gray-600">{training.summary}</p>}
            </div>
            {assignment.status === "completed" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Completado{assignment.score != null ? ` · ${assignment.score}%` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Contenido de la capacitación</h2>

        {structure ? (
          <div className="mt-5 space-y-6">
            {structure.objectives?.length ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Objetivos</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  {structure.objectives.map((objective, index) => (
                    <li key={`${objective}-${index}`} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {structure.steps?.length ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Pasos</h3>
                <div className="mt-3 space-y-3">
                  {structure.steps.map((step, index) => (
                    <div key={`${step.title}-${index}`} className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        Paso {index + 1}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{step.title}</p>
                      <p className="mt-2 text-sm text-gray-600">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {structure.critical_points?.length ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Puntos críticos</h3>
                <div className="mt-3 space-y-3">
                  {structure.critical_points.map((point, index) => (
                    <div key={`${point.text}-${index}`} className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">{point.text}</p>
                      {point.why && <p className="mt-1 text-sm text-amber-800">{point.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Este training todavía no tiene contenido estructurado visible.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Evaluación</h2>

        {!questions.length ? (
          <p className="mt-4 text-sm text-gray-500">Este training todavía no tiene preguntas disponibles.</p>
        ) : (
          <div className="mt-5 space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  {index + 1}. {question.question_json.question}
                </p>
                <div className="mt-4 space-y-2">
                  {question.question_json.options.map((option, optionIndex) => (
                    <label
                      key={`${question.id}-${optionIndex}`}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === optionIndex}
                        disabled={assignment.status === "completed"}
                        onChange={() => {
                          setSubmitError("");
                          setAnswers((current) => ({ ...current, [question.id]: optionIndex }));
                        }}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={!allAnswered || assignment.status === "completed" || submitMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar respuestas
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
