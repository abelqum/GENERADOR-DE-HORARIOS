import { redirect } from "next/navigation";
import RegisterForm from "@/components/auth/RegisterForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Crear administrador",
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <RegisterForm />;
}