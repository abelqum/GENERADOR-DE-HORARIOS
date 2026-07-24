"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getStringValue(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

export async function loginAction(_previousState, formData) {
  const email = normalizeEmail(formData.get("email"));
  const password = getStringValue(formData, "password");

  if (!email || !password) {
    return {
      success: false,
      message: "Captura tu correo electrónico y contraseña.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      message: translateAuthError(error.message),
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function registerAction(_previousState, formData) {
  const fullName = getStringValue(formData, "fullName");
  const email = normalizeEmail(formData.get("email"));
  const password = getStringValue(formData, "password");
  const confirmPassword = getStringValue(formData, "confirmPassword");

  if (fullName.length < 3) {
    return {
      success: false,
      message: "Escribe el nombre completo del administrador.",
    };
  }

  if (!email) {
    return {
      success: false,
      message: "Escribe un correo electrónico válido.",
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      message: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: "Las contraseñas no coinciden.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return {
      success: false,
      message: translateAuthError(error.message),
    };
  }

  /*
   * Cuando la confirmación de correo está desactivada,
   * Supabase puede crear la sesión inmediatamente.
   */
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/configuracion/inicial");
  }

  return {
    success: true,
    message:
      "Cuenta creada. Revisa tu correo electrónico para confirmar el registro.",
  };
}

export async function logoutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}

function translateAuthError(message) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "El correo o la contraseña son incorrectos.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "Ya existe una cuenta con ese correo electrónico.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Primero debes confirmar tu correo electrónico.";
  }

  if (normalizedMessage.includes("password")) {
    return "La contraseña no cumple los requisitos de seguridad.";
  }

  if (normalizedMessage.includes("rate limit")) {
    return "Se realizaron demasiados intentos. Espera un momento.";
  }

  return "No fue posible completar la autenticación.";
}
