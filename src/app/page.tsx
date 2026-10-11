import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // The login route reports configuration or connection failures without exposing details.
  }
  if (user) redirect("/dashboard");
  return <LoginForm />;
}