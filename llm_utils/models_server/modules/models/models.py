import time

from typing import List
from pydantic import BaseModel
from openai.types.model import Model

from fastapi import APIRouter, status


models_router = APIRouter(prefix="")


class ModelList(BaseModel):
    object: str = "list"
    data: List[Model] = []


available_models = ModelList(
    data=[
        Model(id=name, object='model', created=int(time.time()), owned_by='open')
        for name in ["gpt-4o", "gpt-4o-mini"]
    ]
)


@models_router.get("/models", status_code=status.HTTP_200_OK)
async def show_available_models():
    return available_models

