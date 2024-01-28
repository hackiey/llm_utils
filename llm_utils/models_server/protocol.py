from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any, Union


class UsageInfo(BaseModel):
    prompt_tokens: int = 0
    total_tokens: int = 0
    completion_tokens: Optional[int] = 0


class ErrorResponse(BaseModel):
    object: str = "error"
    message: str
    code: int
