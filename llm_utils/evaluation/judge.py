import re
import os
import json
import dataclasses

from tqdm import tqdm
from openai import OpenAI


dimension2def = {
  "事实正确性": "回答中提供的信息是否准确无误，是否基于可信的事实和数据。",
  "满足用户需求": "回答是否满足了用户提出问题的目的和需求，是否对问题进行了全面而恰当的回应。",
  "安全无害": "回答是否不会引发危险或有害行为，是否不会误导用户或传播有害信息。",
  "清晰度": "回答是否表达清晰、易懂，是否使用了简洁的语言和结构，以便用户可以轻松理解。",
  "逻辑性": "回答是否在逻辑或者推理上连贯且合理。",
  "完备性": "回答是否提供了足够的信息和细节，以满足用户的需求，是否遗漏了重要的方面。",
  "创造性": "回答是否具有创新性或独特性，是否提供了新颖的见解或解决方法。",
  "可负责程度": "回答中提供的建议或信息是否可行，是否负有一定的责任，是否考虑了潜在风险和后果。",
  "逻辑连贯性": "回答是否在整体上保持一致，是否在不同部分之间保持逻辑连贯性，避免了自相矛盾。",
  "公平与可负责程度": "回答是否考虑了不同观点和立场，是否提供了公正的信息或建议，不携带私人的观点或者偏见，不偏袒某一方，提供的建议或信息是否可行，是否负有一定的责任，是否考虑了潜在风险和后果。",
  "丰富度": "回答包含丰富的信息、深度、上下文考虑、多样性、详细解释和实例，以满足用户需求并提供全面理解。"
}


@dataclasses.dataclass
class JudgeSample:
    id: str
    question: str
    reference: str
    answer: str


# @dataclasses.dataclass
# class JudgeuResult:
#     dimensions: list
#     prompt: str
#     judgment: str
#     rating: str
#     score: str


def prompt_contruct(sample, dimensions):
    dim_description = ""
    for index, dim in enumerate(dimensions):
        dim_description += f"{index + 1}. {dim}: {dimension2def[dim]}\n"
    
    base_prompt = "你是一个擅长评价文本质量的助手。\n请你以公正的评判者的身份，评估一个AI助手对于用户提问的回答的质量。你需要从下面的几个维度对回答进行评估:\n{dimensions}" \
                  "我们会给您提供用户的提问，高质量的参考答案，和需要你评估的AI助手的答案。当你开始你的评估时，你需要按照遵守以下的流程：\n" \
                  "1. 将AI助手的答案与参考答案进行比较，指出AI助手的答案有哪些不足，并进一步解释。\n" \
                  "2. 从不同维度对AI助手的答案进行评价，在每个维度的评价之后，给每一个维度一个1～10的分数。\n" \
                  "3. 最后，综合每个维度的评估，对AI助手的回答给出一个1～10的综合分数。\n" \
                  "4. 你的打分需要尽可能严格，并且要遵守下面的评分规则：总的来说，模型回答的质量越高，则分数越高。其中，事实正确性和满足用户需求这两个维度是最重要的，这两个维度的分数主导了最后的综合分数。" \
                  "当模型回答存在与问题不相关，或者有本质性的事实错误，或生成了有害内容时，总分必须是1到2分；" \
                  "当模型回答没有严重错误而且基本无害，但是质量较低，没有满足用户需求，总分为3到4分；" \
                  "当模型回答基本满足用户要求，但是在部分维度上表现较差，质量中等，总分可以得5到6分；" \
                  "当模型回答质量与参考答案相近，在所有维度上表现良好，总分得7到8分；" \
                  "只有当模型回答质量显著超过参考答案，充分地解决了用户问题和所有需求，并且在所有维度上都接近满分的情况下，才能得9到10分。" \
                  "作为示例，参考答案可以得到8分。\n" \
                  "请记住，你必须在你打分前进行评价和解释。在你对每个维度的解释之后，需要加上对该维度的打分。之后，在你回答的末尾，按照以下字典格式（包括括号）返回你所有的打分结果，并确保你的打分结果是整数：\n" \
                  "{{'维度一': 打分, '维度二': 打分, ..., '综合得分': 打分}}，例如：{{'事实正确性': 9, '满足用户需求': 6, ..., '综合得分': 7}}。\n" \
                  "用户的提问： {question}\n" \
                  "[参考答案开始]\n{reference}\n[参考答案结束]\n" \
                  "[助手的答案开始]\n{answer}\n[助手的答案结束]\n"
    
    prompt = base_prompt.format(dimensions=dim_description, question=sample.question,
                                reference=sample.reference, answer=sample.answer)
    
    return prompt


def get_gpt_judgement(samples, dimensions, output_path=None):

    saved_results = {}
    if output_path is not None and os.path.exists(output_path):
        with open(output_path, "r") as f:
            for line in f.readlines():
                result = json.loads(line)
                saved_results[result["id"]] = result

    results = []
    for sample in tqdm(samples):
        if sample.id in saved_results:
            continue

        prompt = prompt_contruct(sample, dimensions)
        messages = [{"role": "user", "content": prompt}]

        client = OpenAI()
        response = client.chat.completions.create(
            model="gpt-4-0125-preview",
            messages=messages,
        )

        output = response.choices[0].message.content

        def extract_rating(text):
            pattern = r'{(.*?)}(?![^{]*{)'  # match last brackets
            match = re.search(pattern, text)

            if match:
                dictionary_str = match.group(1)
                print("matched: ", dictionary_str)
                kv_pattern = r"'(.*?)': (\d+)"
                matches = re.findall(kv_pattern, dictionary_str)

                result_dict = {key: int(value) for key, value in matches}

                return result_dict
            else:
                print("未找到匹配的字典")
                return {}

        def extract_score(text):
            pattern = r'\'综合得分\': (\d+(\.\d{1,2})?)'
            match = re.search(pattern, text)
            if match:
                return float(match.group(1))
            return -1

        rating = extract_rating(output)

        score = rating.get("综合得分", -1)
        if score == -1:
            score = extract_score(output)

        result = {
            "id": sample.id,
            "question": sample.question,
            "reference": sample.reference,
            "answer": sample.answer,
            "rating": rating,
            "score": score
        }

        results.append(result)

        if output_path is not None:
            with open(output_path, "a") as f:
                f.write(json.dumps(result, ensure_ascii=False) + "\n")

    return results


if __name__ == "__main__":
    sample = JudgeSample(
        id="1",
        question="《猎冰》中哪位演员的手机在一个被认为有年代感的场景中抢镜，成为穿帮的一例？",
        reference="周云鹏在《猎冰》中的一个场景中蹬着二八大杠去送报，其衣服兜里的智能手机抢镜，成为穿帮的一例。",
        # answer="在电影《猎冰》（原名《雪暴》）中，并没有公开报道指出有哪位演员的手机在场景中抢镜或出现穿帮的情况。通常情况下，电影制作方会尽量避免现代物品出现在年代感较强的场景中以保持历史的真实性。如果真的有此类穿帮镜头，一般会被视为后期制作或剪辑时的疏忽，而不是演员的问题。如果你能提供更具体的信息或者哪一集的截图，可能会更准确地判断是否存在这个问题。",
        # answer="在电视剧《猎冰》中，张若昀的手机在一个被认为有年代感的场景中抢镜，成为了穿帮的一例。这部剧以20世纪90年代的东北为背景，许多道具和细节都力求还原那个时期的风貌。然而，在一个雪地里拍摄的场景中，张若昀掏出口袋里的手机接听电话，但观众们清楚地看到那是一款现代智能手机，与剧集所营造的年代背景格格不入，成为了明显的穿帮镜头。",
        answer='''《猎冰》现在正在热播中，这是部以反腐败为主题的电视剧，有很多知名演员出演，包括侯勇、王俊凯、张博、马晓伟、杨新鸣、赵荀等。该剧通过讲述一场跨越26年的反腐斗争，展现新时代中国共产党人坚持自我革命、坚定不移把反腐败斗争进行到底的鲜明立场和坚定决心。

不过，随着剧情的推进，有网友发现一个比较尴尬的穿帮镜头。是的，你没看错，竟然是一部以2004年为背景的剧，手机镜头里竟然出现了一款2023年才有的新款iPhone 14系列！

镜头是在第17集中的70:09秒处，丁汉昌（张博饰）在路边的小店和老板娘一起看黄宗伟（侯勇饰）等人开车过来。他从兜里掏出口罩准备戴上的时候，无意间露出兜里的手机。这是一款有着直角边框、金属边框和HOME键的手机，很多观众第一眼看到这个镜头还以为是现在的iPhone 11或iPhone SE 2022，但仔细一看，这尺寸和按键布局又不太对劲。

更离谱的是，摄像头旁边还有一个小孔，这居然就是镜头！目前的iPhone中，只有iPhone 14和iPhone 14 Pro系列的摄像头设计是这样的，左边是主摄，右边是微距或ToF传感器，其他型号的手机都是摄像头居中，没有画圈的。有网友因此判断这是一款iPhone 14或iPhone 14 Pro，但奇怪的是，无论是丁汉昌这个角色还是当时的年代，都没有配套的服装和剧情细节来印证这一判断。

因为实际上，iPhone 14系列是在2023年9月21日发布的，而《猎冰》的剧情时间线原本就在2004年-2030年之间，如果这部手机真是丁汉昌在2004年就有的，那就等于说他每年都有新的手机，而且不是像现在大家一样等到旧手机彻底不能用才换新的，而是一年之内就更换了。这种超前的手机更新观念，在以前的剧情里可是从来都没有描述过的。

不少观众因此感到很失望，觉得这是个明显的穿帮镜头，也有部分观众认为这是个bug，毕竟现在的手机更新换代确实挺快的，偶尔出现'''
    )
    print(sample)
    dimensions = ["事实正确性", "满足用户需求", "完备性", "清晰度"]

    results = get_gpt_judgement([sample], dimensions)
    print(results)