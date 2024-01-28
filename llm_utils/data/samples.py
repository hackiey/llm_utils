import os
from pymongo import MongoClient
import time

from llm_utils.data.utils import get_messages_uid


def create_messages(d, lang):
    messages = []

    for message in d['messages']:
        messages.append({
            "id": "",

            "role": message['role'],
            "content": message['content'] if 'content' in message else None,
            "name": message['name'] if 'name' in message else None,
            "tool_calls": message['tool_calls'] if 'tool_calls' in message else None,
            "tool_call_id": message['tool_call_id'] if 'tool_call_id' in message else None,

            "tools": message['tools'] if 'tools' in message else None,
            "system": message['system'] if 'system' in message else None,

            "vote": message['vote'] if 'vote' in message else 0,
            "model": message['model'] if 'model' in message else "",
            "tags": [],

            "language": lang,
            "create_time": int(time.time() * 1000),
            "update_time": int(time.time() * 1000),
            "create_user": "",
            "update_user": ""
        })

    return messages


def create_sample(messages, tasks, tags, difficulty, source, language, meta):
    return {
        "session_id": "",
        "hash_id": get_messages_uid(messages),
        "messages": messages,
        "tasks": tasks,
        "tags": tags,
        "source": source,
        "language": language,
        "meta": meta,
        "verified": "未验证",
        "difficulty": difficulty,
        "deleted": "未删除",
        "marked": "未标记",
        "inspection": "待质检",
        "marked_user": "",
        "create_time": int(time.time()*1000),
        "update_time": int(time.time()*1000),
        "create_user": "",
        "update_user": "",
        "verified_user": "",
        "verified_time": -1,
        "tokens": {
            "tokens": 0,
            "characters": sum([len(message['content']) for message in messages if message['content'] is not None]),
        },
        "data_type": "train"
    }


def create_chat_log(messages, session_id, source, language, meta):
    return {
        "session_id": session_id,
        "hash_id": get_messages_uid(messages),
        "messages": messages,
        "source": source,
        "language": language,
        "meta": meta,
        "status": "待处理",  # "已发送"/"已删除"/"待处理"
        "create_time": int(time.time()*1000),
        "update_time": int(time.time()*1000),
        "create_user": "",
        "update_user": ""
    }


def insert_sample(sample, samples_collection, samples_histories_collection):
    insert_result = samples_collection.insert_one(sample)

    new_sample = samples_collection.find_one({"_id": insert_result.inserted_id})

    samples_histories_collection.insert_one({
        "sample_id": str(new_sample['_id']),
        "history": [new_sample]
    })


def update_sample(_id, updates, samples_collection, samples_histories_collection):
    samples_collection.update_one({"_id": _id}, updates)
    new_sample = samples_collection.find_one({"_id": _id})
    samples_histories_collection.update_one({"sample_id": str(_id)}, {"$push": {"history": new_sample}})


def get_samples_collection():
    MONGO_CLIENT = os.getenv("MONGO_CLIENT", "mongodb://localhost:27017")
    mongo_client = MongoClient(MONGO_CLIENT)
    db = mongo_client['llm_data']
    return db['samples'], db['samples_histories']


def insert_chat_log(chat_log, chat_logs_collection, chat_logs_histories_collection):
    insert_result = chat_logs_collection.insert_one(chat_log)
    new_chat_log = chat_logs_collection.find_one({"_id": insert_result.inserted_id})

    chat_logs_histories_collection.find_one({"_id": insert_result.inserted_id})

    chat_logs_histories_collection.insert_one({
        "chat_log_id": str(new_chat_log['_id']),
        "history": [new_chat_log]
    })


def update_chat_log(_id, updates, chat_logs_collection, chat_logs_histories_collection):
    chat_logs_collection.update_one({"_id": _id}, updates)
    new_chat_log = chat_logs_collection.find_one({"_id": _id})
    chat_logs_histories_collection.update_one({"chat_log_id": str(_id)}, {"$push": {"history": new_chat_log}})


def get_chat_logs_collection():
    MONGO_CLIENT = os.getenv("MONGO_CLIENT", "mongodb://localhost:27017")
    mongo_client = MongoClient(MONGO_CLIENT)
    db = mongo_client['llm_data']
    return db['chat_logs'], db['chat_logs_histories']
