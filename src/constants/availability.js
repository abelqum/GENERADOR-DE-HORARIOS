export const AVAILABILITY_TYPES = {
  available: {
    value: "available",
    label: "Disponible",
    shortLabel: "Disponible",
    description: "El profesor puede trabajar normalmente.",
    weight: 0,
    className:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    activeClassName:
      "border-slate-500 bg-slate-100 text-slate-900",
  },

  preferred: {
    value: "preferred",
    label: "Preferido",
    shortLabel: "Preferido",
    description: "El profesor prefiere recibir clase en este periodo.",
    weight: 40,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    activeClassName:
      "border-blue-500 bg-blue-100 text-blue-800",
  },

  avoid: {
    value: "avoid",
    label: "Evitar",
    shortLabel: "Evitar",
    description: "Puede utilizarse, pero solamente si es necesario.",
    weight: -80,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    activeClassName:
      "border-amber-500 bg-amber-100 text-amber-800",
  },

  required: {
    value: "required",
    label: "Prioridad máxima",
    shortLabel: "Prioridad",
    description: "Es uno de las horas más convenientes para el profesor.",
    weight: 100,
    className:
      "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
    activeClassName:
      "border-violet-500 bg-violet-100 text-violet-800",
  },

  unavailable: {
    value: "unavailable",
    label: "No disponible",
    shortLabel: "No disponible",
    description: "El profesor no puede impartir clases en este periodo.",
    weight: -1000,
    className:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    activeClassName:
      "border-red-500 bg-red-100 text-red-800",
  },
};

export const AVAILABILITY_OPTIONS = Object.values(
  AVAILABILITY_TYPES,
);

export function getAvailabilityConfiguration(type) {
  return (
    AVAILABILITY_TYPES[type] ||
    AVAILABILITY_TYPES.available
  );
}