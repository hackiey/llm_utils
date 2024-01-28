import {extractFilters} from "@/app/utils/utils";
import {FilterOperators} from "@/app/types";
import moment from "moment";


export class DataStore{
    api_base: string;
    filters: any[];
    rows: any[];

    availableFilterTypes: string[];

    constructor(api_base: string, filters: any[], availableFilterTypes: string[]) {
        this.api_base = api_base;
        this.filters = filters;
        this.rows = [];

        this.availableFilterTypes = availableFilterTypes;
    }

    async fetchRows(page: Number, pageSize: Number){
        const filters = extractFilters(this.filters);
        console.log('[Filters]', filters);

        const response = await fetch(`${this.api_base}/list`, {
            method: "POST",
            body: JSON.stringify({
                page: page,
                page_size: pageSize,
                filters: filters
            }),
            headers: { "Content-Type": "application/json" },
        });

        return response.json();
    }

    async fetchTotalCount(){
        const filters = extractFilters(this.filters);

        const response = await fetch(`${this.api_base}/total-count`, {
            method: "POST",
            body: JSON.stringify({filters: filters}),
            headers: { "Content-Type": "application/json" },
        });
        return response.json();
    }
}

export const samplesData = new DataStore("/api/samples", [
    {type: "tasks", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "tags", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "source", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "language", operator: FilterOperators.Equal, arrayValue: ["zh"], textValue: ""},
    {type: "difficulty", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "verified", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "deleted", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "marked", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "inspection", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "data_type", operator: FilterOperators.Equal, arrayValue: ["train"], textValue: ""},],
    ["create_user", "create_time", "update_user", "update_time", "verified_user", "marked_user", "verified_time", "prompt"]);

export const promptsData = new DataStore("/api/prompts", [
    {type: "tasks", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "tags", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "difficulty", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""}],
    ["create_user", "create_time", "update_user", "update_time", "prompt"]);

export const chatLogsData = new DataStore("/api/chat-logs", [
    {type: "language", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "chatlog_source", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "status", operator: FilterOperators.Equal, arrayValue: ["待处理"], textValue: ""},
    {type: "update_time", operator: FilterOperators.Before, arrayValue: [], textValue: moment().subtract(2, 'days').format('YYYY-MM-DD')},
], ["create_time", "prompt"]);

export const toolsData = new DataStore("/api/tools", [
    {type: "source", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "tools_category", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "deleted", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "verified", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""}
], ["create_time", "update_time", "verified_time", "create_user", "update_user"]);

export function convertSampleToRow(sample: any){
    return {
        id: sample._id,
        prompt: sample.messages.length > 0 ? sample.messages[0].content : "",
        tasks: sample.tasks.join(","),
        tags: sample.tags.join(","),
        difficulty: sample.difficulty,
        source: sample.source,
        language: sample.language,

        deleted: sample.deleted == "已删除",
        marked: sample.marked == "已标记",
        inspection: sample.inspection == "已通过",
        verified: sample.verified == "已验证",

        update_user: sample.update_user,
        marked_user: sample.marked_user,
        verified_user: sample.verified_user,

        update_time: new Date(sample.update_time).toLocaleDateString(),
        verified_time: sample.verified_time == -1 ? "" : new Date(sample.verified_time).toLocaleDateString(),

        characters: sample.tokens.characters,

        is_train: sample.data_type == "train",

        sample: sample
    }
}

export function convertPromptToRow(prompt: any){
    return {
        id: prompt._id,
        title: prompt.title,
        tasks: prompt.tasks.join(","),
        tags: prompt.tags.join(","),
        difficulty: prompt.difficulty,
        prompt: prompt.messages[0].content,
        create_time: new Date(prompt.create_time).toLocaleDateString(),
        update_time: new Date(prompt.update_time).toLocaleDateString(),
        create_user: prompt.create_user,
        update_user: prompt.update_user,
        original: prompt
    }
}

export function convertChatLogToRow(chatLog: any){
    return {
        id: chatLog._id,
        session_id: chatLog.session_id,
        pending: chatLog.status != "待处理",
        prompt: chatLog.messages.length > 0 ? chatLog.messages[0].content : "",
        language: chatLog.language,
        status: chatLog.status,
        create_user: chatLog.create_user,
        update_user: chatLog.update_user,

        create_time: new Date(chatLog.create_time).toLocaleDateString(),
        update_time: new Date(chatLog.update_time).toLocaleDateString(),

        characters: chatLog.messages.reduce((acc: number, message: any) => acc + (message.content ? message.content.length: 0), 0),
        messages_count: chatLog.messages.length,

        chatLog: chatLog
    }
}

export function convertToolToRow(tool: any){
    return {
        id: tool._id,
        name: tool.name,
        display_name: tool.display_name,
        description: tool.description,

        source: tool.source,
        category: tool.category,
        tags: tool.tags.join(","),

        create_user: tool.create_user,
        update_user: tool.update_user,
        verified_user: tool.verified_user,

        create_time: new Date(tool.create_time).toLocaleDateString(),
        update_time: new Date(tool.update_time).toLocaleDateString(),
        verified_time: tool.verified_time == -1 ? "" : new Date(tool.verified_time).toLocaleDateString(),

        deleted: tool.deleted == "已删除",
        verified: tool.verified == "已验证",

        tool: tool
    }
}