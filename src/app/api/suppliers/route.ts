import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole,hasTrustedOrigin,AuthorizationError } from "@/lib/permissions";
import { Supplier } from "@/models/supplier";
const schema=z.object({name:z.string().trim().min(2).max(120),email:z.union([z.literal(""),z.email().max(254)]),phone:z.string().trim().max(30),address:z.string().trim().max(300)});
const fail=(e:unknown)=>e instanceof AuthorizationError?NextResponse.json({error:e.message},{status:e.status}):NextResponse.json({error:"Request could not be completed."},{status:500});
export async function GET(){
 try{await requireRole(["owner","manager"]);await connectToDatabase();const docs=await Supplier.find({}).sort({createdAt:-1}).limit(200).lean();return NextResponse.json({items:docs.map(d=>({id:String(d._id),name:d.name,email:d.email,phone:d.phone,address:d.address}))},{headers:{"Cache-Control":"private, no-store"}})}catch(e){return fail(e)}
}
export async function POST(req:NextRequest){
 if(!hasTrustedOrigin(req))return NextResponse.json({error:"Untrusted request."},{status:403});
 try{const actor=await requireRole(["owner","manager"]);const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Please check all required fields."},{status:400});await connectToDatabase();const doc=parsed.data;const created=await Supplier.create(doc);return NextResponse.json({id:String(created._id)},{status:201})}catch(e){return fail(e)}
}