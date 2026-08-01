"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildSchedulePayload } from "@/lib/scheduler/buildSchedulePayload";
import { saveScheduleResult } from "@/lib/scheduler/saveScheduleResult";
import { validateScheduleConfiguration } from "@/lib/scheduler/validateScheduleConfiguration";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { checkSolverHealth, solveSchedule } from "@/lib/solver/client";

function normalizeDiagnostics(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (diagnostic) =>
        diagnostic &&
        typeof diagnostic === "object" &&
        typeof diagnostic.message === "string",
    )
    .map((diagnostic) => ({
      type:
        typeof diagnostic.type === "string" ? diagnostic.type : "configuration",

      severity: diagnostic.severity === "critical" ? "critical" : "warning",

      message: diagnostic.message,

      suggestion:
        typeof diagnostic.suggestion === "string"
          ? diagnostic.suggestion
          : null,

      assignmentId: diagnostic.assignment_id ?? null,

      groupId: diagnostic.group_id ?? null,

      teacherId: diagnostic.teacher_id ?? null,

      subjectId: diagnostic.subject_id ?? null,

      dayOfWeek: Number.isInteger(diagnostic.day_of_week)
        ? diagnostic.day_of_week
        : null,

      shiftPeriodId: diagnostic.shift_period_id ?? null,

      currentValue: Number.isFinite(diagnostic.current_value)
        ? diagnostic.current_value
        : null,

      requiredValue: Number.isFinite(diagnostic.required_value)
        ? diagnostic.required_value
        : null,

      difference: Number.isFinite(diagnostic.difference)
        ? diagnostic.difference
        : null,
    }));
}

function getExpectedEntries(payload) {
  return (payload.assignments ?? []).reduce(
    (total, assignment) => total + Number(assignment.weekly_periods ?? 0),
    0,
  );
}

function createFailureState({
  message,
  solverStatus = null,
  solutionMode = null,
  errorCode,
  diagnostics = [],
  warnings = [],
  relaxedEntriesCount = 0,
  relaxedRequiredEntries = 0,
}) {
  return {
    success: false,
    message,
    versionId: null,
    solverStatus,
    solutionMode,
    errorCode,
    diagnostics,
    warnings,
    relaxedEntriesCount,
    relaxedRequiredEntries,
  };
}

export async function generateScheduleAction(_previousState, _formData) {
  try {
    const validation = await validateScheduleConfiguration();

    if (!validation.canGenerate) {
      return createFailureState({
        message:
          `La configuración contiene ` +
          `${validation.errors.length} errores. ` +
          "Corrígelos antes de generar.",

        errorCode: "VALIDATION_FAILED",

        diagnostics: (validation.errors ?? []).map((error) => ({
          type: "configuration",
          severity: "critical",

          message:
            typeof error === "string"
              ? error
              : error?.message || "Existe un error de configuración.",

          suggestion: null,
        })),
      });
    }

    await checkSolverHealth();

    const { user } = await getCurrentSchool();

    const {
      school,
      activeAcademicPeriod,
      payload,
      fixedGroupSlots = [],
    } = await buildSchedulePayload();

    if (
      !Array.isArray(payload.assignments) ||
      payload.assignments.length === 0
    ) {
      return createFailureState({
        message: "No existen asignaciones docentes para generar el horario.",

        errorCode: "NO_ASSIGNMENTS",
      });
    }

    if (!Array.isArray(fixedGroupSlots) || fixedGroupSlots.length === 0) {
      return createFailureState({
        message: "No existen talleres fijos configurados para los grupos.",

        errorCode: "NO_FIXED_WORKSHOPS",
      });
    }

    const expectedEntries = getExpectedEntries(payload);

    const solverResult = await solveSchedule(payload, {
      /*
       * El solver puede ejecutar:
       *
       * 1. Modelo estricto.
       * 2. Modo práctico.
       * 3. Diagnóstico final.
       *
       * Este tiempo solamente corresponde
       * al cliente de Next.js.
       */
      timeoutMs: 160_000,
    });

    if (!solverResult || typeof solverResult !== "object") {
      return createFailureState({
        message: "El servicio de generación devolvió una respuesta inválida.",

        errorCode: "INVALID_SOLVER_RESPONSE",
      });
    }

    const diagnostics = normalizeDiagnostics(solverResult.diagnostics);

    const warnings = Array.isArray(solverResult.warnings)
      ? solverResult.warnings.filter((warning) => typeof warning === "string")
      : [];

    const relaxedEntriesCount = Array.isArray(solverResult.relaxed_entries)
      ? solverResult.relaxed_entries.length
      : 0;

    if (!["optimal", "feasible"].includes(solverResult.status)) {
      const statusMessages = {
        infeasible:
          "No existe una combinación completa dentro de la disponibilidad actual de los docentes.",

        unknown:
          "El solver no pudo determinar una solución dentro del tiempo disponible.",

        model_invalid:
          "El problema enviado al solver contiene información inválida.",

        invalid: "El problema enviado al solver contiene información inválida.",

        error: "Ocurrió un error durante la optimización del horario.",
      };

      return createFailureState({
        message:
          solverResult.message ||
          statusMessages[solverResult.status] ||
          "El solver no encontró un horario válido.",

        solverStatus: solverResult.status ?? null,

        solutionMode: solverResult.solution_mode ?? null,

        errorCode: "SOLVER_NO_SOLUTION",

        diagnostics,
        warnings,

        relaxedEntriesCount,

        relaxedRequiredEntries: expectedEntries,
      });
    }

    if (!Array.isArray(solverResult.entries)) {
      return createFailureState({
        message:
          "El solver indicó que encontró una solución, pero no devolvió las clases generadas.",

        solverStatus: solverResult.status,

        solutionMode: solverResult.solution_mode ?? null,

        errorCode: "MISSING_ENTRIES",

        diagnostics,
        warnings,
      });
    }

    if (solverResult.entries.length !== expectedEntries) {
      return createFailureState({
        message:
          `El solver devolvió ` +
          `${solverResult.entries.length} clases, ` +
          `pero se esperaban ${expectedEntries}. ` +
          "No se guardó una versión incompleta.",

        solverStatus: solverResult.status,

        solutionMode: solverResult.solution_mode ?? null,

        errorCode: "INCOMPLETE_SOLUTION",

        diagnostics,
        warnings,
      });
    }

    const scheduleVersion = await saveScheduleResult({
      school,
      activeAcademicPeriod,
      solverResult,
      fixedGroupSlots,
      userId: user.id,
    });

    revalidatePath("/generador");

    revalidatePath("/horarios");

    revalidatePath(`/horarios/${scheduleVersion.id}`);

    const solutionMode = solverResult.solution_mode ?? "strict";

    return {
      success: true,

      message:
        solverResult.message ||
        (solutionMode === "practical"
          ? "Se generó un horario práctico dentro de la disponibilidad de los docentes."
          : solverResult.status === "optimal"
            ? "Se generó y guardó un horario óptimo respetando los talleres fijos."
            : "Se generó y guardó un horario válido respetando los talleres fijos."),

      versionId: scheduleVersion.id,

      solverStatus: solverResult.status,

      solutionMode,

      errorCode: null,

      diagnostics,
      warnings,

      relaxedEntriesCount: 0,

      relaxedRequiredEntries: 0,
    };
  } catch (error) {
    console.error("Error generando horario:", error);

    return createFailureState({
      message:
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al generar el horario.",

      errorCode: "UNEXPECTED_ERROR",
    });
  }
}

export async function openGeneratedScheduleAction(formData) {
  const versionId = String(formData.get("versionId") ?? "").trim();

  if (!versionId) {
    redirect("/horarios");
  }

  redirect(`/horarios/${versionId}`);
}
