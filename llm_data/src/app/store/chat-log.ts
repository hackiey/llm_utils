
import {hasAssistant} from "@/app/utils/utils";
import {createMessage} from "@/app/store/sample";
import {ChatLog} from "@/app/types";
import { v4 as uuidv4 } from 'uuid';


export function createEmptyChatLog(username: string): ChatLog{
    return {
        session_id: uuidv4(),
        messages: [],

        source: "playground_chat",
        language: "zh",

        meta: {},
        create_time: new Date().getTime(),
        update_time: new Date().getTime(),

        create_user: username,
        update_user: username,

        status: "待处理"
    }
}

class ChatLogStore {

    sample: any;
    prompt: any;

    config: any;

    constructor() {
        this.sample = createEmptyChatLog("")

        this.prompt = {}

        this.config = {
            model: "gpt-3.5-turbo-1106",
            instructions: ""
        }
    }

    async requestNewSample(sample: any) {
        const response = await fetch("/api/chat-logs/new-chat-log", {
            method: "POST",
            body: JSON.stringify(sample),
            headers: {"Content-Type": "application/json"}
        });

        return response.json();
    }

    async requestUpdateSample(newSample: any, dtype: string, username: string, config: any) {

        let system = [];
        if (config.instructions && config.instructions != ""){
            system.push(createMessage("system", config.instructions, "",
                    username, undefined, undefined, [], undefined));
        }

        const messages = [...system, ...newSample.messages];

        // if (this.sample._id == undefined){
        //
        //     if (hasAssistant(newSample.messages)){
        //         const resData = await this.requestNewSample({...newSample, messages: messages});
        //
        //         if (resData.status == 200){
        //             this.sample = newSample;
        //             this.sample._id = resData._id;
        //         }
        //
        //         console.log("[New Chat Log]", resData, this.sample);
        //
        //         return resData;
        //     }
        // }

        const update_time = new Date().getTime();

        if (this.sample._id == undefined){
            return {status: 400, user: username, message: "Sample ID is undefined."};
        }

        let updateBody: any = {
            _id: this.sample._id,
            update_time: update_time,
            update_user: username,
        }

        if (dtype == "messages"){
            this.sample.update_time = update_time;
            this.sample.update_user = username;

            updateBody["messages"] = messages;

            const response = await fetch("/api/chat-logs/update-messages", {
                method: "POST",
                body: JSON.stringify(updateBody),
                headers: {"Content-Type": "application/json"}
            });
            return response.json();
        }

        else if(dtype == "status"){
            const res = await fetch("/api/chat-logs/update-status", {
                method: "POST",
                body: JSON.stringify({chatLog: newSample, verified: newSample.verified, username: username}),
                headers: { "Content-Type": "application/json" }
            });

            const resData = await res.json();

            console.log(`[Update ChatLog], ${newSample}`);
            // console.log(newChatLog);

            return resData;
        }
    }

    async requestRetrieveChatLog(id: string){
        const res = await fetch("/api/chat-logs/retrieve-chat-log", {
            method: "POST",
            body: JSON.stringify({_id: id}),
            headers: { "Content-Type": "application/json" }
        });

        return await res.json();
    }

}

export let playgroundChatLogStore = new ChatLogStore();
export let chatLogStore = new ChatLogStore();

// export async function requestUpdateChatLog(newChatLog: any, isVerified: boolean, username: string){
//
//     const res = await fetch("/api/chat-logs/update-status", {
//         method: "POST",
//         body: JSON.stringify({chatLog: newChatLog, isVerified: isVerified, username: username}),
//         headers: { "Content-Type": "application/json" }
//     });
//
//     const resData = await res.json();
//
//     console.log(`[Update ChatLog], ${newChatLog}`);
//     // console.log(newChatLog);
//
//     return resData;
// }