"use client";

import { useRef } from "react";
import { showConfirmAlert } from "@/lib/alerts/swal";

export default function ConfirmSubmitButton({
  title = "¿Confirmar operación?",
  message = "Esta acción realizará cambios.",
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
  children,
  className = "",
  disabled = false,
}) {
  const submittingRef = useRef(false);

  async function handleClick(event) {
    if (submittingRef.current) {
      return;
    }

    event.preventDefault();

    /*
     * Guardamos la referencia antes del await.
     * React puede liberar event.currentTarget después.
     */
    const button = event.currentTarget;
    const form = button.closest("form");

    if (!form) {
      return;
    }

    const confirmed = await showConfirmAlert({
      title,
      text: message,
      confirmButtonText,
      cancelButtonText,
    });

    if (!confirmed) {
      return;
    }

    submittingRef.current = true;
    form.requestSubmit();
  }

  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}