import secrets
import time
from enum import Enum
from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any, Union
from llm_utils.models_server.protocol import UsageInfo


class EmbeddingsRequest(BaseModel):
    model: Optional[str] = None
    engine: Optional[str] = None
    input: Union[str, List[Any]]
    user: Optional[str] = None


class EmbeddingsResponse(BaseModel):
    object: str = "list"
    data: List[Dict[str, Any]]
    model: str
    usage: UsageInfo
