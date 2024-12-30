
export enum AuthType{
    admin = 0,
    maintainer = 2,
    labeler = 10,
}

export enum FilterOperators{
    Contains = "包含",
    NotContains = "不包含",
    Equal = "等于",
    NotEqual = "不等于",
    IsEmpty = "为空",
    NotEmpty = "不为空",
    Before = "早于",
    After = "晚于",
}

export enum ChatboxType {
    default = "default",
    samples = "samples",
    prompts = "prompts",
    chat_logs = "chat_logs",
    playground = "playground"
}

export interface ContentPart{
    type: string,
    text?: string,
    image_url?: {
        url: string,
        detail?: string
    }
}

export interface Message{
    role: string,
    content: string | ContentPart[],
    function_call?: {name: string, arguments: string},
    name?: string
}

export interface Tool{
    type: string,
    function?: string
}

export interface ToolCall{
    id: string,
    function: {
        name: string,
        arguments: string
    },
    type: string
}

export interface SampleMessage extends Message{
    id: string,
    role: string,
    content: string | ContentPart[],

    name?: string,
    tools?: Tool[],
    tool_call_id?: string,
    tool_calls?: ToolCall[],
    system?: string,

    vote: number,
    model: string,
    language: string,
    tags: string[],
    create_time: number,
    update_time: number,
    create_user: string,
    update_user: string
}

export interface Chat{
    session_id: string,
    hash_id?: string,
    messages: Message[],
}

export interface ChatLog extends Chat{
    _id?: string,
    session_id: string,
    hash_id?: string,
    messages: SampleMessage[],
    source: string,
    language: string,
    meta: any,
    create_time: number,
    update_time: number,
    create_user: string,
    update_user: string,
    status: string
}

export interface SampleChatLog extends Chat{
    _id?: string,
    session_id: string,
    hash_id?: string,
    messages: SampleMessage[],

    tasks: string[],
    tags: string[],
    difficulty: string,
    source: string,
    language: string,

    verified: string,
    deleted: string,
    marked: string,
    inspection: string,

    meta: any,

    create_time: number,
    update_time: number,
    verified_time: number,

    create_user: string,
    update_user: string,
    verified_user: string,
    marked_user: string,

    tokens: {
        tokens: number,
        characters: number,
    },
    data_type: string,
}

export interface Assistant{
    assistant_id?: string,
    name: string,
    instructions: string,
    model: string,

    functions: any[],
    tools: string[],

    create_user: string,
}

export interface Thread{
    thread_id?: string,

    messages: any[]
    create_user: string
}