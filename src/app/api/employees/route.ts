import { NextResponse, type NextRequest } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { requireRole, hasTrustedOrigin, AuthorizationError } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/user";
import { Session } from "@/models/session";

const createSchema = z.object({
 name:z.string().trim().min(2).max(120),
 email:z.email().max(254).transform(v=>v.trim().toLowerCase()),
 password:z.string().min(12).max(128),
 role:z.enum(["manager","cashier"]),
 monthlySalaryNgn:z.number().finite().min(0).max(100000000),
});
const updateSchema=z.object({
 id:z.string().regex(/^[a-f\d]{24}$/i),
 monthlySalaryNgn:z.number().finite().min(0).max(100000000).optional(),
 salaryPaidThrough:z.union([z.literal(""),z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)]).optional(),
 active:z.boolean().optional(),
}).refine(v=>v.monthlySalaryNgn!==undefined||v.salaryPaidThrough!==undefined||v.active!==undefined);
const err=(e:unknown)=>e instanceof AuthorizationError?NextResponse.json({error:e.message},{status:e.status}):NextResponse.json({error:"Employee request failed."},{status:500});
export async function GET(){
 try{
  await requireRole(["owner"]); await connectToDatabase();
  const staff=await User.find({role:{$in:["manager","cashier"]}}).select("name email role active monthlySalaryKobo salaryPaidThrough createdAt").sort({createdAt:-1}).lean();
  return NextResponse.json({items:staff.map(s=>({id:String(s._id),name:s.name,email:s.email,role:s.role,active:s.active,monthlySalaryNgn:(s.monthlySalaryKobo??0)/100,salaryPaidThrough:s.salaryPaidThrough??""}))},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return err(e)}
}
export async function POST(req:NextRequest){
 if(!hasTrustedOrigin(req))return NextResponse.json({error:"Untrusted request."},{status:403});
 try{
  await requireRole(["owner"]);
  const parsed=createSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Enter valid employee details. Password must be at least 12 characters."},{status:400});
  await connectToDatabase();
  const {name,email,password,role,monthlySalaryNgn}=parsed.data;
  const passwordHash=await argon2.hash(password);
  const staff=await User.create({name,email,passwordHash,role,monthlySalaryKobo:Math.round(monthlySalaryNgn*100),salaryPaidThrough:"",active:true});
  return NextResponse.json({id:String(staff._id)},{status:201});
 }catch(e){if(e&&typeof e==="object"&&"code" in e&&e.code===11000)return NextResponse.json({error:"This email already belongs to an account."},{status:409});return err(e)}
}
export async function PATCH(req:NextRequest){
 if(!hasTrustedOrigin(req))return NextResponse.json({error:"Untrusted request."},{status:403});
 try{
  await requireRole(["owner"]);
  const parsed=updateSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid employee update."},{status:400});
  await connectToDatabase();
  const {id,monthlySalaryNgn,salaryPaidThrough,active}=parsed.data;
  const changes:Record<string,unknown>={};
  if(monthlySalaryNgn!==undefined)changes.monthlySalaryKobo=Math.round(monthlySalaryNgn*100);
  if(salaryPaidThrough!==undefined)changes.salaryPaidThrough=salaryPaidThrough;
  if(active!==undefined)changes.active=active;
  const employee=await User.findOneAndUpdate({_id:id,role:{$in:["manager","cashier"]}},{$set:changes},{new:true,runValidators:true});
  if(!employee)return NextResponse.json({error:"Employee not found."},{status:404});
  if(active===false)await Session.deleteMany({user:employee._id});
  return NextResponse.json({ok:true});
 }catch(e){return err(e)}
}