import os

RELEASES_DIR = os.environ.get("RELEASES_DIR", "/mnt/iem-nas/home/share/llm_share/checkpoints/releases")
SFT_DIR = os.environ.get("SFT_DIR", "/mnt/iem-nas/home/share/llm_share/checkpoints/sft")
MODELS_DIR = os.environ.get("MODELS_DIR", "/mnt/iem-nas/home/share/llm_share/models")

generate_models_config = {
    "baichuan2_13b-1221": {
        "dir": f"{RELEASES_DIR}/baichuan2_13b-1221",
        "tokenizer": {"name": "Baichuan2-13B-Base", "dir": MODELS_DIR},
        "context_len": 4096,
    },
    "qwen_14b-1221": {
        "dir": f"{RELEASES_DIR}/qwen_14b-1221",
        "tokenizer": {"name": "qwen_14b-1221", "dir": RELEASES_DIR},
        "context_len": 4096,
    },
    "baichuan2_7b_new_search_rewrite_0110": {
        "dir": f"{SFT_DIR}/Baichuan2_7B_new_search_rewrite_0110",
        "tokenizer": {"name": "Baichuan2-7B-Base", "dir": MODELS_DIR},
        "context_len": 2048,
    },
    "baichuan2_13b_new_search_rewrite_0110": {
        "dir": f"{SFT_DIR}/Baichuan2_13B_new_search_rewrite_0110",
        "tokenizer": {"name": "Baichuan2-13B-Base", "dir": MODELS_DIR},
        "context_len": 4096,
    },
    "baichuan2_13b_1221_new_search_rewrite_0110": {
        "dir": f"{SFT_DIR}/Baichuan2_13B_1221_new_search_rewrite_0110",
        "tokenizer": {"name": "Baichuan2-13B-Base", "dir": MODELS_DIR},
        "context_len": 4096,
    },
    "qwen_14b_new_search_rewrite_0110": {
        "dir": f"{SFT_DIR}/Qwen_14B_new_search_rewrite_0110",
        "tokenizer": {"name": "qwen_14b-1221", "dir": RELEASES_DIR},
        "context_len": 2048,
    },
    "qwen_14b_1221_new_search_rewrite_0110": {
        "dir": f"{SFT_DIR}/Qwen_14B_1221_new_search_rewrite_0110",
        "tokenizer": {"name": "qwen_14b-1221", "dir": RELEASES_DIR},
        "context_len": 2048,
    },

}

embedding_models_config = {
    "bge-base-zh-v1.5": {
        "dir": f"BAAI/bge-base-zh-v1.5",
        "tokenizer": {"name": "BAAI/bge-base-zh-v1.5", "dir": ""},
        "context_len": 512,
    }
}