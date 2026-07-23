const DEFAULT_TIMEOUT_MS = 60_000;

function getSolverConfiguration() {
  const solverUrl = process.env.SOLVER_URL?.trim();
  const solverApiKey = process.env.SOLVER_API_KEY?.trim();

  if (!solverUrl) {
    throw new Error(
      "Falta la variable de entorno SOLVER_URL.",
    );
  }

  if (!solverApiKey) {
    throw new Error(
      "Falta la variable de entorno SOLVER_API_KEY.",
    );
  }

  return {
    solverUrl: solverUrl.replace(/\/+$/, ""),
    solverApiKey,
  };
}

async function parseResponse(response) {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    detail: text || "El solver devolvió una respuesta vacía.",
  };
}

export async function checkSolverHealth() {
  const {
    solverUrl,
    solverApiKey,
  } = getSolverConfiguration();

  let response;

  try {
    response = await fetch(
      `${solverUrl}/api/v1/health`,
      {
        method: "GET",

        headers: {
          "X-API-Key": solverApiKey,
        },

        cache: "no-store",

        signal:
          AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    if (
      error?.name === "TimeoutError" ||
      error?.name === "AbortError"
    ) {
      throw new Error(
        "El servicio de generación no respondió a tiempo.",
      );
    }

    throw new Error(
      "No fue posible conectarse con el servicio de generación. Verifica que FastAPI esté encendido y que SOLVER_URL sea correcta.",
      {
        cause: error,
      },
    );
  }

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "El servicio del solver no está disponible.",
    );
  }

  return data;
}
export async function solveSchedule(
  payload,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  const {
    solverUrl,
    solverApiKey,
  } = getSolverConfiguration();

  let response;

  try {
    response = await fetch(
      `${solverUrl}/api/v1/schedules/solve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": solverApiKey,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch (error) {
   if (
  error?.name === "TimeoutError" ||
  error?.name === "AbortError"
) {
      throw new Error(
        "El solver excedió el tiempo máximo de espera.",
      );
    }

    throw new Error(
      "No fue posible conectarse con el servicio de generación.",
      {
        cause: error,
      },
    );
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const validationMessage =
      Array.isArray(data.detail)
        ? data.detail
            .map((item) => {
              const location = Array.isArray(item.loc)
                ? item.loc.join(".")
                : "payload";

              return `${location}: ${item.msg}`;
            })
            .join(" | ")
        : data.detail;

    throw new Error(
      validationMessage ||
        "El solver rechazó la solicitud.",
    );
  }

  return data;
}