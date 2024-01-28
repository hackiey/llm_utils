import json
import secrets
from openai import OpenAI
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk, ChoiceDelta, Choice
from typing import Generator, Optional, Union, Dict, List, Any
from loguru import logger
from http import HTTPStatus
from dashscope import Generation
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from llm_utils.models_server.utils import check_requests
from llm_utils.models_server.models.models import generate_models
from llm_utils.models_server.modules.chat.protocol import (
    ChatCompletionRequest,
    ChatCompletionResponseStreamChoice,
    ChatCompletionStreamResponse,
    ChatCompletionResponseChoice,
    ChatCompletionResponse,
    ChatMessage,
    DeltaMessage,
    UsageInfo,
    Role,
)
from llm_utils.models_server.utils import create_error_response
from llm_utils.models_server.modules.chat.utils import save_chat

chat_router = APIRouter(prefix="/chat")


@chat_router.post("/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    print("==================================================================================================")
    print(datetime.now().strftime("%H:%M:%S"), f"stream: {request.stream}", request.messages[-1].content)
    print(request.model_dump_json(indent=4))

    if request.model.startswith("gpt"):
        return gpt_response(request)

    if request.model in ["qwen-14b-chat", "qwen-72b-chat", "qwen-turbo", "qwen-plus", "qwen-max", "qwen-max-1201", "qwen-max-longcontext"]:
        return qwen_response(request)

    # other models
    error_check_ret = check_requests(request)
    if error_check_ret is not None:
        return error_check_ret

    # TODO: function call
    with_function_call = False

    messages = request.messages

    gen_params = get_gen_params(
        request.model,
        messages,
        temperature=request.temperature,
        top_p=request.top_p,
        max_tokens=request.max_tokens,
        echo=False,
        stream=request.stream,
        stop=request.stop,
        with_function_call=with_function_call,
    )

    if request.stream:
        generator = chat_completion_stream_generator(
            request.model, gen_params, request.n
        )
        return StreamingResponse(generator, media_type="text/event-stream")

    choices = []
    usage = UsageInfo()
    for i in range(request.n):
        model = generate_models[request.model]
        content = model.generate_gate(gen_params)
        if content["error_code"] != 0:
            return create_error_response(content["error_code"], content["text"])

        finish_reason = "stop"

        message = ChatMessage(role=Role.ASSISTANT, content=content["text"])

        choices.append(
            ChatCompletionResponseChoice(
                index=i,
                message=message,
                finish_reason=finish_reason,
            )
        )
        task_usage = UsageInfo.model_validate(content["usage"])
        for usage_key, usage_value in task_usage.model_dump().items():
            setattr(usage, usage_key, getattr(usage, usage_key) + usage_value)

    return ChatCompletionResponse(model=request.model, choices=choices, usage=usage)


def get_gen_params(
    model_name: str,
    messages: Union[str, List[ChatMessage]],
    *,
    temperature: float,
    top_p: float,
    max_tokens: Optional[int],
    echo: Optional[bool],
    stream: Optional[bool],
    stop: Optional[Union[str, List[str]]] = None,
    with_function_call: Optional[bool] = False,
) -> Dict[str, Any]:
    if not max_tokens:
        max_tokens = 1024

    gen_params = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "top_p": top_p,
        "max_new_tokens": max_tokens,
        "echo": echo,
        "stream": stream,
        "with_function_call": with_function_call,
    }

    if stop is not None:
        if isinstance(stop, str):
            stop = [stop]

        gen_params["stop"] = gen_params["stop"] + stop if "stop" in gen_params else stop
        gen_params["stop"] = list(set(gen_params["stop"]))

    logger.debug(f"==== request ====\n{gen_params}")
    return gen_params


async def chat_completion_stream_generator(
    model_name: str, gen_params: Dict[str, Any], n: int
) -> Generator[str, Any, None]:
    """
    Event stream format:
    https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format
    """

    model = generate_models[model_name]
    _id = f"chatcmpl-{secrets.token_hex(12)}"
    finish_stream_events = []
    for i in range(n):
        # First chunk with role
        choice_data = ChatCompletionResponseStreamChoice(
            index=i,
            delta=DeltaMessage(role=Role.ASSISTANT),
            finish_reason=None,
        )
        chunk = ChatCompletionStreamResponse(
            id=_id, choices=[choice_data], model=model_name
        )
        yield f"data: {json.dumps(chunk.model_dump(exclude_unset=True), ensure_ascii=False)}\n\n"

        previous_text = ""
        with_function_call = gen_params.get("with_function_call", False)
        found_action_name = False

        for content in model.generate_stream_gate(gen_params):
            if content["error_code"] != 0:
                yield f"data: {json.dumps(content, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

            decoded_unicode = content["text"].replace("\ufffd", "")
            delta_text = decoded_unicode[len(previous_text):]
            previous_text = decoded_unicode

            if len(delta_text) == 0:
                delta_text = None

            messages = []
            if with_function_call:
                pass
            else:
                messages = [DeltaMessage(content=delta_text)]
                finish_reason = content.get("finish_reason", "stop")

            chunks = []
            for m in messages:
                choice_data = ChatCompletionResponseStreamChoice(
                    index=i,
                    delta=m,
                    finish_reason=finish_reason,
                )
                chunks.append(ChatCompletionStreamResponse(id=_id, choices=[choice_data], model=model_name))

            if delta_text is None:
                if content.get("finish_reason", None) is not None:
                    finish_stream_events.extend(chunks)
                continue

            for chunk in chunks:
                yield f"data: {json.dumps(chunk.model_dump(exclude_unset=True), ensure_ascii=False)}\n\n"

    # There is not "content" field in the last delta message, so exclude_none to exclude field "content".
    for finish_chunk in finish_stream_events:
        yield f"data: {json.dumps(finish_chunk.model_dump(exclude_none=True), ensure_ascii=False)}\n\n"

    yield "data: [DONE]\n\n"


# ==================================================================================================
def gpt_response_generator(params, request):
    client = OpenAI()
    resp = client.chat.completions.create(**params)

    content = ""
    function_call = None
    tool_calls = []
    for chunk in resp:
        delta = chunk.choices[0].delta.model_dump()

        if 'content' in delta and delta['content'] is not None:
            content += delta['content']
        if 'function_call' in delta and delta['function_call'] is not None:
            if 'name' in delta['function_call'] and delta['function_call']['name'] is not None:
                function_call = delta['function_call']
            if 'arguments' in delta['function_call'] and delta['function_call']['arguments'] is not None:
                function_call['arguments'] += delta['function_call']['arguments']
        if 'tool_calls' in delta and delta['tool_calls'] is not None:
            if delta['tool_calls'][0]['id'] is not None:
                tool_calls.append(delta['tool_calls'][0])
            else:
                tool_calls[-1]['function']['arguments'] += delta['tool_calls'][0]['function']['arguments']

            if (len(tool_calls[-1]['function']['arguments']) > 0 and
                    len(tool_calls[-1]['function']['arguments'].strip("\\n")) / len(tool_calls[-1]['function']['arguments']) < 0.2):
                if not tool_calls[-1]['function']['arguments'].endswith('"}'):
                    tool_calls[-1]['function']['arguments'] += '"}'
                    chunk.choices[0].delta.tool_calls[-1].function.arguments += '"}'
                    yield f"data: {chunk.model_dump_json()}\n\n"

                    chunk = ChatCompletionChunk(id=chunk.id, choices=[
                        Choice(delta=ChoiceDelta(content=None, function_call=None, role=None, tool_calls=None),
                               finish_reason="tool_calls", index=chunk.choices[0].index, logprobs=None)],
                                created=chunk.created, model=chunk.model, object=chunk.object, system_fingerprint=chunk.system_fingerprint)

                    yield f"data: {chunk.model_dump_json()}\n\n"

                break
        yield f"data: {chunk.model_dump_json()}\n\n"

    yield 'data: [DONE]\n\n'
    print(datetime.now().strftime("%H:%M:%S"), "stream done")

    assistant_message = {
        "role": "assistant",
        "content": content,
        "function_call": function_call,
        "tool_calls": tool_calls,
        "tools": params['tools'] if 'tools' in params else None,
        "functions": params['functions'] if 'functions' in params else None,
        "system": params['messages'][0]['content'] if params['messages'][0]['role'] == "system" else None,
        "model": params['model']
    }
    print(assistant_message)

    messages_with_response = [message.model_dump() for message in request.messages] + [assistant_message]
    # 存储有id的对话
    first_user_message = [message for message in messages_with_response if message['role'] == "user"][0]
    if 'id' in first_user_message and first_user_message['id'] is not None:
        save_start_time = datetime.now()
        save_chat(messages_with_response)
        save_end_time = datetime.now()
        print(datetime.now().strftime("%H:%M:%S"), "save done", save_end_time - save_start_time)


def gpt_response(request: ChatCompletionRequest):

    # messages = [{"role": message.role, "content": message.content} for message in request.messages]
    messages = []
    for message in request.messages:
        messages.append({
            "role": message.role,
            "content": message.content,
        })
        if message.name is not None and message.name != "":
            messages[-1]["name"] = message.name
        if message.tool_call_id is not None and message.tool_call_id != "":
            messages[-1]["tool_call_id"] = message.tool_call_id
        if message.tool_calls is not None and len(message.tool_calls) > 0:
            messages[-1]["tool_calls"] = [json.loads(tool.model_dump_json()) for tool in message.tool_calls]

    params = {
        "model": request.model,
        "messages": messages,
        "stream": request.stream,
        "temperature": request.temperature,
        "top_p": request.top_p,
    }
    if request.max_tokens is not None:
        params["max_tokens"] = request.max_tokens

    tools = [tool.model_dump(exclude_none=True) for tool in request.tools] if request.tools is not None else None
    functions = [function.model_dump(exclude_none=True) for function in request.functions] if request.functions is not None else None

    if tools is not None and len(tools) > 0:
        params.update({"tools": tools, "tool_choice": request.tool_choice})

    if functions is not None and len(functions) > 0:
        params.update({"functions": functions, "function_call": request.function_call})

    if request.stream:
        response = gpt_response_generator(params, request)
        return StreamingResponse(response, media_type="text/event-stream")
    else:
        client = OpenAI()
        resp = client.chat.completions.create(**params)

        # messages_with_response = params['messages'] + [json.loads(resp.choices[0].message.model_dump_json())]
        # save_chat(messages_with_response, request.model)

        print(datetime.now().strftime("%H:%M:%S"), "done")
        return resp


# ==================================================================================================
def qwen_response_generator(params, request):
    params.update({
        "stream": True,
        "incremental_output": True,
    })

    responses = Generation.call(**params)

    i = 0
    _id = f"chatcmpl-{secrets.token_hex(12)}"
    choice_data = ChatCompletionResponseStreamChoice(
        index=i,
        delta=DeltaMessage(role=Role.ASSISTANT),
        finish_reason=None
    )
    chunk = ChatCompletionStreamResponse(
        id=_id, choices=[choice_data], model=params['model']
    )
    yield f"data: {json.dumps(chunk.model_dump(exclude_unset=True), ensure_ascii=False)}\n\n"

    content = ""
    for response in responses:
        if response.status_code == HTTPStatus.OK:
            choice_data = ChatCompletionResponseStreamChoice(
                index=i,
                delta=DeltaMessage(content=response.output.choices[0]['message']['content']),
                finish_reason=None if response.output.finish_reason == "null" else response.output.finish_reason,
            )
            chunk = ChatCompletionStreamResponse(id=_id, choices=[choice_data], model=params['model'])

            content = content + chunk.choices[0].delta.content

            yield f"data: {json.dumps(chunk.model_dump(exclude_unset=True), ensure_ascii=False)}\n\n"

    yield 'data: [DONE]\n\n'

    messages_with_response = [message.model_dump() for message in request.messages] + [{
        "role": "assistant",
        "content": content,
        "model": params['model']
    }]
    # save_chat(messages_with_response, model_name=params['model'])


def qwen_response(request: ChatCompletionRequest):

    messages = []
    for message in request.messages:
        messages.append({
            "role": message.role,
            "content": message.content,
        })

    params = {
        "model": request.model,
        "messages": messages,
        "temperature": request.temperature,
        "top_p": request.top_p,
        "result_format": 'message'
    }

    if request.stream:
        response = qwen_response_generator(params, request)
        return StreamingResponse(response, media_type="text/event-stream")

    else:
        resp = Generation.call(**params)
        print(datetime.now().strftime("%H:%M:%S"), "done")
        usage = UsageInfo()

        usage.prompt_tokens = resp.usage.input_tokens
        usage.completion_tokens = resp.usage.output_tokens
        usage.total_tokens = resp.usage.total_tokens
        choices = [ChatCompletionResponseChoice(index=0,
                                                finish_reason=resp.output.choices[0]['finish_reason'],
                                                message=resp.output.choices[0].message)]
        return ChatCompletionResponse(model=request.model, choices=choices, usage=usage)
