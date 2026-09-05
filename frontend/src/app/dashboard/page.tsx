import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Dashboard } from "@/components/dashboard/dashboard";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/auth");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  return <Dashboard email={user.email ?? ""} />;
}
