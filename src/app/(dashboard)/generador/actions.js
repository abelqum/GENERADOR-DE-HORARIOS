"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buildSchedulePayload } from "@/lib/scheduler/buildSchedulePayload";
import { saveScheduleResult } from "@/lib/scheduler/saveScheduleResult";
import {
  checkSolverHealth,
  solveSchedule,
} from "@/lib/solver/client";
import { validateScheduleConfiguration } from "@/lib/scheduler/validateScheduleConfiguration";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

export async function generateScheduleAction(
  _previousState,
  _formData,
) {
  try {
    /*
     * Volvemos a validar en el servidor.
     * No confiamos únicamente en la validación mostrada
     * anteriormente en la página.
     */
    const validation =
      await validateScheduleConfiguration();

    if (!validation.canGenerate) {
      return {
        success: false,
        message: `La configuración contiene ${validation.errors.length} errores. Corrígelos antes de generar.`,
        versionId: null,
        solverStatus: null,
        errorCode:
          "VALIDATION_FAILED",
      };
    }

    /*
     * Comprobamos que FastAPI esté disponible antes de
     * construir y enviar todo el payload.
     */
    await checkSolverHealth();

    const { user } =
      await getCurrentSchool();

    const {
      school,
      activeAcademicPeriod,
      payload,
    } = await buildSchedulePayload();

    if (
      !Array.isArray(
        payload.assignments,
      ) ||
      payload.assignments.length === 0
    ) {
      return {
        success: false,
        message:
          "No existen asignaciones docentes para generar el horario.",
        versionId: null,
        solverStatus: null,
        errorCode:
          "NO_ASSIGNMENTS",
      };
    }

    const solverResult =
      await solveSchedule(payload, {
        timeoutMs: 70_000,
      });

    if (
      !solverResult ||
      typeof solverResult !== "object"
    ) {
      return {
        success: false,
        message:
          "El servicio de generación devolvió una respuesta inválida.",
        versionId: null,
        solverStatus: null,
        errorCode:
          "INVALID_SOLVER_RESPONSE",
      };
    }

    if (
      !["optimal", "feasible"].includes(
        solverResult.status,
      )
    ) {
      const statusMessages = {
        infeasible:
          "No existe una combinación que cumpla todas las restricciones actuales. Revisa disponibilidades, límites docentes y horas requeridas.",

        unknown:
          "El solver no pudo determinar una solución dentro del tiempo disponible.",

        invalid:
          "El problema enviado al solver contiene información inválida.",
      };

      return {
        success: false,

        message:
          solverResult.message ||
          statusMessages[
            solverResult.status
          ] ||
          "El solver no encontró un horario válido.",

        versionId: null,

        solverStatus:
          solverResult.status ?? null,

        errorCode:
          "SOLVER_NO_SOLUTION",
      };
    }

    if (
      !Array.isArray(
        solverResult.entries,
      )
    ) {
      return {
        success: false,
        message:
          "El solver indicó que encontró una solución, pero no devolvió las clases generadas.",
        versionId: null,
        solverStatus:
          solverResult.status,
        errorCode:
          "MISSING_ENTRIES",
      };
    }

    const expectedEntries =
      payload.assignments.reduce(
        (total, assignment) =>
          total +
          Number(
            assignment.weekly_periods ??
              0,
          ),
        0,
      );

    if (
      solverResult.entries.length !==
      expectedEntries
    ) {
      return {
        success: false,
        message: `El solver devolvió ${solverResult.entries.length} clases, pero se esperaban ${expectedEntries}. No se guardó una versión incompleta.`,
        versionId: null,
        solverStatus:
          solverResult.status,
        errorCode:
          "INCOMPLETE_SOLUTION",
      };
    }

    const scheduleVersion =
      await saveScheduleResult({
        school,
        activeAcademicPeriod,
        solverResult,
        userId: user.id,
      });

    revalidatePath("/generador");
    revalidatePath("/horarios");
    revalidatePath(
      `/horarios/${scheduleVersion.id}`,
    );

    return {
      success: true,

      message:
        solverResult.status === "optimal"
          ? "Se generó y guardó un horario óptimo."
          : "Se generó y guardó un horario válido.",

      versionId:
        scheduleVersion.id,

      solverStatus:
        solverResult.status,

      errorCode: null,
    };
  } catch (error) {
    console.error(
      "Error generando horario:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al generar el horario.",

      versionId: null,
      solverStatus: null,
      errorCode:
        "UNEXPECTED_ERROR",
    };
  }
}

export async function openGeneratedScheduleAction(
  formData,
) {
  const versionId = String(
    formData.get("versionId") ?? "",
  ).trim();

  if (!versionId) {
    redirect("/horarios");
  }

  redirect(`/horarios/${versionId}`);
}