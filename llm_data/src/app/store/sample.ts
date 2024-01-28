import {ChatboxType, FilterOperators, SampleChatLog, SampleMessage} from "@/app/types";
import { DataStore } from "@/app/store/data-store";


export function createPrompt(title: string, sample: any, messages: any[], username: string){

    return {
        messages: messages,
        tasks: sample.tasks,
        tags: sample.tags,
        difficulty: sample.difficulty,
        title: title,
        create_time: new Date().getTime(),
        update_time: new Date().getTime(),
        create_user: username,
        update_user: username
    }
}

export function createMessage(role: string, content: string, model: string, username: string,
                              name?: string, tools?: any[], tool_calls?: any[], tool_call_id?: string): SampleMessage{
    return {
        id: "",
        role: role,
        content: content,

        name: name,
        tools: tools,
        tool_call_id: tool_call_id,
        tool_calls: tool_calls,

        vote: 0,
        model: model,
        language: "",
        tags: [],
        create_time: new Date().getTime(),
        update_time: new Date().getTime(),
        create_user: username,
        update_user: username,
    }
}

export function createEmptySample(username: string): SampleChatLog{

    return {
        session_id: "",
        messages: [],
        tasks: ["未分类"],
        tags: ["未分类"],
        difficulty: "未分类",
        source: "labeling",
        language: "zh",

        verified: "未验证",
        deleted: "未删除",
        marked: "未标记",
        inspection: "待质检",

        meta: {},

        create_time: new Date().getTime(),
        update_time: new Date().getTime(),
        verified_time: -1,

        create_user: username,
        update_user: username,
        marked_user: "",
        verified_user: "",

        tokens: {
            tokens: 0,
            characters: 0,
        },
        data_type: "train",
    }
}

export function cleanUpMessages(messages: any[]){
    // 清理没有对应tool_call_id的message
    let toolCallIds: string[] = [];
    messages.forEach((message: any) => {
        if (message.tool_calls && message.tool_calls.length > 0){
            message.tool_calls.forEach((tool_call: any) => {
                toolCallIds.push(tool_call.id);
            });
        }
    });

    let newMessages: any[] = [];
    messages.forEach((message: any) => {
        if (message.tool_call_id == undefined || message.tool_call_id == "" || message.tool_call_id == null){
            newMessages.push(message);
        } else if (message.tool_call_id && toolCallIds.includes(message.tool_call_id)) {
            newMessages.push(message);
        }
    });
    return newMessages;
}

class SampleStore {

    sample: any;
    prompt: any;

    constructor() {
        this.sample = {}
        this.prompt = {}
    }

    // createMessage(role: string, content: string, model: string, username: string){
    //     const message = createMessage(role, content, model, username);
    //     this.sample.messages.push(message);
    //     return message;
    // }

    async requestNewSample(sample: any){
        const response = await fetch("/api/samples/new-sample", {
            method: "POST",
            body: JSON.stringify(sample),
            headers: { "Content-Type": "application/json" },
        });
        return response.json();
    }

    async requestUpdateSample(newSample: SampleChatLog, dtype: string, username: string){

        if (this.sample._id == undefined){
            // 如果messages中没有role=assistant，不新建
            let hasAssistant = false;
            this.sample.messages.forEach((message: any) => {
                if (message.role == "assistant"){
                    hasAssistant = true;
                }
            });
            if (hasAssistant){
                const resData = await this.requestNewSample(newSample);
                if (resData.status == 200){
                    this.sample = newSample;
                }

                this.sample._id = resData._id;
                console.log("[New Sample]", resData);
                return resData;
            }
        }

        const update_time = new Date().getTime();

        if (this.sample._id == undefined){
            return {status: 400, user: username, message: ""}
        }

        let updateBody: any = {
            _id: this.sample._id,
            update_time: update_time,
            update_user: username,
            verified: "未验证",
            verified_time: -1,
            verified_user: ""
        }

        if (dtype == "messages"){
            this.sample.update_time = update_time;
            this.sample.update_user = username;

            updateBody["messages"] = this.sample.messages;
            const response = await fetch(`/api/samples/update-messages`, {
                method: "POST",
                body: JSON.stringify(updateBody),
                headers: { "Content-Type": "application/json" },
            });
            return response.json();
        }

        if (dtype == "meta"){
            this.sample.update_time = update_time;
            this.sample.update_user = username;
            updateBody = {...updateBody, ...{
                tasks: this.sample.tasks,
                tags: this.sample.tags,
                difficulty: this.sample.difficulty
            }};
            console.log("[Update Body]", updateBody);
            const response = await fetch(`/api/samples/update-meta`, {
                method: "POST",
                body: JSON.stringify(updateBody),
                headers: { "Content-Type": "application/json" },
            });
            return response.json();
        }

        if (dtype == "verified"){
            let requestBody = {
                _id: this.sample._id,
                verified: this.sample.verified,
                verified_time: update_time,
                verified_user: username
            }
            if (this.sample.verified == "未验证"){
                requestBody.verified_time = -1;
                requestBody.verified_user = "";
            }
            const response = await fetch(`/api/samples/update-verified`, {
                method: "POST",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" },
            });
            return response.json();
        }

        if (dtype == "deleted"){
            let requestBody = {
                _id: this.sample._id,
                deleted: this.sample.deleted,
            }
            const response = await fetch(`/api/samples/update-deleted`, {
                method: "POST",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" },
            });
            return response.json();
        }

        if (dtype == "marked"){
            let requestBody = {
                _id: this.sample._id,
                marked: this.sample.marked,
                marked_user: username
            }
            if (this.sample.marked == "未标记"){
                requestBody.marked_user = "";
            }
            const response = await fetch(`/api/samples/update-marked`, {
                method: "POST",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" },
            });
            return response.json();
        }

        if (dtype == "inspection"){
            let requestBody = {
                _id: this.sample._id,
                inspection: this.sample.inspection,
            }

            const response = await fetch(`/api/samples/update-inspection`, {
                method: "POST",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" },
            });
            return response.json();
        }

        if (dtype == "data_type"){
            let requestBody = {
                _id: this.sample._id,
                data_type: this.sample.data_type,
            }
            const response = await fetch(`/api/samples/update-data-type`, {
                method: "POST",
                body: JSON.stringify(requestBody),
                headers: { "Content-Type": "application/json" },
            });
            return response.json();
        }
    }

    async requestNewPrompt(prompt: any){
        const response = await fetch("/api/prompts/new-prompt", {
            method: "POST",
            body: JSON.stringify(prompt),
            headers: { "Content-Type": "application/json" },
        });
        return response.json();
    }

    // async requestUpdatePrompt(index: number, title: string, taskSelects: string[], tagSelects: string[], difficultySelect: string, username: string) {
    async requestUpdatePrompt(newPrompt: any, username: string){

        if (this.prompt._id == undefined) {
            const prompt = createPrompt(newPrompt.title, this.sample, newPrompt.messages, username);

            const resData = await this.requestNewPrompt(prompt);
            this.prompt._id = resData._id;
            console.log("[New Prompt]", resData);

            return resData;
        }else{
            this.prompt.tasks = newPrompt.tasks;
            this.prompt.tags = newPrompt.tags;
            this.prompt.difficulty = newPrompt.difficulty;
            this.prompt.title = newPrompt.title;
            this.prompt.update_time = new Date().getTime();
            this.prompt.update_user = username;

            const res = await fetch("/api/prompts/update-prompt", {
                method: "POST",
                body: JSON.stringify(this.prompt),
                headers: { "Content-Type": "application/json" },
            });

            const resData = await res.json();
            console.log("[Update Prompt]", resData);

            return resData;
        }
    }

}

export let sampleStore = new SampleStore();
export let promptStore = new SampleStore();
// export let chatLogStore = new SampleStore();


function createEmptyTool(username: string){
    return {
        name: "",
        display_name: "",
        description: "",
        parameters: {
            type: "object",
            properties: {},
            required: []
        },
        source: "labeling",
        category: "未分类",
        tags: ["未分类"],

        deleted: "未删除",
        verified: "未验证",

        create_time: new Date().getTime(),
        update_time: new Date().getTime(),
        verified_time: -1,

        create_user: username,
        update_user: username,
        verified_user: "",
    }
}

class ToolStore{
    tool: any
    toolJson: string

    constructor() {
        this.tool = {"name": "", "description": "", "parameters": {"type": "object", "properties": {}, "required": []}}
        this.toolJson = JSON.stringify(this.tool, null, 4)
    }

    convertToJson(tool: any){
        const toolJson = {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.parameters
        }
        return JSON.stringify(toolJson, null, 4)
    }

    async requestNewTool(tool: any){
        const response = await fetch("/api/tools/new-tool", {
            method: "POST",
            body: JSON.stringify(tool),
            headers: { "Content-Type": "application/json" },
        });
        return response.json();
    }

    async requestUpdateTool(tool: any){
        const response = await fetch("/api/tools/update-tool", {
            method: "POST",
            body: JSON.stringify(tool),
            headers: { "Content-Type": "application/json" },
        });
        return response.json();
    }
}

export let toolStore = new ToolStore();