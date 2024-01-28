
# TODO: llm_utils/utils/tokenizer.py中get_tokenizer与原版不兼容

generate_models_config = {
    "baichuan2_13b_chat": {
        "dir": "baichuan-inc/Baichuan2-13B-Chat",
        "tokenizer": {"name": "Baichuan2-13B-Chat", "dir": "baichuan-inc/Baichuan2-13B-Chat"},
        "context_len": 4096,
    },
}

embedding_models_config = {
    "bge-base-zh-v1.5": {
        "dir": f"BAAI/bge-base-zh-v1.5",
        "tokenizer": {"name": "BAAI/bge-base-zh-v1.5", "dir": ""},
        "context_len": 512,
    }
}
