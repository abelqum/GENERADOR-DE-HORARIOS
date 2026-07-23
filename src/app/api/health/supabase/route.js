import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from("schools")
      .select("*", {
        count: "exact",
        head: true,
      });

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      message: "La conexión con Supabase funciona correctamente.",
      schoolsCount: count ?? 0,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error comprobando Supabase:", error);

    return Response.json(
      {
        success: false,
        message: "No fue posible conectar con Supabase.",
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido.",
      },
      {
        status: 500,
      },
    );
  }
}