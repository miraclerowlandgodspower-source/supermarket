import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole,hasTrustedOrigin,AuthorizationError } from "@/lib/permissions";
import { Branch } from "@/models/branch";
const schema=z.object({name:z.string().trim().min(2).max(120),address:z.string().trim().max(300),phone:z.string().trim().max(30)});
const fail=(e:unknown)=>e instanceof AuthorizationError?NextResponse.json({error:e.message},{status:e.status}):NextResponse.json({error:"Request could not be completed."},{status:500});
export async function GET(){
 try{await requireRole(["owner"]);await connectToDatabase();const docs=await Branch.find({}).sort({createdAt:-1}).limit(200).lean();return NextResponse.json({items:docs.map(d=>({id:String(d._id),name:d.name,address:d.address,phone:d.phone}))},{headers:{"Cache-Control":"private, no-store"}})}catch(e){return fail(e)}
}
export async function POST(req:NextRequest){
 if(!hasTrustedOrigin(req))return NextResponse.json({error:"Untrusted request."},{status:403});
 try{const actor=await requireRole(["owner"]);const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Please check all required fields."},{status:400});await connectToDatabase();const doc=parsed.data;const created=await Branch.create(doc);return NextResponse.json({id:String(created._id)},{status:201})}catch(e){return fail(e)}
}