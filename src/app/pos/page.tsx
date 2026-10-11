import { redirect } from "next/navigation";
import { StaffShell } from "@/app/dashboard/staff-shell";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return <StaffShell name={user.name} role={user.role} active="/pos"><PosTerminal cashierName={user.name} /></StaffShell>;
}