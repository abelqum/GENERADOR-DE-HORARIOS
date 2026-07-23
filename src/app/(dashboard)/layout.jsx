import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const { user, school } = await getCurrentSchool();

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header
          user={user}
          school={school}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}