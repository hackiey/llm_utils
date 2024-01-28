import { NextRequest, NextResponse } from "next/server";

// 引入mongoose
import {Schema, Types, model, connect} from "mongoose";
import mongoose from "mongoose";
import { getMessagesCharactersCount, getMessagesHashId } from "@/app/utils/utils";

import {SampleSchema, SampleHistorySchema} from "@/app/api/common/schemas";

mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "");

const SampleModel = mongoose.models.samples || model("samples", SampleSchema);
const SampleHistoryModel = mongoose.models.samples_histories || model("samples_histories", SampleHistorySchema);

async function handler(req: NextRequest, { params }: { params: { path: string[] } }){

    let path = params["path"][0];

    const reqParams = await req.json();

    let filters: any = reqParams.filters || {};

    if (path == "list"){
        console.log("========================== samples ==========================")
        console.log(reqParams)

        const data = await SampleModel.find(filters, null, {
            skip: reqParams.page * reqParams.page_size, 
            limit: reqParams.page_size,
            sort: {update_time: -1}
        });

        return NextResponse.json(data);
    }

    if (path == "total-count"){
        const total_count = await SampleModel.countDocuments(filters);
        
        return NextResponse.json({total_count: total_count});
    }

    if (path == "categories"){
        const sources = await SampleModel.distinct("source");
        const languages = await SampleModel.distinct("language");

        return NextResponse.json({sources: sources, languages: languages});
    }

    if (path == "new-sample"){
        console.log("========================== new-sample ==========================")
        // console.log(reqParams);
        // insert one
        try{
            const newSample = await SampleModel.create({
                _id: new Types.ObjectId(),
                session_id: reqParams.session_id,
                hash_id: getMessagesHashId(reqParams.messages),
                messages: reqParams.messages,
                tasks: reqParams.tasks,
                tags: reqParams.tags,
                source: reqParams.source,
                language: reqParams.language,
                verified: reqParams.verified,
                deleted: reqParams.deleted,
                difficulty: reqParams.difficulty,
                meta: reqParams.meta,
                create_time: reqParams.create_time,
                update_time: reqParams.update_time,
                create_user: reqParams.create_user,
                update_user: reqParams.update_user,
                verified_user: reqParams.verified_user,
                verified_time: reqParams.verified_time,
                tokens: {
                    tokens: 0,
                    characters: getMessagesCharactersCount(reqParams.messages),
                },
                data_type: reqParams.data_type,
            });

            await newSample.save();
            // console.log(newSample);

            const newSampleHistory = await SampleHistoryModel.create({
                _id: new Types.ObjectId(),
                sample_id: newSample._id,
                history: [newSample]    
            });
            await newSampleHistory.save();
            // console.log(newSampleHistory);
            return NextResponse.json({status: 200, user: reqParams.update_user, message: "新样本创建成功", _id: newSample._id});

        }catch (err: any){
            console.log(err);
            return NextResponse.json({status: 400, message: "该对话已存在，创建失败"});
        }
    }

    if (path == "update-messages"){
        console.log("========================== update-messages ==========================")
        console.log("_id",reqParams._id);
        let messages: any[] = [];
        reqParams.messages.forEach((message: any) => {
            messages.push({
                id: message.id,
                role: message.role,
                content: message.content,
                vote: message.vote || 0,

                name: message.name || null,
                tools: message.tools || null,
                tool_calls: message.tool_calls || null,
                tool_call_id: message.tool_call_id || null,
                system: message.system || null,

                model: message.model,
                error: message.isError,
                language: message.language,
                tags: message.tags,
                create_time: message.create_time,
                update_time: message.update_time,
                create_user: message.create_user,
                update_user: message.update_user
            });
        });

        try {

            const newSample = await SampleModel.findOneAndUpdate(
                {_id: reqParams._id},
                {
                    messages: messages,
                    hash_id: getMessagesHashId(messages),
                    update_time: reqParams.update_time,
                    update_user: reqParams.update_user,
                    tokens: {tokens: 0, characters: getMessagesCharactersCount(messages)}
                },
                {new: true}
            );

            const newSampleHistory = await SampleHistoryModel.findOneAndUpdate({sample_id: reqParams._id}, {"$push": {history: newSample}}, {new: true});

            return NextResponse.json({status: 200, user: reqParams.update_user, message: "更新对话成功"});
        }catch (err: any){
            console.log(err);
            return NextResponse.json({status: 400, message: "该对话已存在，更新失败"});
        }
    }

    if (path == "update-meta"){
        console.log("========================== update-meta ==========================")
        console.log("_id", reqParams._id);

        let updateBody = {
            tasks: reqParams.tasks,
            tags: reqParams.tags,
            difficulty: reqParams.difficulty,
            update_time: reqParams.update_time,
            update_user: reqParams.update_user,
        }
        const newSample = await SampleModel.findOneAndUpdate({_id: reqParams._id}, updateBody, {new: true});
        // console.log(newSample);
        
        // console.log({sample_id: reqParams._id});
        const newSampleHistory = await SampleHistoryModel.findOneAndUpdate({sample_id: reqParams._id.toString()}, {"$push": {history: newSample}}, {new: true});
        // console.log(newSampleHistory);

        const findSample = await SampleHistoryModel.findOne({sample_id: reqParams._id});
        // console.log(findSample);

        return NextResponse.json({status: 200, user: reqParams.update_user, message: "更新分类信息成功"});
    }

    if (path == "update-verified"){
        console.log("========================== update-verified ==========================")
        console.log({_id: reqParams._id, verified: reqParams.verified, verified_time: reqParams.verified_time, verified_user: reqParams.verified_user});
        const newSample = await SampleModel.findOneAndUpdate({_id: reqParams._id}, {
            verified: reqParams.verified,
            verified_time: reqParams.verified_time,
            verified_user: reqParams.verified_user,
        }, {new: true});
        // console.log(newSample);
        return NextResponse.json({status: 200, user: reqParams.verified_user, message: "更新验证信息成功"});
    }

    if (path == "update-data-type"){
        console.log("========================== update-data-type ==========================")
        console.log({_id: reqParams._id, data_type: reqParams.data_type});
        const newSample = await SampleModel.findOneAndUpdate({_id: reqParams._id}, {
            data_type: reqParams.data_type,
        }, {new: true});
        // console.log(newSample);
        return NextResponse.json({status: 200, user: "", message: "更新数据类型成功"});
    }

    if (path == "update-deleted"){
        console.log("========================== update-deleted ==========================")
        console.log({_id: reqParams._id, deleted: reqParams.deleted});
        const newSample = await SampleModel.findOneAndUpdate({_id: reqParams._id}, {
            deleted: reqParams.deleted,
        }, {new: true});
        // console.log(newSample);
        return NextResponse.json({status: 200, user: "", message: "更新删除信息成功"});
    }

    if (path == "update-marked"){
        console.log("========================== update-marked ==========================")
        console.log({_id: reqParams._id, marked: reqParams.marked, marked_user: reqParams.marked_user});
        const newSample = await SampleModel.findOneAndUpdate({_id: reqParams._id}, {
            marked: reqParams.marked,
            marked_user: reqParams.marked_user,
        }, {new: true});
        // console.log(newSample);
        return NextResponse.json({status: 200, user: "", message: "更新标记信息成功"});
    }

    if (path == "update-inspection"){
        console.log("========================== update-inspection ==========================")
        console.log({_id: reqParams._id, inspection: reqParams.inspection});
        const newSample = await SampleModel.findOneAndUpdate({_id: reqParams._id}, {
            inspection: reqParams.inspection,
        }, {new: true});
        // console.log(newSample);
        return NextResponse.json({status: 200, user: "", message: "更新质检信息成功"});
    }

    if (path == "create-user-leaderboard"){
        console.log("========================== create-user-leaderboard ==========================")
        // console.log(reqParams);

        const data = await SampleModel.aggregate([
            {$group: {_id: "$create_user", count: {$sum: 1}}},
            {$sort: {count: -1}}
        ]);

        return NextResponse.json(data);
    }
    
}

export const POST = handler;
