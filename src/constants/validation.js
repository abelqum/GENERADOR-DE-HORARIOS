export const VALIDATION_LEVELS = {
  error: {
    value: "error",
    label: "Error",
    description:
      "Impide generar el horario hasta que se corrija.",
  },

  warning: {
    value: "warning",
    label: "Advertencia",
    description:
      "No impide generar, pero puede reducir la calidad del horario.",
  },

  success: {
    value: "success",
    label: "Correcto",
    description:
      "La configuración cumple esta validación.",
  },

  info: {
    value: "info",
    label: "Información",
    description:
      "Dato general relacionado con la configuración.",
  },
};