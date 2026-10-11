import {model,models,Schema} from "mongoose";
const schema=new Schema({supplierName:{type:String,required:true,trim:true,maxlength:120},reference:{type:String,required:true,trim:true,maxlength:80},description:{type:String,required:true,trim:true,maxlength:300},amountKobo:{type:Number,required:true,min:0,validate:Number.isSafeInteger},status:{type:String,enum:["pending","received","cancelled"],default:"pending"},createdBy:{type:Schema.Types.ObjectId,ref:"User",required:true}},{timestamps:true});
schema.index({createdAt:-1});
export const Purchase=models.Purchase??model("Purchase",schema);