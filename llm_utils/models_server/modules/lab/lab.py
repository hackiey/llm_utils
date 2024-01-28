
from fastapi import APIRouter
from llm_utils.models_server.modules.lab.llm_challenges import (
    llm_challenges, LLMChallengesProblemRequest, LLMChallengesValidateRequest)

lab_router = APIRouter(prefix="/lab")


@lab_router.post("/llm-challenges/problem")
async def llm_challenges_next_problem(request: LLMChallengesProblemRequest):
    return llm_challenges.get_problem(request)


@lab_router.post("/llm-challenges/validate")
async def llm_challenges_validate(request: LLMChallengesValidateRequest):
    return llm_challenges.validate(request)


@lab_router.post("/llm-challenges/next-problem")
async def llm_challenges_next_problem(request: LLMChallengesProblemRequest):
    return llm_challenges.get_next_problem(request)
