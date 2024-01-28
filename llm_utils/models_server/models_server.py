import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.requests import Request

from llm_utils.models_server.modules.chat.chat import chat_router
from llm_utils.models_server.modules.embeddings.embeddings import embedding_router
from llm_utils.models_server.modules.tools.tools import tools_router
from llm_utils.models_server.modules.images.images import images_router
from llm_utils.models_server.modules.lab.lab import lab_router

port = int(os.getenv("PORT", 8000))


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = "/v1"
app.include_router(chat_router, prefix=prefix, tags=["Chat"])
app.include_router(embedding_router, prefix=prefix, tags=["Embedding"])
app.include_router(tools_router, prefix=prefix, tags=['Tools'])

app.include_router(images_router, prefix=prefix, tags=['Images'])
app.include_router(lab_router, prefix="", tags=['Lab'])


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
    print(f"{request}: {exc_str}")


if __name__ == "__main__":
    workers = int(os.getenv("WORKERS", 1))
    uvicorn.run("models_server:app", host='0.0.0.0', port=port, workers=workers, log_level="debug")
