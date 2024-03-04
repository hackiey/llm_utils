import os
import time
import uuid
from pymongo import MongoClient


def create_agent_sample(name, info, config, environment, meta):
    agent_id = str(uuid.uuid4())
    agent = {
        "agent_id": agent_id,
        "name": name,
        "info": info,
        "config": config,
        "actions": [],
        "observations": [],
        "environment": environment,
        "meta": meta,
        "create_time": int(time.time() * 1000),
        "update_time": int(time.time() * 1000),
    }
    return agent


def get_agents_samples_collection():
    MONGO_CLIENT = os.getenv("MONGO_CLIENT", "mongodb://localhost:27017")
    print(MONGO_CLIENT)
    mongo_client = MongoClient(MONGO_CLIENT)
    db = mongo_client['llm_data']
    return db['agents_samples'], db['agents_samples_histories']


def insert_agent_sample(agent_sample, agents_samples_collection, agents_samples_history_collection):
    insert_result = agents_samples_collection.insert_one(agent_sample)

    new_sample = agents_samples_collection.find_one({"_id": insert_result.inserted_id})

    agents_samples_history_collection.insert_one({
        "agent_id": str(new_sample['_id']),
        "history": [new_sample]
    })


def update_agent_sample(_id, updates, agents_samples_collection, agents_samples_history_collection):
    agents_samples_collection.update_one({"_id": _id}, updates)
    new_sample = agents_samples_collection.find_one({"_id": _id})
    agents_samples_history_collection.update_one({"agent_id": str(_id)}, {"$push": {"history": new_sample}})
