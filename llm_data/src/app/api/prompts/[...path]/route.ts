
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto-js";
import {getMessagesHashId} from "@/app/utils/utils"

// 引入mongoose
import {Schema, Types, model, connect} from "mongoose";
import mongoose from "mongoose";

import {PromptSchema} from "@/app/api/common/schemas";

mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "");

const PromptModel = mongoose.models.prompts || model("prompts", PromptSchema);

async function handler(req: NextRequest, { params }: { params: { path: string[] } }){

    const path = params["path"][0];
    const reqParams = await req.json();

    let filters: any = reqParams.filters;
    
    if (path == "list"){
        console.log("========================== prompts list ==========================")
        console.log(reqParams);

        const data = await PromptModel.find(filters, null, {
            skip: reqParams.page * reqParams.page_size,
            limit: reqParams.page_size,
            sort: {update_time: -1}
        });

        return NextResponse.json(data);
    }

    if (path == "total-count"){
        const total_count = await PromptModel.countDocuments(filters);

        return NextResponse.json({total_count: total_count});
    }

    if (path == "new-prompt"){
        console.log("========================== new-prompt ==========================")
        console.log(reqParams);

        let messages: any[] = [];
        reqParams.messages.forEach((message: any) => {
            messages.push({
                role: message.role,
                content: message.content
            });
        });

        try{
            const newPrompt = await PromptModel.create({
                _id: new Types.ObjectId(),
                hash_id: getMessagesHashId(messages),
                messages: messages,
                tasks: reqParams.tasks,
                tags: reqParams.tags,
                difficulty: reqParams.difficulty,
                samples_id: [],
                title: reqParams.title,
                create_time: new Date().getTime(),
                update_time: new Date().getTime(),
                create_user: reqParams.create_user,
                update_user: reqParams.update_user
            });
    
            await newPrompt.save();
            console.log(newPrompt);
            return NextResponse.json({status: 200, user: reqParams.create_user, message: "Prompt已创建", _id: newPrompt._id});
        }
        catch(err: any){
            if (err.code == 11000){
                return NextResponse.json({status: 200, user: reqParams.create_user, message: "Prompt已存在"});
            }
            return NextResponse.json({status: 500, message: "error"});
        }
    }

    if (path == "update-prompt"){
        console.log("========================== update-prompt ==========================")
        console.log(reqParams);

        let messages: any[] = [];
        reqParams.messages.forEach((message: any) => {
            messages.push({
                role: message.role,
                content: message.content
            });
        });

        const updateBody = {
            hash_id: getMessagesHashId(messages),
            messages: messages,
            tasks: reqParams.tasks,
            tags: reqParams.tags,
            difficulty: reqParams.difficulty,
            title: reqParams.title,
            update_time: reqParams.update_time,
            update_user: reqParams.update_user
        }

        const newPrompt = await PromptModel.findOneAndUpdate({_id: reqParams._id}, updateBody, {new: true});
        console.log(newPrompt);

        return NextResponse.json({status: 200, user: reqParams.update_user, message: "Prompt已更新"});
    }

    if (path == "create-user-leaderboard"){
        console.log("========================== create-user-leaderboard ==========================")
        console.log(reqParams);

        const data = await PromptModel.aggregate([
            {$group: {_id: "$create_user", count: {$sum: 1}}},
            {$sort: {count: -1}}
        ]);

        return NextResponse.json(data);
    }
}

export const POST = handler;
