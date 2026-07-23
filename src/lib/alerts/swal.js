import Swal from "sweetalert2";

export function showSuccessAlert({
  title = "Operación completada",
  text = "",
} = {}) {
  return Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#0f172a",
  });
}

export function showErrorAlert({
  title = "Ocurrió un error",
  text = "",
} = {}) {
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#0f172a",
  });
}

export function showInfoAlert({
  title = "Información",
  text = "",
} = {}) {
  return Swal.fire({
    icon: "info",
    title,
    text,
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#0f172a",
  });
}

export async function showConfirmAlert({
  title = "¿Confirmar operación?",
  text = "Esta acción realizará cambios en el sistema.",
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
  icon = "warning",
} = {}) {
  const result = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: "#0f172a",
    cancelButtonColor: "#64748b",
  });

  return result.isConfirmed;
}

export function showLoadingAlert({
  title = "Procesando...",
  text = "Espera mientras se completa la operación.",
} = {}) {
  Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function closeAlert() {
  Swal.close();
}