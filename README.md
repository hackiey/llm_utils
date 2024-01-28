# Introduction

This project provides a suite of auxiliary tools related to LLMs, including data collection, annotation, evaluation, model deployment, and basic fine-tuning capabilities.

# Installation

```shell
pip install -e .
```

# Models Server

This section of the code primarily originates from [api-for-open-llm](https://github.com/xusenlinzy/api-for-open-llm), with the goal of unifying the calling conventions of my own deployed LLM with those of OpenAI. The following changes have been made on this basis:
1. Added interface forwarding for openai/qwen.
2. Added the ability to customize embedding models.
3. Tools service.
4. Saving data when the first user message has `id` field.

## Usage
```shell
export OPENAI_API_KEY=sk-xxx
export DASHSCOPE_API_KEY=sk-xxx

python models_server.py # default models are gpt and qwen

GENERATED_MODELS=model1:0,model2:1 EMBEDDING_MODELS=model1:0,model2:1 python models_server.py # set model1 to device(cuda:0) and model2 to device(cuda:1)
```
