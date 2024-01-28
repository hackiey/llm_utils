
import { REQUEST_TIMEOUT_MS, OpenaiPath } from "@/app/constant";
import { prettyObject } from "@/app/utils/format"

import {
    EventStreamContentType,
    fetchEventSource,
} from "@fortaine/fetch-event-source";

export interface RequestMessage {
    role: string;
    content: string;
    // function_call?: {
    //     name: string;
    //     args: string;
    // };
    tool_calls?: {name: string, arguments: string}[];
    tool_call_id?: string;
    name?: string;
}

export interface LLMConfig {
    model: string;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
    presence_penalty?: number;
    frequency_penalty?: number;
}

interface ChatOptions {
    messages: RequestMessage[];
    config: LLMConfig;
    tools?: any[];

    onUpdate?: (message: string, chunk: string, toolCalls: any[]) => void;
    onFinish: (message: string, toolCalls: any[]) => void;
    onError?: (err: Error) => void;
    onController?: (controller: AbortController) => void;
}

function getHeaders() {
    // const accessStore = useAccessStore.getState();
    let headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
    };

    // const makeBearer = (token: string) => `Bearer ${token.trim()}`;
    // const validString = (x: string) => x && x.length > 0;

    // use user's api key first
    // if (validString(accessStore.token)) {
    //   headers.Authorization = makeBearer(accessStore.token);
    // } else if (
    //   accessStore.enabledAccessControl() &&
    //   validString(accessStore.accessCode)
    // ) {
    //   headers.Authorization = makeBearer(
    //     ACCESS_CODE_PREFIX + accessStore.accessCode,
    //   );
    // }

    return headers;
}

function path(path: string): string {
    // let openaiUrl = OpenaiBaseUrl
    // const apiPath = "/api/openai";

    // if (openaiUrl.endsWith("/")) {
    //     openaiUrl = openaiUrl.slice(0, openaiUrl.length - 1);
    // }
    // if (!openaiUrl.startsWith("http") && !openaiUrl.startsWith(apiPath)) {
    //     openaiUrl = "https://" + openaiUrl;
    // }
    const openaiUrl = "/api/openai";
    return [openaiUrl, path].join("/");
}

export function extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
}

export function extractToolCalls(res: any) {
    return res.choices?.at(0)?.tool_calls ?? null;
}

export async function chatCompletions(options: ChatOptions) {

    const messages = options.messages.map((v) => ({
        role: v.role,
        content: v.content,
        name: v.name,
        tool_call_id: v.tool_call_id,
        tool_calls: v.tool_calls
    }));

    const modelConfig = options.config;

    if (options.tools != null && options.tools.length > 0){
        options.tools = options.tools.map((v) => ({
            type: v.type,
            function: JSON.parse(v.function)
        }));
    }

    let requestPayload = {
        messages,
        tools: options.tools,
        stream: options.config.stream,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        presence_penalty: modelConfig.presence_penalty,
        frequency_penalty: modelConfig.frequency_penalty,
        top_p: modelConfig.top_p,
    };

    console.log("[Request] openai payload: ", requestPayload);

    const shouldStream = !!options.config.stream;
    const controller = new AbortController();
    options.onController?.(controller);

    try {
        const chatPath = path(OpenaiPath.ChatPath);
        const chatPayload = {
            method: "POST",
            body: JSON.stringify(requestPayload),
            signal: controller.signal,
            headers: getHeaders(),
        };

        // make a fetch request
        const requestTimeoutId = setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS,
        );

        if (shouldStream) {
            let responseText = "";
            let responseToolCalls: any[] = [];

            let finished = false;

            const finish = () => {
                if (!finished) {
                    options.onFinish(responseText, responseToolCalls);
                    finished = true;
                }
            };

            controller.signal.onabort = finish;

            fetchEventSource(chatPath, {
                ...chatPayload,
                async onopen(res) {
                    clearTimeout(requestTimeoutId);
                    const contentType = res.headers.get("content-type");
                    console.log(
                        "[OpenAI] request response content type: ",
                        contentType,
                    );

                    if (contentType?.startsWith("text/plain")) {
                        responseText = await res.clone().text();
                        return finish();
                    }

                    if (
                        !res.ok ||
                        !res.headers
                            .get("content-type")
                            ?.startsWith(EventStreamContentType) ||
                        res.status !== 200
                    ) {
                        const responseTexts = [responseText];
                        let extraInfo = await res.clone().text();
                        try {
                            const resJson = await res.clone().json();
                            extraInfo = prettyObject(resJson);
                        } catch { }

                        // if (res.status === 401) {
                        //     responseTexts.push(Locale.Error.Unauthorized);
                        // }

                        if (extraInfo) {
                            responseTexts.push(extraInfo);
                        }

                        responseText = responseTexts.join("\n\n");

                        return finish();
                    }
                },
                onmessage(msg) {
                    if (msg.data === "[DONE]" || finished) {
                        return finish();
                    }
                    const text = msg.data;
                    try {
                        const json = JSON.parse(text);

                        const delta = json.choices[0].delta.content;

                        if (delta) {
                            responseText += delta;
                        }

                        const toolCallsChunk = json.choices[0].delta.tool_calls;

                        if (toolCallsChunk && toolCallsChunk.length > 0) {
                            if (toolCallsChunk[0].id != null){
                                responseToolCalls.push({type: "function", id: toolCallsChunk[0].id, function: {name: toolCallsChunk[0].function.name, arguments: toolCallsChunk[0].function.arguments}});
                            }
                            if (toolCallsChunk[0].arguments != ""){
                                const lastIndex = responseToolCalls.length - 1;
                                responseToolCalls[lastIndex].function.arguments = responseToolCalls[lastIndex].function.arguments + toolCallsChunk[0].function.arguments;
                            }
                        }
                        options.onUpdate?.(responseText, delta, responseToolCalls);

                    } catch (e) {
                        console.error("[Request] parse error", text, msg);
                    }
                },
                onclose() {
                    finish();
                },
                onerror(e) {
                    options.onError?.(e);
                    throw e;
                },
                openWhenHidden: true,
            });
        } else {
            const res = await fetch(chatPath, chatPayload);
            clearTimeout(requestTimeoutId);

            const resJson = await res.json();
            const message = extractMessage(resJson);
            const toolCalls = extractToolCalls(resJson);
            options.onFinish(message, toolCalls);
        }
    } catch (e) {
        console.log("[Request] failed to make a chat request", e);
        options.onError?.(e as Error);
    }
}