
import { REQUEST_TIMEOUT_MS } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";

import {
    EventStreamContentType,
    fetchEventSource,
} from "@fortaine/fetch-event-source";
import {clearTimeout} from "timers";
import {RequestMessage, extractMessage, extractToolCalls} from "@/app/client/platforms/openai";

// export interface AgentRequestMessage {
//     role: string;
//     content: string;
//
//     tool_calls?: {name: string, arguments: string}[];
//     tool_call_id?: string;
//     name?: string;
// }

export interface AgentLLMConfig {
    model: string;
    stream?: boolean;
    agent: string,
}


interface AgentChatOptions {
    messages: RequestMessage[];
    config: AgentLLMConfig;
    tools?: any[];

    onUpdate?: (message: string, chunk: string, toolCalls: any[]) => void;
    onFinish: (message: string, toolCalls: any[]) => void;
    onError?: (err: Error) => void;
    onController?: (controller: AbortController) => void;
}

function getHeaders(){
    let headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
    }
    return headers;
}

// function path(path: string): string{
//     const agentUrl = "/api/agent";
//     return agentUrl + path;
// }

export async function agentChatCompletions(options: AgentChatOptions){
    const messages = options.messages.map((v: RequestMessage) => ({
        role: v.role,
        content: v.content,
        name: v.name,
        tool_calls: v.tool_calls,
        tool_call_id: v.tool_call_id,
    }));

    const modelConfig = options.config;

    let requestPayload = {
        messages,
        tools: options.tools,
        stream: modelConfig.stream,
        model: modelConfig.model,
    }

    console.log("[Agent Request] payload: ", requestPayload);

    const shouldStream = !!options.config.stream;
    const controller = new AbortController();

    options.onController?.(controller);

    try {
        const agentChatPath = "/api/agent/chat";
        const agentChatPalyload = {
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

            fetchEventSource(agentChatPath, {
                ...agentChatPalyload,
                async onopen(res) {
                    clearTimeout(requestTimeoutId);
                    const contentType = res.headers.get("content-type");
                    console.log(
                        "[Agent] request response content type: ",
                        contentType,
                    );

                    if (contentType?.startsWith(("text/plain"))) {
                        responseText = await res.clone().text();
                        return finish();
                    }

                    if (!res.ok || !res.headers.get("content-type")?.startsWith(EventStreamContentType) || res.status !== 200) {
                        const responseTexts = [responseText];
                        let extraInfo = await res.clone().text();
                        try {
                            const resJson = await res.clone().json();
                            extraInfo = prettyObject(resJson);
                        } catch { }

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
                            if (toolCallsChunk[0].id != null) {
                                responseToolCalls.push({
                                    type: "function",
                                    id: toolCallsChunk[0].id,
                                    function: {
                                        name: toolCallsChunk[0].function.name,
                                        arguments: toolCallsChunk[0].function.arguments
                                    }
                                });
                            }
                            if (toolCallsChunk[0].arguments != "") {
                                const lastIndex = responseToolCalls.length - 1;
                                responseToolCalls[lastIndex].function.arguments = responseToolCalls[lastIndex].function.arguments + toolCallsChunk[0].function.arguments;
                            }
                        }

                        options.onUpdate?.(responseText, delta, responseToolCalls);
                    } catch (e) {
                        console.error("[Agent] parse error: ", text, msg);
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
        } else{
            const res = await fetch(agentChatPath, agentChatPalyload);
            clearTimeout(requestTimeoutId);
            const resJson = await res.json();
            const message = extractMessage(resJson);
            const toolCalls = extractToolCalls(resJson);
            options.onFinish(message, toolCalls);
        }
    } catch (e){
        console.log("[Agent] failed to make a agent chat request", e);
        options.onError?.(e as Error);
    }
}