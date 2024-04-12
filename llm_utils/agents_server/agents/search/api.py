import time
from collections import OrderedDict
from llm_utils.data.agents import get_agents_samples_collection, update_agent_sample
from llm_utils.agents_server.agents.search.tools import duckduckgo, open_url

agents_samples_collection, agents_samples_histories_collection = get_agents_samples_collection()


def run_action(sample, action):

    environment = sample['environment']
    open_pages = environment['open_pages']
    last_observation = sample['observations'][-1] if len(sample['observations']) > 0 else None

    search_results = {}
    page = last_observation['page'] if last_observation is not None else {}
    quotes = last_observation['quotes'] if last_observation is not None else []
    action_message = ""

    if action['action'] == "search":
        query = action['query']

        run_search = True
        if query in open_pages and len(open_pages[query]['results']) > 0:
            run_search = False

        print("run_search", run_search)

        if run_search:
            if sample['config']['search_engine'] == "duckduckgo":
                results = duckduckgo(query)

                open_pages[query] = {
                    "query": query,
                    "results": results
                }
            else:
                raise Exception("unknown search engine")

        search_results = open_pages[query]
        page = {}

    elif action['action'] == "open_url":
        if action['url'] not in open_pages:
            open_page = open_url(action['url'], action['title'],
                                 sample['config']['line_length'], sample['config']['chunk_max_lines'])
            open_pages[action['url']] = open_page

        chunk_contents = open_pages[action['url']]['chunk_contents']

        page = {
                "query": action['query'],
                "find_in_page_query": "",
                "title": action['title'],
                "url": action['url'],
                "chunk_content": chunk_contents[action['scroll']],
                "scroll": action['scroll'],
                "max_scrolls": open_pages[action['url']]['max_scrolls'],
            }
        search_results = {}

    elif action['action'] == "find_in_page":
        if action['url'] not in open_pages:
            raise Exception("page not open")

        page = open_pages[action['url']]
        scroll = last_observation['page']['scroll']

        found = False
        for i, chunk_content in enumerate(page['chunk_contents']):
            if action['find_in_page_query'] in chunk_content:
                scroll = i
                found = True
                break

        page = {
            "query": action['query'],
            "find_in_page_query": action['find_in_page_query'],
            "title": page['title'],
            "url": page['url'],
            "chunk_content": page['chunk_contents'][scroll],
            "scroll": scroll,
            "max_scrolls": page['max_scrolls'],
        }
        search_results = {}
        action_message = f"搜索到\"{action['find_in_page_query']}\"并跳转到相应位置" if found else f"没有搜索到\"{action['find_in_page_query']}\""

    elif action['action'] == "scroll_up" or action['action'] == "scroll_down":
        page = open_pages[action['url']]

        scroll = action['scroll']
        distance = action['distance']
        distance = distance

        if action['action'] == "scroll_up":
            scroll -= distance
        else:
            scroll += distance

        if scroll < 0:
            scroll = 0
        elif scroll >= page['max_scrolls']:
            scroll = page['max_scrolls']

        page = {
            "query": action['query'],
            "find_in_page_query": "",
            "title": page['title'],
            "url": page['url'],
            "chunk_content": page['chunk_contents'][scroll],
            "scroll": scroll,
            "max_scrolls": page['max_scrolls'],
        }
        search_results = {}

    elif action['action'] == "back":
        search_results = {
            "query": action['query'],
            "results": open_pages[action['query']]['results'],
        }
        page = {}

    elif action['action'] == "quote":

        for quote in quotes:
            if quote['url'] == action['url']:
                quote['quotes'].append(action['quote'])
                break
        else:
            quotes.append({
                "url": action['url'],
                "title": action['title'],
                "quotes": [action['quote']],
            })

    else:
        raise Exception("unknown action")

    quote_characters = 0
    for quote in quotes:
        quote_characters += sum([len(q) for q in quote['quotes']])

    observation = {
        "position": "search" if action['action'] in ["search", "back"] else "page",
        "search_results": search_results,
        "page": page,
        "quotes": quotes,
        "actions_left": sample['config']['max_actions'] - len(sample['actions']) - 1,
        "quotes_left": sample['config']['max_quote_content'] - quote_characters,
        "action_message": action_message,
        "open_pages": list(open_pages.keys()),
    }

    update_agent_sample(sample['_id'], {
        "$push": {
            "actions": action,
            "observations": observation
        },
        "$set": {
            "environment.open_pages": open_pages,
            "update_time": int(time.time() * 1000)
        },
    }, agents_samples_collection, agents_samples_histories_collection)

    return observation
