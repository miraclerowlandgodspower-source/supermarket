import { redirect } from "next/navigation";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return <PosTerminal cashierName={user.name} />;
}