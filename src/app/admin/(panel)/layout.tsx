import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin-shell min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      <AdminNav email={admin.email} />
      <main className="min-w-0 px-4 pb-28 pt-5 md:px-8 md:pt-8 lg:pb-10">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
