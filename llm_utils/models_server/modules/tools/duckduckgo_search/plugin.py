from duckduckgo_search import DDGS
from itertools import islice


def duckduckgo_search(query, top_k=8):

    results = []
    try:
        with DDGS() as ddgs:
            ddgs_gen = ddgs.text(query)
            for i, r in enumerate(islice(ddgs_gen, top_k)):
                results.append({
                    "title": r['title'],
                    "url": r['href'],
                    "content": r['body']
                })
        return {"status": 200, "results": results}
    except Exception as e:
        return {"status": 500, "result": str(e)}


if __name__ == "__main__":
    duckduckgo_search("杰帕德专武")
