import os
import random
import time
from pymongo import MongoClient


def get_evaluation_collection():
    MONGO_CLIENT = os.environ.get("MONGO_CLIENT", "")
    client = MongoClient(MONGO_CLIENT)
    db = client['llm_data']

    return db['evaluation_tasks'], db['evaluation_samples']


def create_evaluation_sample(task_id, sample, tags, replies, shuffle=True):
    messages = []
    for message in sample['messages'][:-1]:
        messages.append({
            "role": message['role'],
            "content": message['content']
        })
        if "name" in message:
            messages[-1]['name'] = message['name']
        if "function_call" in message:
            messages[-1]['function_call'] = message['function_call']

    indexes = list(range(len(tags)))

    if shuffle:
        random.shuffle(indexes)

    index_replies = []
    index_tags = []
    for index in indexes:
        index_replies.append(replies[index])
        index_tags.append(tags[index])

    return {
        "task_id": task_id,
        "sample_id": sample['_id'],
        "session_id": sample['session_id'],
        "messages": sample['messages'],
        "replies": replies,
        "reply_tags": index_tags,
        "rank_tags": [-1] * len(tags),
        "tasks": sample['tasks'],
        "tags": sample['tags'],
        "source": sample['source'],
        "language": sample['language'],
        "difficulty": sample['difficulty'],
        "create_time": int(time.time() * 1000),
        "verified": "未验证",
        "verified_user": "",
        "verified_time": -1,
        "update_user": "",
        "update_time": int(time.time() * 1000),
    }


def create_task(name, description, tags, evaluation_tasks_collection):
    evaluation_tasks_collection.insert_one({
        "name": name,
        "description": description,
        "models": tags,
        "create_time": int(time.time() * 1000),
        "type": "evaluation"
    })


def insert_evaluation_sample(sample, evaluation_samples_collection):
    evaluation_samples_collection.insert_one(sample)
