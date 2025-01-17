import {Schema, Types} from "mongoose";
import {ChatLog, ContentPart, Message, SampleChatLog, SampleMessage, Tool, ToolCall} from "@/app/types";

export const MessageToolSchema = new Schema<Tool>({
    type: String,
    function: String
});

export const FunctionCallSchema = new Schema({
    name: String,
    arguments: String
});

export const ToolCallSchema = new Schema<ToolCall>({
    id: String,
    function: FunctionCallSchema,
    type: String
});

// export const MessageSchema = new Schema<Message>({
//     role: String,
//     content: String,
//     tools: [MessageToolSchema],
//     name: String
// });

export const MessageContentPart = new Schema<ContentPart>({
    type: String,
    text: String || null,
    image_url: {
        url: String,
        detail: String || null
    } || null
})

export const SampleMessageSchema = new Schema<SampleMessage>({
    id: String,
    
    role: String,
    content: String || [MessageContentPart],
    
    name: String,
    tools: [MessageToolSchema],
    tool_call_id: String,
    tool_calls: [ToolCallSchema],
    system: String,

    vote: Number,
    model: String,
    language: String,
    tags: [String],
    create_time: Number,
    update_time: Number,
    create_user: String,
    update_user: String
});

export const ChatLogSchema = new Schema<ChatLog>({
    session_id: String,
    hash_id: String,
    messages: [SampleMessageSchema],
    source: String,
    language: String,
    meta: {any: {}},
    create_time: Number,
    update_time: Number,
    create_user: String,
    update_user: String,
    status: String
});

export const SampleSchema = new Schema<SampleChatLog>({
    _id: Types.ObjectId,
    session_id: String,
    hash_id: String,
    messages: [SampleMessageSchema],

    tasks: [String],
    tags: [String],
    difficulty: String,
    source: String,
    language: String,

    verified: String,
    deleted: String,
    marked: String,

    inspection: String,

    meta: {any: {}},

    create_time: Number,
    update_time: Number,
    verified_time: Number,

    create_user: String,
    update_user: String,
    verified_user: String,
    marked_user: String,

    tokens: {
        tokens: Number,
        characters: Number,
    },
    data_type: String,
});

export const SampleHistorySchema = new Schema({
    _id: Types.ObjectId,
    sample_id: {type: String, unique: true},
    history: [SampleSchema]
});

export const PromptSchema = new Schema({
    hash_id: {type: String, unique: true},
    messages: [SampleMessageSchema],
    tasks: [String],
    tags: [String],
    difficulty: String,
    samples_id: [Types.ObjectId],
    title: String,
    create_time: Number,
    update_time: Number,
    create_user: String,
    update_user: String,
});

export const ToolSchema = new Schema({
    name: {type: String, unique: true},
    display_name: String,
    description: String,

    source: String,
    category: String,
    tags: [String],

    parameters: {
        properties: {any: {}},
        required: [String]
    },

    deleted: String,
    verified: String,

    create_time: Number,
    update_time: Number,
    verified_time: Number,

    create_user: String,
    update_user: String,
    verified_user: String,

    meta: {any: {}}
});

export const EvaluationSampleSchema = new Schema({
    task_name: String,
    messages: [SampleMessageSchema],
    replies: [String],
    reference: String,
    reply_tags: [String],
    rank_tags: [Number],
    tasks: [String],
    tags: [String],
    source: String,
    language: String,
    difficulty: String,
    meta: {any: {}},
        create_user: String,
    create_time: Number,
    verified: String,
    verified_user: String,
    verified_time: Number,
    update_user: String,
    update_time: Number
});