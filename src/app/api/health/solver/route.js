import { NextResponse } from "next/server";
import { checkSolverHealth } from "@/lib/solver/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await checkSolverHealth();

    return NextResponse.json(
      {
        success: true,
        solver: health,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Error verificando solver:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible consultar el solver.",
      },
      {
        status: 503,
      },
    );
  }
}