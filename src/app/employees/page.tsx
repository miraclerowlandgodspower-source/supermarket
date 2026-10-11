import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { EmployeeManager } from "@/components/employees/employee-manager";
export const dynamic="force-dynamic";
export default async function EmployeesPage(){
 const user=await getCurrentUser();
 if(!user)redirect("/");
 if(user.role!=="owner")redirect("/access-denied");
 return <main style={{minHeight:"100vh",background:"#f1f5fc",padding:"30px clamp(16px,4vw,54px)"}}><div style={{maxWidth:1100,margin:"auto"}}><Link href="/dashboard" style={{color:"#1b65d8",fontWeight:700,textDecoration:"none"}}>← Dashboard</Link><h1 style={{fontSize:32,fontWeight:850,marginTop:22,color:"#142d53"}}>Employee Management</h1><p style={{color:"#697d9a",marginBottom:24}}>Owner-only staff accounts, roles and salary status</p><EmployeeManager/></div></main>;
}