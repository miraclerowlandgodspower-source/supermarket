import {model,models,Schema} from "mongoose";
const schema=new Schema({name:{type:String,required:true,trim:true,maxlength:120},address:{type:String,required:true,trim:true,maxlength:300},phone:{type:String,trim:true,maxlength:30,default:""},active:{type:Boolean,default:true}},{timestamps:true});
export const Branch=models.Branch??model("Branch",schema);