import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from llm_utils.agents_server.router.agents import agents_router

port = int(os.getenv("PORT", 8010))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = "/v1"
app.include_router(agents_router, prefix=prefix, tags=["Agents"])


if __name__ == "__main__":
    uvicorn.run("agents_server:app", host='0.0.0.0', port=port, workers=1, log_level="debug")
