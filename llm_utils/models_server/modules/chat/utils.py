import os
import json
import time
from langdetect import detect
from datetime import datetime
from llm_utils.data.utils import get_messages_uid
from llm_utils.data.samples import get_chat_logs_collection, insert_chat_log, create_messages, create_chat_log, update_chat_log


def save_chat(messages):
    first_user_message = None
    for message in messages:
        if message['role'] == "user":
            first_user_message = message
            break

    if first_user_message is not None and 'id' in first_user_message and first_user_message['id'] is not None:
        chat_logs_collection, chat_logs_histories_collection = get_chat_logs_collection()

        session_id = first_user_message['id']
        old_chat_log = chat_logs_collection.find_one({"session_id": session_id})

        if old_chat_log is None:

            messages = create_messages({"messages": messages}, "zh-cn")
            chat_log = create_chat_log(messages, session_id, "chat", "zh-cn", {})

            insert_chat_log(chat_log, chat_logs_collection, chat_logs_histories_collection)

        else:
            # 对比历史messages，有变动的部分之前的不变，之后的重新保存
            save_messages = []
            old_messages = old_chat_log['messages']
            for i in range(len(messages)):
                if 'tool_calls' in messages[i] and messages[i]['tool_calls'] is not None and len(messages[i]['tool_calls']) > 0:
                    new_message_tool_calls_str = '\n'.join([t['id'] for t in messages[i]['tool_calls']])
                else:
                    new_message_tool_calls_str = ""

                if (i < len(old_messages) and 'tool_calls' in old_messages[i]
                        and old_messages[i]['tool_calls'] is not None and len(old_messages[i]['tool_calls']) > 0):
                    old_message_tool_calls_str = '\n'.join([t['id'] for t in old_messages[i]['tool_calls']])
                else:
                    old_message_tool_calls_str = ""

                # print(new_message_tool_calls_str)
                # print("====================================")
                # print(old_message_tool_calls_str)
                # import ipdb; ipdb.set_trace()

                if i < len(old_messages) and messages[i]['content'] == old_messages[i]['content'] \
                        and messages[i]['role'] == old_messages[i]['role'] \
                        and new_message_tool_calls_str == old_message_tool_calls_str:
                    save_messages.append(old_messages[i])
                else:
                    save_messages.append(messages[i])
            save_messages = create_messages({"messages": save_messages}, "zh-cn")
            updates = {
                "$set": {
                    "messages": save_messages,
                    "update_time": int(time.time() * 1000)
                }
            }
            update_chat_log(old_chat_log['_id'], updates, chat_logs_collection, chat_logs_histories_collection)
