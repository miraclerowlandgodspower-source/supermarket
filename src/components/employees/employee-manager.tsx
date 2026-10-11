"use client";
import { useEffect,useState,type FormEvent } from "react";
type Employee={id:string;name:string;email:string;role:"manager"|"cashier";active:boolean;monthlySalaryNgn:number;salaryPaidThrough:string};
const currency=new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0});
export function EmployeeManager(){
 const [staff,setStaff]=useState<Employee[]>([]);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [month,setMonth]=useState(()=>new Date().toLocaleDateString("en-CA",{year:"numeric",month:"2-digit",timeZone:"Africa/Lagos"}).slice(0,7));
 async function load(){
  try{const res=await fetch("/api/employees",{cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.error||"Could not load employees");setStaff(data.items)}catch(e){setMessage(e instanceof Error?e.message:"Failed to load employees")}
 }
 useEffect(()=>{void load()},[]);
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");const form=e.currentTarget;const data=new FormData(form);
  try{
   const res=await fetch("/api/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:data.get("name"),email:data.get("email"),password:data.get("password"),role:data.get("role"),monthlySalaryNgn:Number(data.get("salary"))})});
   const body=await res.json();if(!res.ok)throw Error(body.error||"Could not create employee");form.reset();setMessage("Employee account created. Share credentials securely and have the employee change their password.");await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not create employee")}finally{setBusy(false)}
 }
 async function update(id:string,patch:Record<string,unknown>){
  setBusy(true);setMessage("");
  try{const res=await fetch("/api/employees",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...patch})});const body=await res.json();if(!res.ok)throw Error(body.error||"Could not update employee");await load();setMessage("Employee record updated.")}catch(e){setMessage(e instanceof Error?e.message:"Update failed")}finally{setBusy(false)}
 }
 const field:React.CSSProperties={padding:"11px 12px",border:"1px solid #dbe5f3",borderRadius:9,width:"100%",minWidth:0,background:"white",color:"#183150"};
 return <div style={{display:"grid",gap:22}}>
 <form onSubmit={create} style={{background:"white",padding:24,borderRadius:14,border:"1px solid #e2eaf7"}}>
 <h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>Create Employee Account</h2>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
 <label>Full name<input style={field} name="name" required minLength={2}/></label>
 <label>Work email<input style={field} name="email" type="email" required/></label>
 <label>Initial password<input style={field} name="password" type="password" required minLength={12} autoComplete="new-password"/></label>
 <label>Access role<select style={field} name="role"><option value="cashier">Cashier</option><option value="manager">Manager</option></select></label>
 <label>Monthly salary (₦)<input style={field} name="salary" type="number" min="0" step=".01" required/></label>
 </div>
 <p style={{fontSize:12,color:"#687d9a",marginTop:12}}>Only the owner can create staff accounts. Passwords are securely hashed and are never shown again.</p>
 <button disabled={busy} style={{background:"#1769e9",color:"white",padding:"12px 20px",border:0,borderRadius:9,cursor:"pointer",marginTop:12,fontWeight:750}}>{busy?"Saving…":"Create employee"}</button>
 </form>
 <section style={{background:"white",padding:24,borderRadius:14,border:"1px solid #e2eaf7"}}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,flexWrap:"wrap"}}><h2 style={{fontSize:18,fontWeight:800}}>Staff & Payroll Status</h2><label style={{fontSize:12}}>Payroll month <input type="month" style={{...field,width:180}} value={month} onChange={e=>setMonth(e.target.value)}/></label></div>
 <p role="status" style={{fontSize:12,color:"#1e62bc",margin:"10px 0"}}>{message}</p>
 <div style={{overflowX:"auto"}}><table style={{width:"100%",minWidth:720,borderCollapse:"collapse",textAlign:"left",fontSize:12}}><thead><tr>{["Employee","Role","Monthly salary","Salary status","Account","Action"].map(t=><th key={t} style={{padding:12,background:"#edf3ff",color:"#536e97"}}>{t}</th>)}</tr></thead><tbody>{staff.map(s=><tr key={s.id} style={{borderBottom:"1px solid #e8eef7"}}><td style={{padding:12}}><strong>{s.name}</strong><div style={{color:"#8090aa"}}>{s.email}</div></td><td style={{padding:12,textTransform:"capitalize"}}>{s.role}</td><td style={{padding:12}}>{currency.format(s.monthlySalaryNgn)}</td><td style={{padding:12,color:s.salaryPaidThrough>=month?"#0e9774":"#d08028",fontWeight:700}}>{s.salaryPaidThrough>=month?"Paid":"Unpaid"}</td><td style={{padding:12}}>{s.active?"Active":"Disabled"}</td><td style={{padding:12,display:"flex",flexWrap:"wrap",gap:6}}><button disabled={busy||!month} onClick={()=>void update(s.id,{salaryPaidThrough:s.salaryPaidThrough>=month?"":month})} style={{padding:8,border:"1px solid #a9c2e9",borderRadius:7,background:"#eef4ff",color:"#175bbd"}}>{s.salaryPaidThrough>=month?"Mark unpaid":"Mark paid"}</button><button disabled={busy} onClick={()=>void update(s.id,{active:!s.active})} style={{padding:8,border:"1px solid #d8e0ef",borderRadius:7,background:"white"}}>{s.active?"Disable":"Enable"}</button></td></tr>)}</tbody></table>{!staff.length&&<p style={{color:"#8090aa",padding:15}}>No employees yet.</p>}</div>
 <p style={{fontSize:11,color:"#8493aa",marginTop:14}}>Paid/unpaid is a manual administrative status, not proof of bank payment. For detailed payroll history, payslips and audit trails, a dedicated payroll ledger is needed.</p>
 </section></div>;
}