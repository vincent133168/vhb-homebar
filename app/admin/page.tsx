import { redirect } from "next/navigation";
import { getAdminSession } from "../admin-auth";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login?mode=admin&returnTo=/admin");
  return <AdminDashboard userName={session.name} />;
}
