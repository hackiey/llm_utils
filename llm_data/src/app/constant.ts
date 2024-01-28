import {LLMConfig} from "@/app/client/platforms/openai";
import {FilterOperators} from "@/app/types";
import config from "@/app/config.json";

export const REQUEST_TIMEOUT_MS = 10000;

export const OpenaiPath = {
    ChatPath: "v1/chat/completions",
    UsagePath: "dashboard/billing/usage",
    SubsPath: "dashboard/billing/subscription",
    ListModelPath: "v1/models",
};
export const ToolsPath = {
    SearchPath: "v1/tools/search",
}

export const modelConfig: LLMConfig = config.llm_config;

export const AvailableModels = config.available_models;
export const AssistantAvailableModels = config.assistant_available_models;

export const FilterItemOperators: {[index: string]: any[]} = {
    select: [FilterOperators.Equal, FilterOperators.Contains, FilterOperators.NotContains],
    text: [FilterOperators.Contains, FilterOperators.NotContains, FilterOperators.Equal, FilterOperators.NotEqual, FilterOperators.IsEmpty, FilterOperators.NotEmpty],
    date: [FilterOperators.Before, FilterOperators.After],
}

export const ColumnItems: {[index: string]: any} = config.column_items;