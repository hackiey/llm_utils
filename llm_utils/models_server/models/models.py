import os
import torch
from transformers import AutoModelForCausalLM, AutoModel, AutoTokenizer
from llm_utils.utils.tokenizer import get_tokenizer
from llm_utils.models_server.modules.chat.core import ModelServer
from llm_utils.models_server.models.config import generate_models_config, embedding_models_config

GENERATE_MODELS = os.environ.get("GENERATE_MODELS", "").split(",")
EMBEDDING_MODELS = os.environ.get("EMBEDDING_MODELS", "").split(",")

generate_models = {}
embedding_models = {}

for model in GENERATE_MODELS:
    if model == "":
        continue
    model_name, device = model.split(":")
    if model_name in generate_models_config:
        model_config = generate_models_config[model_name]
        generate_models[model_name] = ModelServer(
            AutoModelForCausalLM.from_pretrained(model_config["dir"],
                                                 trust_remote_code=True, torch_dtype=torch.float16,
                                                 device_map=f"cuda:{device}"),
            tokenizer=get_tokenizer(model_config["tokenizer"]['name'], model_config['tokenizer']['dir']),
            device=f"cuda:{device}",
            model_name=model_name,
            context_len=generate_models_config[model_name]["context_len"]
        )

for model in EMBEDDING_MODELS:
    if model == "":
        continue
    model_name, device = model.split(":")
    if model_name in embedding_models_config:
        model_config = embedding_models_config[model_name]
        embedding_models[model_name] = ModelServer(
            AutoModel.from_pretrained(model_config["dir"],
                                      trust_remote_code=True, torch_dtype=torch.float16,
                                      device_map=f"cuda:{device}"),
            tokenizer=get_tokenizer(model_config["tokenizer"]['name'], model_config['tokenizer']['dir']),
            device=f"cuda:{device}",
            model_name=model_name,
            context_len=embedding_models_config[model_name]["context_len"]
        )
