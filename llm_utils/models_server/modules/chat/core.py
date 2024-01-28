import gc
import torch
from typing import Iterable, Optional
from llm_utils.models_server.utils import prepare_logits_processor, is_partial_stop
from llm_utils.models_server.utils import ErrorCode
from llm_utils.utils.tokenizer import tokenize_messages
from llm_utils.utils.utils import to_device

server_error_msg = (
    "**NETWORK ERROR DUE TO HIGH TRAFFIC. PLEASE REGENERATE OR REFRESH THIS PAGE.**"
)


@torch.inference_mode()
def generate_stream(model, tokenizer, messages, params, device: str, context_len: int=2048, stream_interval: int=2):

    temperature = float(params.get("temperature", 1.0))
    repetition_penalty = float(params.get("repetition_penalty", 1.0))
    top_p = float(params.get("top_p", 1.0))
    top_k = int(params.get("top_k", -1))  # -1 means disable
    max_new_tokens = int(params.get("max_new_tokens", 256))
    echo = bool(params.get("echo", True))
    stop_str = params.get("stop", None)

    stop_token_ids = params.get("stop_token_ids", None) or []
    if tokenizer.eos_token_id not in stop_token_ids:
        stop_token_ids.append(tokenizer.eos_token_id)

    model_name = params.get("model", None)

    if model_name.endswith("pretrain"):
        # for pretrain
        print('\n'.join(message['content'] for message in messages))

        input_ids = tokenizer.encode('\n'.join(message['content'] for message in messages), add_special_tokens=True,
                                  return_tensors='pt', max_length=context_len, truncation=True)
        input_ids = input_ids.to(device)
    elif model_name == ("baichuan2_13b_chat") or model_name == ("baichuan2_7b_chat"):
        input_ids = model._build_chat_input(tokenizer, messages)
        input_ids = input_ids.to(device)
    else:
        # for sft
        inputs = tokenize_messages(tokenizer, messages, type="inference", max_seq_length=context_len)
        inputs = to_device(inputs, device)
        input_ids = inputs["input_ids"]

    # print(input_ids)

    logits_processor = prepare_logits_processor(temperature, repetition_penalty, top_p, top_k)

    output_ids = list(input_ids[0].tolist())
    input_echo_len = len(input_ids[0])

    past_key_values = None
    sent_interrupt = False
    first_tokens = None

    for i in range(max_new_tokens):
        if i == 0:
            out = model(input_ids, use_cache=True)
            logits = out.logits
            past_key_values = out.past_key_values
        else:
            out = model(
                input_ids=torch.as_tensor(
                    [[token] if not sent_interrupt else output_ids], device=device
                ),
                use_cache=True,
                past_key_values=past_key_values if not sent_interrupt else None,
            )
            sent_interrupt = False
            logits = out.logits
            past_key_values = out.past_key_values

        if logits_processor:
            if repetition_penalty > 1.0:
                tmp_output_ids = torch.as_tensor([output_ids], device=logits.device)
            else:
                tmp_output_ids = None
            last_token_logits = logits_processor(tmp_output_ids, logits[:, -1, :])[0]
        else:
            last_token_logits = logits[0, -1, :]

        if temperature < 1e-5 or top_p < 1e-8:  # greedy
            if i == 0:
                first_token_probs = torch.softmax(last_token_logits, dim=-1)
                first_token_probs, first_token_indices = torch.topk(first_token_probs, k=10, largest=True, sorted=True)
                topk_tokens = [tokenizer.decode(int(i)) for i in first_token_indices]

                first_tokens = {}
                for t, p in zip(topk_tokens, first_token_probs.tolist()):
                    if t in first_tokens and p < first_tokens[t]:
                        continue
                    first_tokens[t] = p

            _, indices = torch.topk(last_token_logits, 2)
            tokens = [int(index) for index in indices.tolist()]
        else:
            probs = torch.softmax(last_token_logits, dim=-1)
            indices = torch.multinomial(probs, num_samples=2)
            tokens = [int(token) for token in indices.tolist()]

        token = tokens[0]
        output_ids.append(token)

        if token in stop_token_ids:
            stopped = True
        else:
            stopped = False

        # Yield the output tokens
        if i % stream_interval == 0 or i == max_new_tokens - 1 or stopped:
            if echo:
                tmp_output_ids = output_ids
                rfind_start = len(messages) if isinstance(messages, str) else 0
            else:
                tmp_output_ids = output_ids[input_echo_len:]
                rfind_start = 0

            output = tokenizer.decode(
                tmp_output_ids,
                skip_special_tokens=True,
                spaces_between_special_tokens=False,
                clean_up_tokenization_spaces=True,
            )

            partially_stopped = False
            if stop_str:
                if isinstance(stop_str, str):
                    pos = output.rfind(stop_str, rfind_start)
                    if pos != -1:
                        output = output[:pos]
                        stopped = True
                    else:
                        partially_stopped = is_partial_stop(output, stop_str)
                elif isinstance(stop_str, Iterable):
                    for each_stop in stop_str:
                        pos = output.rfind(each_stop, rfind_start)
                        if pos != -1:
                            output = output[:pos]
                            stopped = True
                            break
                        else:
                            partially_stopped = is_partial_stop(output, each_stop)
                            if partially_stopped:
                                break
                else:
                    raise ValueError("Invalid stop field type.")

            # Prevent yielding partial stop sequence
            if not partially_stopped:
                yield {
                    "text": output,
                    "usage": {
                        "prompt_tokens": input_echo_len,
                        "completion_tokens": i,
                        "total_tokens": input_echo_len + i,
                        "first_tokens": first_tokens
                    },
                    "finish_reason": None,
                }

        if stopped:
            break

    # Finish stream event, which contains finish reason
    if i == max_new_tokens - 1:
        finish_reason = "length"
    elif stopped:
        finish_reason = "stop"
    else:
        finish_reason = None

    yield {
        "text": output,
        "usage": {
            "prompt_tokens": input_echo_len,
            "completion_tokens": i,
            "total_tokens": input_echo_len + i,
            "first_tokens": first_tokens
        },
        "finish_reason": finish_reason,
    }

    # Clean
    del past_key_values, out
    gc.collect()
    torch.cuda.empty_cache()


class ModelServer:
    def __init__(
        self,
        model,
        tokenizer,
        device,
        model_name,
        context_len: int,
        stream_interval: Optional[int] = 2,
    ):
        self.device = device
        self.model = model
        self.tokenizer = tokenizer
        self.model_name = model_name.lower()
        self.stream_interval = stream_interval
        self.context_len = context_len

        self.construct_prompt = True
        self.generate_stream_func = generate_stream

    def count_token(self, params):
        prompt = params["prompt"]
        input_ids = self.tokenizer(prompt).input_ids
        input_echo_len = len(input_ids)

        ret = {
            "count": input_echo_len,
            "error_code": 0,
        }
        return ret

    def format_messages(self, messages):
        messages = [{"role": message.role, "content": message.content} for message in messages]
        return messages

    def generate_stream_gate(self, params):
        messages = self.format_messages(params['messages'])

        try:
            for output in self.generate_stream_func(
                self.model,
                self.tokenizer,
                messages,
                params,
                self.device,
                self.context_len,
                self.stream_interval,
            ):
                ret = {
                    "text": output["text"],
                    "error_code": 0,
                }
                if "usage" in output:
                    ret["usage"] = output["usage"]
                if "finish_reason" in output:
                    ret["finish_reason"] = output["finish_reason"]
                if "logprobs" in output:
                    ret["logprobs"] = output["logprobs"]
                yield ret

        except torch.cuda.OutOfMemoryError as e:
            ret = {
                "text": f"{server_error_msg}\n\n({e})",
                "error_code": ErrorCode.CUDA_OUT_OF_MEMORY,
            }
            yield ret

        except (ValueError, RuntimeError) as e:
            ret = {
                "text": f"{server_error_msg}\n\n({e})",
                "error_code": ErrorCode.INTERNAL_ERROR,
            }
            yield ret

    def generate_gate(self, params):
        messages = self.format_messages(params['messages'])
        try:
            ret = {"text": "", "error_code": 0}
            for output in self.generate_stream_func(
                self.model,
                self.tokenizer,
                messages,
                params,
                self.device,
                self.context_len,
                self.stream_interval,
            ):
                ret["text"] = output["text"]

            if "usage" in output:
                ret["usage"] = output["usage"]
            if "finish_reason" in output:
                ret["finish_reason"] = output["finish_reason"]
            if "logprobs" in output:
                ret["logprobs"] = output["logprobs"]

        except torch.cuda.OutOfMemoryError as e:
            ret = {
                "text": f"{server_error_msg}\n\n({e})",
                "error_code": ErrorCode.CUDA_OUT_OF_MEMORY,
            }

        except (ValueError, RuntimeError) as e:
            ret = {
                "text": f"{server_error_msg}\n\n({e})",
                "error_code": ErrorCode.INTERNAL_ERROR,
            }
        return ret
