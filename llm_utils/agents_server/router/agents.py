import os
import time
from pymongo import MongoClient
from fastapi import APIRouter, Request
from llm_utils.agents_server.agents import agents_run_action
from llm_utils.data.agents import get_agents_samples_collection, update_agent_sample

agents_router = APIRouter(prefix="/agents", tags=["agents"])
agents_samples_collection, agents_samples_histories_collection = get_agents_samples_collection()


@agents_router.post("/list")
async def list_agents(request: Request):
    params = await request.json()

    agents = []
    for agent in agents_samples_collection.find(
            {"name": params['name']}, {"agent_id": 1, "info": 1, "config": 1}).sort("create_time", 1):

        agents.append({
            "agent_id": agent["agent_id"],
            "info": agent["info"],
            "config": agent["config"],
        })

    return {"status": 200, "agents": agents}


@agents_router.post("/run_action")
async def run_action(request: Request):
    params = await request.json()
    sample = agents_samples_collection.find_one({"agent_id": params['agent_id']})
    if params['action_index'] < len(sample['actions']) - 1:
        sample['actions'] = sample['actions'][:params['action_index'] + 1]
        sample['observations'] = sample['observations'][:params['action_index'] + 1]
        update_agent_sample(sample['_id'], {"$set": {
                            "actions": sample['actions'],
                            "observations": sample['observations'],
                            "update_time": int(time.time() * 1000),
                        }}, agents_samples_collection, agents_samples_histories_collection)

    observation = agents_run_action[sample['name']](sample, params['action'])
    return {"status": 200, "observation": observation}


@agents_router.post("/get_config")
async def get_config(request: Request):
    params = await request.json()
    sample = agents_samples_collection.find_one({"agent_id": params['agent_id']})

    return {"status": 200, "config": sample['config'], "total_actions": len(sample['actions'])}


@agents_router.post("/jump_to_action")
async def jump_to_action(request: Request):
    params = await request.json()
    sample = agents_samples_collection.find_one({"agent_id": params['agent_id']})

    if len(sample['actions']) > params['action_index']:
        return {
            "status": 200,
            "action": sample['actions'][params['action_index']],
            "observation": sample['observations'][params['action_index']]
        }

    return {"status": 200, "action": None, "observation": None}