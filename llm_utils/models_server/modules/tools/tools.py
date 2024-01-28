import json
from fastapi import Request
from fastapi import APIRouter

from llm_utils.models_server.modules.tools.duckduckgo_search.plugin import duckduckgo_search
from llm_utils.models_server.modules.tools.web_crawler.plugin import web_crawler

tools_router = APIRouter(prefix="/tools")


@tools_router.post("/duckduckgo_search")
async def _duckduckgo_search(request: Request):
    params = await request.json()
    return duckduckgo_search(params['query'])


@tools_router.post("/web_crawler")
async def _web_crawler(request: Request):
    params = await request.json()
    return web_crawler(params['url'])
