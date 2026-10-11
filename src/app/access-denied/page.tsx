import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="access-denied-page">
      <p className="eyebrow">ACCESS RESTRICTED</p>
      <h1>This area is for store managers.</h1>
      <p>Your staff role does not permit access to this page.</p>
      <Link href="/dashboard">Return to dashboard</Link>
    </main>
  );
}