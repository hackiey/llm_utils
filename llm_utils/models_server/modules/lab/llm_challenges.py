import json
import re
import sympy
from pydantic import BaseModel

from openai import OpenAI


def generate_response(input):
    client = OpenAI()
    resp = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": input}],
        temperature=0.7,
        max_tokens=2000,
        top_p=1,
        frequency_penalty=0.0,
        presence_penalty=0.0
    )
    print(resp)
    return resp['choices'][0]['message']['content']


class LLMChallengesProblemRequest(BaseModel):
    challenge_index: int
    problem_index: int


class LLMChallengesValidateRequest(BaseModel):
    challenge_index: int
    problem_index: int
    reply: str
    input: str


# 辅助函数 - 检查是否为质数
def is_prime(num):
    return sympy.isprime(num)


# 辅助函数 - 获取下一个质数
def next_prime(num):
    return sympy.nextprime(num)


# 辅助函数 - 检查是否为平方数
def is_square(n):
    return sympy.sqrt(n).is_integer


# 辅助函数 - 获取平方根
def get_square_root(n):
    return int(sympy.sqrt(n))


def validate_palindrome_invariance(origin_input, response):
    """
    验证器函数，检查对于给定的问题，正着问和倒着问的模型回答是否一致。

    :param origin_input: 原始问题
    :return: True 如果回答一致，否则 False
    """

    # 将原始问题倒序并提交
    reversed_question = origin_input[::-1]
    reversed_response = generate_response(reversed_question)

    print(reversed_question, reversed_response)
    # 比较两个回答是否一致
    return {"success": response.strip() == reversed_response.strip(), "second_input": reversed_question, "second_reply": reversed_response}


def validate_palindrome_inverse(origin_input, response):
    """
    验证器函数，检查对于给定的问题，正着问和倒着问的模型的回答本身不回文且也是逆序的关系。

    :param origin_input: 原始问题
    :param response: 模型对原始问题的回答
    :param model_fn: 能够返回模型回答的函数
    :return: True 如果回答本身不回文且也是逆序关系，否则 False
    """

    # 检查原始输入不是回文
    if origin_input == origin_input[::-1]:
        return False

    # 将原始问题倒序并获取模型回答
    reversed_question = origin_input[::-1]
    reversed_response = generate_response(reversed_question).strip()

    # 检查原始回答不是回文
    if response == response[::-1]:
        return False

    # 比较正着问和倒着问的回答是否是逆序关系
    return {"success": response == reversed_response[::-1], "second_input": reversed_question, "second_reply": reversed_response}


def validate_reciprocal_question(input, response):
    """
    验证器函数，检查给定的问题A和回答B，是否能够通过以B作为新的提问得到原始问题A作为回答。

    :param response: 模型对问题A的回答B
    :param input: 原始问题A
    :param model_fn: 模型调用函数，接收问题并返回回答
    :return: True 如果以回答B作为新的提问能得到问题A作为回答，否则 False
    """

    # 确保回答B不等于原始问题A
    if response == input:
        return False

    # 以回答B作为新的提问
    new_response = generate_response(response)

    # 检查新的回答是否与原始问题A相等
    return {"success": new_response.strip() == input.strip(), "second_input": response, "second_reply": new_response}


challenges = [
    {
        'name':
        '第一章 对话之趣',
        'problems': [
            {
                'title': '第1题 初来乍到',
                'description': '请你构造一个问题使模型的回答是一字不差的“1+1=3”（不需要引号）。',
                'validator':
                lambda response, input: response.strip() == '1+1=3'
            },
            {
                'title':
                '第2题 小试牛刀',
                'description':
                '请输入三个字以内的问题，使模型的回答在30个字以上。',
                'validator':
                lambda response, input: len(input) <= 3 and len(response) > 30
            },
            {
                'title':
                '第3题 短说长话',
                'description':
                '请输入一个字的问题，使模型的回答在100个字以上。',
                'validator':
                lambda response, input: len(input) == 1 and len(response) > 100
            },
            {
                'title':
                '第4题 短说短话',
                'description':
                '请输入一个字的问题，使模型的回答在20个字以内。',
                'validator':
                lambda response, input: len(input) == 1 and len(response) <= 20
            },
            {
                'title':
                '第5题 回文不变',
                'description':
                '请输入一个本身不是回文串的问题，使无论正着问还是倒着问，模型的回答是一样的。',
                # 验证器将取决于模型的行为，这里只是一个占位符
                'validator':
                lambda response, input: validate_palindrome_invariance(
                    input, response)
            },
            {
                'title':
                '第6题 无中生狗',
                'description':
                '请提一个不包含“狗”这个字的问题，但是回答中至少出现3次“狗”这个字。',
                'validator':
                lambda response, input: '狗' not in input and response.count(
                    '狗') >= 3
            },
        ]
    },
    {
        'name':
        '第二章 数字游戏',
        'problems': [
            {
                'title':
                '第1题 质数长度',
                'description':
                '你需要提出一个字数是质数的问题，使回答的长度刚好是它的下一个质数。',
                'validator':
                lambda response, input: is_prime(len(input)) and len(response)
                == next_prime(len(input))
            },
            {
                'title':
                '第2题 越说越大',
                'description':
                '请输入一个大于一的正整数作为问题，使回答里包含至少比它大一千的数。',
                'validator':
                lambda response, input:
                (input.isdigit() and int(input) > 1 and any(
                    int(num) > int(input) + 1000
                    for num in re.findall(r'\d+', response)))
            },
            {
                'title':
                '第3题 越说越小',
                'description':
                '请输入一个大于一的正整数作为问题，使回答里包含至少10个不同的至少比它小一千的自然数。',
                'validator':
                lambda response, input:
                (input.isdigit() and int(input) > 1 and (len({
                    int(num)
                    for num in re.findall(r'\d+', response)
                    if int(num) < int(input) - 1000
                }) >= 10))
            },
            {
                'title':
                '第4题 警世名言',
                'description':
                '请在不提及1,4,5这三个字符的情况下让模型回答114514，不要有多余的字符。',
                'validator':
                lambda response, input: response.strip() == '114514' and all(
                    c not in input for c in ['1', '4', '5'])
            },
            {
                'title':
                '第5题 开平方数',
                'description':
                '请输入一个大于一的平方数作为问题，使回答里包含它的平方根对应的数。',
                'validator':
                lambda response, input:
                (input.isdigit() and int(input) > 1 and is_square(int(input))
                 and str(get_square_root(int(input))) in response)
            },
            {
                'title':
                '第6题 得寸进狗',
                'description':
                '请提一个不包含“狗”这个字的10个字以内的问题，使回答中“狗”这个字出现的次数至少是问题字数的2倍。',
                'validator':
                lambda response, input: '狗' not in input and len(input) <= 10
                and response.count('狗') >= 2 * len(input)
            },
        ]
    },
    {
        'name':
        '第三章 巅峰挑战',
        'problems': [
            {
                'title':
                '第1题 自说自话',
                'description':
                '请做出一个至少10个字的提问，使回答和提问完全一样。',
                'validator':
                lambda response, input: input == response and len(input) >= 10
            },
            {
                'title':
                '第2题 话自说自',
                'description':
                '请做出一个至少10个字的提问，使回答是提问的逆序。',
                'validator':
                lambda response, input: input[::-1] == response and len(input)
                >= 10
            },
            {
                'title':
                '第3题 就是敢说',
                'description':
                '请在不提及1,3这三个字符的情况下让模型回答1+1=3，不要有多余的字符。',
                'validator':
                lambda response, input: response.strip() == '1+1=3' and all(
                    c not in input for c in ['1', '3'])
            },
            {
                'title':
                '第4题 回文协变',
                'description':
                '请输入一个本身不是回文串的问题，使正着问和倒着问的时候，模型的回答本身不回文且也是逆序的关系。',
                'validator':
                lambda response, input: validate_palindrome_inverse(
                    input, response)
            },
        ]
    },
    {
        'name':
        '第四章 无人之境',
        'problems': [
            {
                'title':
                '第1题 循环往复',
                'description':
                '请构造一个问题A，它的回复是不同于A的B，然后以B提问能再次得到A.',
                'validator':
                lambda response, input: validate_reciprocal_question(
                    input, response)
            },
            {
                'title':
                '第2题 惜字如金',
                'description':
                '请输入一个字的问题，使模型的回答在16个字以内。',
                'validator':
                lambda response, input: len(input) == 1 and len(response) <= 16
            },
            {
                'title':
                '第3题 自然之密',
                'description':
                '请输入一个大于一的正整数作为问题，使回答里包含和它刚好相差1的数。',
                'validator':
                lambda response, input:
                (input.isdigit() and int(input) > 1 and any(
                    abs(int(num) - int(input)) == 1
                    for num in re.findall(r'\d+', response)))
            },
        ]
    }
]


def get_problem(challenge_idx, problem_idx):
    challenge = challenges[challenge_idx]
    problem = challenge['problems'][problem_idx]
    return {
        "challenge_index": challenge_idx,
        "problem_index": problem_idx,
        "title": f"### {challenge['name']} \n **{problem['title']}**",
        "description": problem['description']
    }


def get_next_problem(challenge_index, problem_index):
    if problem_index < len(challenges[challenge_index]['problems']) - 1:
        problem_index += 1
    else:
        if challenge_index < len(challenges) - 1:
            challenge_index += 1
            problem_index = 0

    return get_problem(challenge_index, problem_index)


def update_challenge_info(current_chapter_index, current_challenge_index):
    return get_problem(current_chapter_index,
                       current_challenge_index)['description']


def update_question_info(current_chapter_index, current_challenge_index):
    global challenges
    current_chapter = challenges[current_chapter_index]
    challenge = get_problem(current_chapter_index, current_challenge_index)
    question_info = f"""\n<center><font size=4>{current_chapter["name"]}""" \
                    f"""</center>\n\n <center><font size=3>{challenge["title"]}</center>"""
    return question_info


def validate_challenge(input, reply, challenge_index, problem_index):
    # 获取当前章节
    current_chapter = challenges[challenge_index]
    # 获取当前挑战
    challenge = current_chapter['problems'][problem_index]

    result = challenge['validator'](reply, input)

    success = False
    second_input = ""
    second_reply = ""
    if type(result) == dict:
        success = result['success']
        second_input = result['second_input']
        second_reply = result['second_reply']
    else:
        success = result

    if success:
        if problem_index < len(current_chapter['problems']) - 1:
            challenge_result = 200
        else:
            if challenge_index < len(challenges) - 1:
                challenge_result = 200
            else:
                challenge_result = 201
    else:
        challenge_result = 400

    print(challenge_result)
    return {"status": challenge_result, "second_input": second_input, "second_reply": second_reply}


class LLMChallenges:
    @staticmethod
    def get_problem(request):
        return get_problem(request.challenge_index, request.problem_index)

    @staticmethod
    def validate(request):
        print({
            "challenge_index": request.challenge_index,
            "problem_index": request.problem_index,
            "input": request.input,
            "reply": request.reply
        })

        return validate_challenge(request.input, request.reply, request.challenge_index, request.problem_index)

    @staticmethod
    def get_next_problem(request):
        return get_next_problem(request.challenge_index, request.problem_index)


llm_challenges = LLMChallenges()
