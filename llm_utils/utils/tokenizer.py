import os
import torch
from transformers import AutoTokenizer, LlamaTokenizer


BAICHUAN_SPECIAL_TOKENS = {
    "system": "<reserved_12>",
    "user": "<reserved_13>",
    "assistant": "<reserved_14>",
    "tool": "<reserved_15>",

    "use_tools": "<reserved_21>",
    "namespace": "<reserved_22>",
    "function_name": "<reserved_23>",
    "function_arguments": "<reserved_24>",
    "function_return": "<reserved_25>",

    "bos": "<s>",
    "eos": "</s>"
}

QWEN_SPECIAL_TOKENS = {
    "system": "<|extra_1|>",
    "user": "<|extra_2|>",
    "assistant": "<|extra_3|>",
    "tool": "<|extra_4|>",

    "use_tools": "<|extra_10|>",
    "namespace": "<|extra_11|>",
    "function_name": "<|extra_12|>",
    "function_arguments": "<|extra_13|>",
    "function_return": "<|extra_14|>",

    "bos": "<|im_start|>",
    "eos": "<|im_end|>"
}


IGNORE_INDEX = -100

tools_prompt = '''
# Tools

## functions

namespace functions
'''


def format_tool(tool):

    func = tool['function']

    func_name = func['name']
    parameters = func['parameters']
    description = func['description']

    def format_property(k, v):
        property_str = ""

        property_type = ""
        if 'enum' in v and len(v['enum']) > 0:
            if v['type'] == "string":
                property_type = " | ".join(['"{}"'.format(e) for e in v['enum']])
            else:
                property_type = " | ".join(str(v['enum']))
        else:
            property_type = v['type']

        if 'description' in v:
            property_str = f"        //{v['description']}\n"

        return property_str + f'''        {k}{"?" if k not in parameters['required'] else ""}: {property_type},'''

    properties = "\n".join([format_property(k, v) for k, v in parameters['properties'].items()])

    tool_prompt = f'''
    // {description}
    type {func_name} = (_: {{
{properties}
    }}) => any;
'''

    return tool_prompt


def get_tokenizer(model_name, model_dir, add_special_tokens=True):
    # MODELS_DIR = os.getenv("MODELS_DIR", "/mnt/iem-nas/home/share/llm_share/models")

    if model_name.startswith("Baichuan2"):
        print(os.path.join(model_dir, model_name))
        tokenizer = AutoTokenizer.from_pretrained(os.path.join(model_dir, model_name), fast_tokenizer=True, trust_remote_code=True)
        tokenizer.pad_token_id = 0
        tokenizer.system_token_id = 101
        tokenizer.user_token_id = 102
        tokenizer.assistant_token_id = 103
        tokenizer.tool_token_id = 104

        tokenizer.use_tools_token_id = 110
        tokenizer.namespace_token_id = 111
        tokenizer.function_name_token_id = 112
        tokenizer.function_arguments_token_id = 113
        tokenizer.function_return_token_id = 114

        return tokenizer

    elif model_name.startswith("Qwen") or model_name.startswith("qwen"):
        print(os.path.join(model_dir, model_name))
        tokenizer = AutoTokenizer.from_pretrained(os.path.join(model_dir, model_name), fast_tokenizer=True, trust_remote_code=True)
        tokenizer.pad_token_id = 151646  # <|extra_0|>
        tokenizer.system_token_id = 151647  # <|extra_1|>
        tokenizer.user_token_id = 151648  # <|extra_2|>
        tokenizer.assistant_token_id = 151649  # <|extra_3|>
        tokenizer.tool_token_id = 151650  # <|extra_4|>

        tokenizer.use_tools_token_id = 151656  # <|extra_10|>
        tokenizer.namespace_token_id = 151657  # <|extra_11|>
        tokenizer.function_name_token_id = 151658  # <|extra_12|>
        tokenizer.function_arguments_token_id = 151659  # <|extra_13|>
        tokenizer.function_return_token_id = 151660  # <|extra_14|>

        tokenizer.bos_token_id = 151644  # <|im_start|>
        tokenizer.eos_token_id = 151645  # <|im_end|>

        return tokenizer

    raise NotImplementedError


def tokenize_messages(tokenizer, messages, tools=None, type='train', max_seq_length=2048):

    if 'Baichuan2-7B' in tokenizer.name_or_path:
        special_tokens = BAICHUAN_SPECIAL_TOKENS
    elif 'Baichuan2-13B' in tokenizer.name_or_path or "Baichuan2_13B" in tokenizer.name_or_path:
        special_tokens = BAICHUAN_SPECIAL_TOKENS
    elif "Qwen-14B" in tokenizer.name_or_path or "Qwen_14B" in tokenizer.name_or_path or "qwen_14b" in tokenizer.name_or_path:
        special_tokens = QWEN_SPECIAL_TOKENS
    else:
        raise NotImplementedError

    messages_str = special_tokens["bos"] + special_tokens["system"]

    if len(messages) > 0 and messages[0]['role'] == "system":
        messages_str = messages_str + messages[0]['content']
        messages = messages[1:]

    if tools is not None and len(tools) > 0:
        messages_str = messages_str + "\n\n" + special_tokens["use_tools"] + "\n"
        tools_prompt = '\n'.join([format_tool(tool) for tool in tools])
        messages_str = messages_str + f'''# Tools
        
## functions

namespace functions {{
{tools_prompt}
}} // namespace functions
'''

    for i, message in enumerate(messages):
        if message['role'] == "user":
            messages_str = messages_str + special_tokens["user"] + message['content']

        elif message['role'] == "assistant":
            messages_str = messages_str + special_tokens["assistant"]

            if 'content' in message and message['content'] is not None:
                messages_str = messages_str + message['content']

            if 'tool_calls' in message and message['tool_calls'] is not None and len(message['tool_calls']) > 0:
                for tool_call in message['tool_calls']:
                    messages_str = messages_str + special_tokens["namespace"] + "functions"
                    messages_str = messages_str + special_tokens["function_name"] + tool_call['function']['name']
                    messages_str = messages_str + special_tokens["function_arguments"] + tool_call['function']['arguments']
            messages_str = messages_str + special_tokens["eos"]

        elif message['role'] == "tool":
            messages_str = messages_str + special_tokens["tool"] + special_tokens['namespace'] + "function"
            messages_str = messages_str + special_tokens["function_name"] + message['name'] + special_tokens["function_return"] + message['content']

        else:
            # 仅支持起始位置有system
            raise NotImplementedError

    if type == "inference":
        messages_str = messages_str + special_tokens["assistant"]

    inputs = tokenizer.encode(messages_str, add_special_tokens=True, return_tensors='pt', max_length=max_seq_length,
                              truncation=True)
    # input_ids = inputs[0]

    attention_mask = torch.ones(inputs.shape, dtype=torch.long)

    return {"input_ids": inputs, "attention_mask": attention_mask}


if __name__ == '__main__':
    MODELS_DIR = os.getenv("MODELS_DIR", "/mnt/iem-nas/home/share/llm_share/models")
    tokenizer = get_tokenizer("Baichuan2-13B-Base", MODELS_DIR)
    # messages = [{"role": "user", "content": "你好"}, {"role": "assistant", "content": "你好"}]
    #
    # inputs = tokenize_messages(tokenizer, messages, max_seq_length=1024)
    # print(inputs)
    tools = [{
        "type": "function",
        "function": {
            "name": "get_user_info",
            "description": "获取用户信息",
            "parameters": {
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "用户id"
                    },
                    "user_name": {
                        "type": "string",
                        "description": "用户名称"
                    },
                    "user_age": {
                        "type": "number",
                        "description": "用户年龄",
                        "enum": ["10", "20", "30"]
                    }
                },
                "required": ["user_id"]
            }
        }
    }, {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取天气信息",
            "parameters": {
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["摄氏度", "华氏度"],
                    },
                },
                "required": ["city"]
            }
        }
    }]

    messages = [
        {"role": "system", "content": "请尽力回答用户问题，你可以使用工具"},
        {"role": "user", "content": "你好"},
        {"role": "assistant", "content": "你好，我是小助手"},
        # {"role": "user", "content": "上海和北京天气怎么样"},
        # {"role": "assistant", "content": None, "tool_calls": [
        #     {"type": "function", "function": {"name": "get_weather", "arguments": '{"city": "上海", "unit": "摄氏度"}'}},
        #     {"type": "function", "function": {"name": "get_weather", "arguments": '{"city": "北京", "unit": "摄氏度"}'}},
        # ]},
        # {"role": "tool", "name": "get_weather", "content": "上海天气晴朗"},
        # {"role": "tool", "name": "get_weather", "content": "北京天气晴朗"},
        # {"role": "assistant", "content": "上海和北京的天气都是晴朗"},
    ]
    # print(format_tool(tool))

    inputs = tokenize_messages(tokenizer, messages, tools=None, max_seq_length=1024)

    print(inputs)
