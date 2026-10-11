import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {RecordsManager} from "./records-manager";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getCurrentUser();if(!user)redirect("/");if(user.role==="cashier")redirect("/access-denied");return <main style={{background:"#f1f5fc",minHeight:"100vh",padding:"30px clamp(16px,4vw,50px)",color:"#1c3153"}}><div style={{maxWidth:1100,margin:"auto"}}><Link href="/dashboard" style={{color:"#1769e9",textDecoration:"none"}}>← Dashboard</Link><h1 style={{fontSize:30,fontWeight:850,marginTop:22}}>Purchases</h1><p style={{color:"#7184a0",marginBottom:22}}>Record purchase orders and their receipt status.</p><RecordsManager/></div></main>}