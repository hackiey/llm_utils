import numpy as np
from fastapi import APIRouter

# from api.config import config
from llm_utils.utils.utils import to_device
from llm_utils.models_server.models.models import embedding_models
from llm_utils.models_server.modules.embeddings.protocol import (
    UsageInfo,
    EmbeddingsResponse,
    EmbeddingsRequest,
)


embedding_router = APIRouter()


@embedding_router.post("/embeddings")
@embedding_router.post("/engines/{model_name}/embeddings")
async def create_embeddings(request: EmbeddingsRequest, model_name: str = None):
    if request.model is None:
        request.model = model_name

    model_config = embedding_models.get(request.model)
    model = model_config["model"]
    tokenizer = model_config["tokenizer"]
    embedding_size = model_config["embedding_size"]
    context_len = model_config["context_len"]

    inputs = request.input
    if isinstance(inputs, str):
        inputs = [inputs]

    # https://huggingface.co/BAAI/bge-large-zh
    # if EMBEDDED_MODEL is not None:
    #     if "bge" in config.EMBEDDING_NAME.lower():
    #         instruction = ""
    #         if "zh" in config.EMBEDDING_NAME.lower():
    #             instruction = "为这个句子生成表示以用于检索相关文章："
    #         elif "en" in config.EMBEDDING_NAME.lower():
    #             instruction = "Represent this sentence for searching relevant passages: "
    #         inputs = [instruction + q for q in inputs]

    data, token_num = [], 0
    batches = [
        inputs[i: min(i + 1024, len(inputs))]
        for i in range(0, len(inputs), 1024)
    ]
    for num_batch, batch in enumerate(batches):
        token_num = sum([len(i) for i in batch])

        encoded_input = tokenizer(batch, padding=True, truncation=True, return_tensors='pt', max_length=context_len)
        encoded_input = to_device(encoded_input, device=model.device)
        vecs = model(**encoded_input)[0][:, 0]

        bs, dim = vecs.shape

        if embedding_size is not None and embedding_size > dim:
            zeros = np.zeros((bs, embedding_size - dim))
            vecs = np.c_[vecs, zeros]

        vecs = vecs.tolist()
        data += [
            {
                "object": "embedding",
                "embedding": emb,
                "index": num_batch * 1024 + i,
            }
            for i, emb in enumerate(vecs)
        ]
        token_num += token_num

    return EmbeddingsResponse(
        data=data,
        model=request.model,
        usage=UsageInfo(
            prompt_tokens=token_num,
            total_tokens=token_num,
            completion_tokens=None,
        ),
    ).model_dump(exclude_none=True)
