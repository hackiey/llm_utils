import secrets
import time
from enum import Enum
from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any, Union
from llm_utils.models_server.protocol import UsageInfo


class Role(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    FUNCTION = "function"
    TOOL = "tool"


# class ModelPermission(BaseModel):
#     id: str = Field(default_factory=lambda: f"modelperm-{secrets.token_hex(12)}")
#     object: str = "model_permission"
#     created: int = Field(default_factory=lambda: int(time.time()))
#     allow_create_engine: bool = False
#     allow_sampling: bool = True
#     allow_logprobs: bool = True
#     allow_search_indices: bool = True
#     allow_view: bool = True
#     allow_fine_tuning: bool = False
#     organization: str = "*"
#     group: Optional[str] = None
#     is_blocking: str = False


class ModelCard(BaseModel):
    id: str
    object: str = "model"
    created: int = Field(default_factory=lambda: int(time.time()))
    owned_by: str = "  dnect"
    root: Optional[str] = None
    parent: Optional[str] = None
    # permission: List[ModelPermission] = []


class ModelList(BaseModel):
    object: str = "list"
    data: List[ModelCard] = []


class ChatFunctionProperties(BaseModel):
    type: str
    description: Optional[str] = None
    enum: Optional[List[str]] = None
    items: Optional[object] = None
    minItems: Optional[int] = None
    maxItems: Optional[int] = None


class ChatFunctionParameters(BaseModel):
    type: str = "object"
    properties: Dict[str, ChatFunctionProperties] = {}
    required: List[str] = []


class ChatFunction(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: ChatFunctionParameters


class ChatTool(BaseModel):
    type: str
    function: ChatFunction


class FunctionCallResponse(BaseModel):
    name: Optional[str] = None
    arguments: Optional[str] = None


class ChatCompletionMessageToolCall(BaseModel):
    id: str
    function: FunctionCallResponse
    type: str


class ChatMessageImageUrl(BaseModel):
    url: str
    detail: Optional[str] = None


class ChatMessageMultiModel(BaseModel):
    type: str
    text: Optional[str] = None
    image_url: Optional[ChatMessageImageUrl] = None


class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str
    content: Optional[Union[str, List[ChatMessageMultiModel]]] = None
    name: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_calls: Optional[List[ChatCompletionMessageToolCall]] = None
    functions: Optional[List[ChatFunction]] = None
    function_call: Optional[FunctionCallResponse] = None


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    n: Optional[int] = 1
    max_tokens: Optional[int] = None
    stop: Optional[Union[str, List[str]]] = None
    stream: Optional[bool] = False
    presence_penalty: Optional[float] = 0.0
    frequency_penalty: Optional[float] = 0.0
    user: Optional[str] = None
    functions: Optional[List[ChatFunction]] = None
    function_call: Union[str, Dict[str, str]] = "auto"
    tools: Optional[List[ChatTool]] = None
    tool_choice: Union[str, Dict[str, str]] = "auto"

    # Additional parameters supported by vLLM
    best_of: Optional[int] = None
    top_k: Optional[int] = -1
    ignore_eos: Optional[bool] = False
    use_beam_search: Optional[bool] = False


class ChatCompletionResponseChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[Literal["stop", "length", "function_call"]] = None


class ChatCompletionResponse(BaseModel):
    id: str = Field(default_factory=lambda: f"chatcmpl-{secrets.token_hex(12)}")
    object: str = "chat.completion"
    created: int = Field(default_factory=lambda: int(time.time()))
    model: str
    choices: List[ChatCompletionResponseChoice]
    usage: UsageInfo


class DeltaMessage(BaseModel):
    role: Optional[str] = None
    content: Optional[str] = None
    function_call: Optional[FunctionCallResponse] = None


class ChatCompletionResponseStreamChoice(BaseModel):
    index: int
    delta: DeltaMessage
    finish_reason: Optional[Literal["stop", "length", "function_call"]] = None


class ChatCompletionStreamResponse(BaseModel):
    id: str = Field(default_factory=lambda: f"chatcmpl-{secrets.token_hex(12)}")
    object: str = "chat.completion.chunk"
    created: int = Field(default_factory=lambda: int(time.time()))
    model: str
    choices: List[ChatCompletionResponseStreamChoice]


class ChatVoteRequest(BaseModel):
    session_id: str
    message_id: str
    vote: int
