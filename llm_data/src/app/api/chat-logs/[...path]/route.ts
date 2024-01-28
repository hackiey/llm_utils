import {NextRequest, NextResponse} from "next/server";

// 引入mongoose
import { model } from "mongoose";
import mongoose from "mongoose";
import { getMessagesCharactersCount, getMessagesHashId } from "@/app/utils/utils";
import {ChatLogSchema, SampleSchema} from "@/app/api/common/schemas";
import {SampleChatLog} from "@/app/types";

mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "");

const ChatLogModel = mongoose.models.chat_logs || model("chat_logs", ChatLogSchema);
const SampleModel = mongoose.models.samples || model("samples", SampleSchema);

async function handler(req: NextRequest, { params }: {params: {path: string[]}}){
    let path = params["path"][0];

    const reqParams = await req.json();

    let filters: any = reqParams.filters || {};

    if (path == "retrieve-chat-log"){
        console.log("========================== retrieve chat logs ==========================")
        console.log(reqParams);

        const data = await ChatLogModel.findOne({_id: reqParams._id});

        return NextResponse.json({status: 200, chat_log: data});
    }

    if (path == "list"){
        console.log("========================== chat logs ==========================")
        console.log(reqParams);

        const data = await ChatLogModel.find(filters, null, {
            skip: reqParams.page * reqParams.page_size,
            limit: reqParams.page_size,
            sort: {update_time: -1}
        });

        return NextResponse.json(data);
    }

    if (path == "total-count"){
        const total_count = await ChatLogModel.countDocuments(filters);
        return NextResponse.json({total_count: total_count});
    }

    if (path == "new-chat-log"){
        console.log("========================== ChatLog new-chat-log ==========================")
        console.log(reqParams);

        try{
            const newChatLog = await ChatLogModel.create({
                _id: new mongoose.Types.ObjectId(),
                session_id: reqParams.session_id,
                hash_id: getMessagesHashId(reqParams.messages),
                messages: reqParams.messages,
                source: reqParams.source,
                language: reqParams.language,
                meta: reqParams.meta,
                create_time: reqParams.create_time,
                update_time: reqParams.update_time,
                create_user: reqParams.create_user,
                update_user: reqParams.update_user,
                status: reqParams.status
            });

            await newChatLog.save();
            return NextResponse.json({status: 200, user: reqParams.update_user, message: "新ChatLog创建成功", _id: newChatLog._id});
        }catch(err: any){
            console.error(err);
            return NextResponse.json({status: 400, user: reqParams.update_user, message: "新ChatLog创建失败"});
        }
    }

    if (path == "update-messages"){
        console.log("========================== ChatLog update-messages ==========================")
        console.log("_id", reqParams._id);

        let messages: any[] = [];
        reqParams.messages.forEach((message: any) => {
            messages.push({
                _id: message._id,

                role: message.role,
                content: message.content,
                vote: message.vote || 0,

                name: message.name || null,
                tools: message.tools || null,
                tool_calls: message.tool_calls || null,
                tool_call_id: message.tool_call_id || null,
                system: message.system || null,

                model: message.model,
                language: message.language,
                tags: message.tags,

                create_time: message.create_time,
                update_time: message.update_time,
                create_user: message.create_user,
                update_user: message.update_user
            });
        });

        try {
            const newSample = await ChatLogModel.findOneAndUpdate(
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

            return NextResponse.json({status: 200, user: reqParams.update_user, message: "更新对话成功"});
        }catch (err: any){
            console.error(err);
            return NextResponse.json({status: 400, message: "更新失败"});
        }

    }

    if (path == "update-status"){
        console.log("========================== ChatLog update-status ==========================")

        const chatLog = reqParams.chatLog;
        const username = reqParams.username;

        console.log("session_id", chatLog.session_id);

        const newChatLog = await ChatLogModel.findOneAndUpdate({_id: chatLog._id}, {
            status: chatLog.status,
        }, {new: true});

        if (chatLog.status != "已发送"){
            return NextResponse.json({status: 200, user: "", message: "更新ChatLog信息成功"});
        }

        const sample = await SampleModel.findOne({session_id: newChatLog.session_id});

        const verified = reqParams.verified ? "已验证" : "未验证";
        const verified_user = reqParams.verified ? username : "";

        // 判断sample是否存在
        if (sample){

            if (sample.verified != verified){
                const res = await fetch(`${process.env.LOCALHOST}/api/samples/update-verified`, {
                    method: "POST",
                    body: JSON.stringify({
                        _id: sample._id,
                        verified: verified,
                        verified_user: verified_user
                    }),
                    headers: {"Content-Type": "application/json"}
                });
            }

            if (sample.hash_id == getMessagesHashId(newChatLog.messages)){
                return NextResponse.json({status: 200, user: "", message: "更新ChatLog信息成功，对应sample无变化"});
            }

            const res = await fetch(`${process.env.LOCALHOST}/api/samples/update-messages`, {
                method: "POST",
                body: JSON.stringify({
                    _id: sample._id,
                    messages: newChatLog.messages
                }),
                headers: {"Content-Type": "application/json"}
            });

            return NextResponse.json({status: 200, user: "", message: "更新ChatLog信息成功，并更新对应sample消息"});
        }else {
            const newSample: SampleChatLog = {
                session_id: newChatLog.session_id,
                messages: newChatLog.messages,
                tasks: ["未分类"],
                tags: ["未分类"],
                source: "chat_logs",
                language: newChatLog.language,
                verified: verified,
                deleted: "未删除",
                difficulty: "未分类",
                marked: "未标记",
                inspection: "待质检",

                create_user: "",
                update_user: "",
                marked_user: "",
                verified_user: verified_user,

                meta: newChatLog.meta,
                create_time: newChatLog.create_time,
                update_time: newChatLog.update_time,
                verified_time: -1,

                tokens: {
                    tokens: 0,
                    characters: getMessagesCharactersCount(chatLog.messages)
                },
                data_type: "train"
            };
            const res = await fetch(`${process.env.LOCALHOST}/api/samples/new-sample`, {
                method: "POST",
                body: JSON.stringify(newSample),
                headers: {"Content-Type": "application/json"}
            });

            return NextResponse.json({status: 200, user: "", message: "更新ChatLog信息成功，并新建sample"});
        }

    }
}

export const POST = handler;