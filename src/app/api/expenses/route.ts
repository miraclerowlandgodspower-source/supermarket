import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole,hasTrustedOrigin,AuthorizationError } from "@/lib/permissions";
import { Expense } from "@/models/expense";
const schema=z.object({description:z.string().trim().min(2).max(300),category:z.string().trim().min(2).max(80),amountNgn:z.number().finite().min(0).max(100000000),date:z.iso.date()});
const fail=(e:unknown)=>e instanceof AuthorizationError?NextResponse.json({error:e.message},{status:e.status}):NextResponse.json({error:"Request could not be completed."},{status:500});
export async function GET(){
 try{await requireRole(["owner","manager"]);await connectToDatabase();const docs=await Expense.find({}).sort({createdAt:-1}).limit(200).lean();return NextResponse.json({items:docs.map(d=>({id:String(d._id),description:d.description,category:d.category,amountNgn:d.amountKobo/100,date:new Date(d.date).toISOString().slice(0,10)}))},{headers:{"Cache-Control":"private, no-store"}})}catch(e){return fail(e)}
}
export async function POST(req:NextRequest){
 if(!hasTrustedOrigin(req))return NextResponse.json({error:"Untrusted request."},{status:403});
 try{const actor=await requireRole(["owner","manager"]);const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Please check all required fields."},{status:400});await connectToDatabase();const {amountNgn,...rest}=parsed.data;const doc={...rest,amountKobo:Math.round(amountNgn*100),date:new Date(rest.date),createdBy:actor.id};const created=await Expense.create(doc);return NextResponse.json({id:String(created._id)},{status:201})}catch(e){return fail(e)}
}