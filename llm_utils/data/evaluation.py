import os
import random
import time
from pymongo import MongoClient


def get_evaluation_collection():
    MONGO_CLIENT = os.environ.get("MONGO_CLIENT", "")
    client = MongoClient(MONGO_CLIENT)
    db = client['llm_data']

    return db['evaluation_samples']


def get_evaluation_tasks_collection():
    MONGO_CLIENT = os.environ.get("MONGO_CLIENT", "")
    client = MongoClient(MONGO_CLIENT)
    db = client['llm_data']

    return db['evaluation_tasks']


def create_evaluation_sample(task_name, messages, referece, replies, reply_tags, tasks,  tags, source, language,
                             difficulty, meta, rank_tags=None, shuffle=True):

    indexes = list(range(len(reply_tags)))

    if shuffle:
        random.shuffle(indexes)

    index_replies = []
    index_reply_tags = []

    for index in indexes:
        index_replies.append(replies[index])
        index_reply_tags.append(reply_tags[index])

    return {
        "task_name": task_name,
        "messages": messages,
        "reference": referece,
        "replies": replies,
        "reply_tags": reply_tags,
        "rank_tags": [-1] * len(tags) if rank_tags is None else rank_tags,
        "tasks": tasks,
        "tags": tags,
        "source": source,
        "language": language,
        "difficulty": difficulty,
        "meta": meta,
        "create_user": "",
        "create_time": int(time.time() * 1000),
        "verified": "未验证",
        "verified_user": "",
        "verified_time": -1,
        "update_user": "",
        "update_time": int(time.time() * 1000),
    }


def insert_evaluation_sample(sample):
    MONGO_CLIENT = os.environ.get("MONGO_CLIENT", "")
    client = MongoClient(MONGO_CLIENT)
    db = client['llm_data']

    evaluation_samples = db['evaluation_samples']
    evaluation_samples.insert_one(sample)


def insert_evaluation_task(task):
    MONGO_CLIENT = os.environ.get("MONGO_CLIENT", "")
    client = MongoClient(MONGO_CLIENT)
    db = client['llm_data']

    evaluation_tasks = db['evaluation_tasks']
    evaluation_tasks.insert_one(task)
