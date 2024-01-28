import numpy as np
from fastapi import APIRouter
from fastapi import Request
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional, Union, Literal


images_router = APIRouter(prefix="/images")


class ImagesGenerationsRequest(BaseModel):
    prompt: str
    model: Union[str, Literal["dall-e-2", "dall-e-3"], None] = "dall-e-3"
    n: Optional[int] = 1
    quality: Literal["standard", "hd"] = None
    size: Optional[Literal["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]] = None
    style: Optional[Literal["vivid", "natural"]] = None


@images_router.post("/generations")
async def images_generations(request: ImagesGenerationsRequest):
    print(request.model_dump_json(indent=4))
    client = OpenAI()

    try:
        resp = client.images.generate(
            prompt=request.prompt,
            model=request.model,
            n=request.n,
            quality=request.quality,
            size=request.size,
            style=request.style
        )
        return resp
    except Exception as e:
        return {"error": str(e)}
