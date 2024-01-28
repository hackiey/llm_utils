import crypto from 'crypto-js';
import {FilterOperators, SampleMessage, SampleChatLog} from "@/app/types";
import {ColumnItems} from "@/app/constant";

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

export function setQuickUserFilter(dtype: string, checked: boolean, username: string, filters: any[], setFilters: Function){
    let newFilters = [...filters];
    if (checked){
        newFilters.push({type: dtype, operator: FilterOperators.Equal, arrayValue: [], textValue: username});
    }
    else {
        newFilters = newFilters.filter((filter: any)=>filter.type!=dtype && filter.textValue!= username);
    }
    setFilters(newFilters);
}

function convertLanguageFilter(filter: any){
    const languages: {[index: string]: string[]} = {
        zh: ["zh", "zh-Hans", "zh-Hant", "zh-cn"],
        en: ["en", "en-US", "en-GB", "en-AU", "en-CA", "en-IN", "en-NZ", "en-ZA"]
    };

    if (filter.arrayValue[0] == "en" || filter.arrayValue[0] == "zh"){
        if (filter.operator == FilterOperators.Contains || filter.operator == FilterOperators.Equal){
            return {$in: languages[filter.arrayValue[0]]}
        } else if (filter.operator == FilterOperators.NotContains || filter.operator == FilterOperators.NotEqual){
            return {$nin: languages[filter.arrayValue[0]]}
        }
    }else if (filter.arrayValue[0] == "others"){
        if (filter.operator == FilterOperators.Contains || filter.operator == FilterOperators.Equal){
            return {$nin: [...languages.zh, ...languages.en]}
        } else if (filter.operator == FilterOperators.NotContains || filter.operator == FilterOperators.NotEqual){
            return {$in: [...languages.zh, ...languages.en]}
        }
    }
}

export function extractFilters(filters: any[]){
    let andFilters: any[] = [];
    for (let filter of filters){

        const filterType = ColumnItems[filter.type].type;
        const filterField = ColumnItems[filter.type].field;

        if (filter.arrayValue.length == 1 && filter.arrayValue[0] == "全部"){
            continue;
        }
        if (![FilterOperators.IsEmpty, FilterOperators.NotEmpty].includes(filter.operator) &&
            filter.arrayValue.length == 0 && filter.textValue == ""){
            continue;
        }

        let textValue = filter.textValue;
        if (filterType == "date"){
            textValue = new Date(filter.textValue).getTime();
        }

        if (filter.operator == FilterOperators.Contains){
            // 包含
            if (filterType == "select"){
                andFilters.push({[filterField]: {$in: filter.arrayValue}});
            }else if (filterType == "text" || filterType == "date") {
                if (filter.type == "prompt"){
                    andFilters.push({$expr: {$regexMatch: {input: {$arrayElemAt: ["$messages.content", 0]}, regex: textValue}}});
                }else{
                    andFilters.push({[filterField]: {$regex: textValue}});
                }
            }
        } else if (filter.operator == FilterOperators.NotContains){
            // 不包含
            if (filterType == "select") {
                andFilters.push({[filterField]: {$nin: filter.arrayValue}});
            } else if (filterType == "text" || filterType == "date") {
                if (filter.type == "prompt"){
                    andFilters.push({$expr: {$not: {$regexMatch: {input: {$arrayElemAt: ["$messages.content", 0]}, regex: textValue}}}});
                }else{
                    andFilters.push({[filterField]: {$not: {$regex: textValue}}});
                }
            }
        }else if (filter.operator == FilterOperators.Equal){
            // 等于
            if (filterType == "select") {
                andFilters.push({[filterField]: {$in: filter.arrayValue}});
            }else if (filterType == "text" || filterType == "date") {
                if (filter.type == "prompt"){
                    andFilters.push({$expr: {$eq: [{$arrayElemAt: ["$messages.content", 0]}, textValue]}});
                }else{
                    andFilters.push({[filterField]: {$eq: textValue}});
                }
            }
        }else if (filter.operator == FilterOperators.NotEqual){
            // 不等于
            if (filterType == "select") {
                andFilters.push({[filterField]: {$nin: filter.arrayValue}});
            }else if (filterType == "text" || filterType == "date") {
                if (filter.type == "prompt"){
                    andFilters.push({$expr: {$ne: [{$arrayElemAt: ["$messages.content", 0]}, textValue]}});
                }else{
                    andFilters.push({[filterField]: {$ne: textValue}});
                }
            }
        }else if (filter.operator == FilterOperators.IsEmpty){
            // 为空
            andFilters.push({[filterField]: {$eq: ""}});
        }else if (filter.operator == FilterOperators.NotEmpty){
            // 不为空
            andFilters.push({[filterField]: {$ne: ""}});
        }else if (filter.operator == FilterOperators.Before){
            // 早于
            andFilters.push({[filterField]: {$lte: textValue}});
        }else if (filter.operator == FilterOperators.After){
            // 晚于
            andFilters.push({[filterField]: {$gte: textValue}});
        }

        // post process
        if (andFilters.length > 0 && andFilters[andFilters.length-1].language != null && filter.arrayValue.length > 0) {
            andFilters[andFilters.length-1].language = convertLanguageFilter(filter);
        }
    }
    if (andFilters.length == 0){
        return {};
    }
    // else{
    //     // 把andFilters中的key为chatlog_source的修改为source
    //     andFilters.forEach((filter: any) => {
    //         if (filter.chatlog_source != null){
    //             filter.source = filter.chatlog_source;
    //             delete filter.chatlog_source;
    //         }
    //     });
    // }
    return {$and: andFilters};
}

export function getMessagesHashId(messages: any[]){
    let hashStrArray: string[] = [];
    messages.forEach((message: any) => {
        let hash_str = message.role

        if (message.content != null && message.content != ""){
            hash_str += "/" + message.content;
        }
        if (message.name != null && message.name != ""){
            hash_str += "/" + message.name;
        }
        if (message.tools != null && message.tools.length > 0){
            hash_str += "/" + message.tools.map((tool: any) => JSON.stringify(tool)).join(",");
        }
        if (message.tool_calls != null && message.tool_calls.length > 0){
            hash_str += "/" + message.tool_calls.map((tool_call: any) => JSON.stringify(tool_call)).join(",");
        }

        hashStrArray.push(hash_str);

    });
    return crypto.SHA256(hashStrArray.join(",")).toString(crypto.enc.Hex);
}

export function getMessagesCharactersCount(messages: any[]){
    let count = 0;
    messages.forEach((message: any) => {
        if (message.content != null){
            count += message.content.length;
        }
    });
    return count;
}

export function validateToolCall(toolCallId: string, toolType: string, functionName: string, functionArguments: string, content: string){
    if (toolCallId == ""){
        return {status: false, message: "id为空"};
    }
    if (toolType == ""){
        return {status: false, message: "type为空"};
    }
    if (functionName == ""){
        return {status: false, message: "function.name为空"};
    }
    if (functionArguments == ""){
        return {status: false, message: "function.arguments为空"};
    }
    if (content == "" || content == undefined){
        return {status: false, message: "没有function执行结果"};
    }

    return {status: true, message: ""};
}

export function hasAssistant(messages: any[]){
    let hasAssistant = false;
    messages.forEach((message: any) => {
        if (message.role == "assistant"){
            hasAssistant = true;
        }
    });
    return hasAssistant;
}