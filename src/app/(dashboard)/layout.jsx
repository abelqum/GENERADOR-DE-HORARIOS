import DashboardShell from "@/components/layout/DashboardShell";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const { user, school } = await getCurrentSchool();

  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Administrador";

  const userEmail = user?.email || "";

  return (
    <DashboardShell userName={userName} userEmail={userEmail} school={school}>
      {children}
    </DashboardShell>
  );
}
