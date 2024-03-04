from duckduckgo_search import DDGS
from itertools import islice
from trafilatura import fetch_url, extract


def duckduckgo(query, top_k=8):

    results = []
    with DDGS() as ddgs:
        ddgs_gen = ddgs.text(query)
        for i, r in enumerate(islice(ddgs_gen, top_k)):
            results.append({
                "title": r['title'],
                "url": r['href'],
                "summary": r['body'][:100]+"...",
            })

    return results


def open_url(url, title, line_length, chunk_max_lines):
    url = url.strip()

    downloaded = fetch_url(url)
    content = extract(downloaded, include_formatting=True, include_links=False, include_images=False,
                      include_tables=False)

    if content is None:
        content = ""

    chunk = ""
    line_num = 0

    page = {
        "url": url,
        "title": title,
        "content": content,
        "chunks": [],
        "max_scrolls": 0,
    }

    for paragraph in content.split('\n'):
        # 将paragraph按照line_length长度分割
        if len(paragraph) <= line_length:
            chunk += paragraph + '\n'
            line_num += 1

            if line_num > chunk_max_lines:
                page['chunks'].append(chunk + "\n")

                chunk = ""
                line_num = 0
                continue
        else:
            while len(paragraph) > line_length:
                chunk += paragraph[:line_length]
                paragraph = paragraph[line_length:]
                line_num += 1

                if line_num > chunk_max_lines:
                    page['chunks'].append(chunk)

                    chunk = ""
                    line_num = 0

            chunk += paragraph + '\n'
            line_num += 1

    if chunk != "":
        page['chunks'].append(chunk)

    chunk_contents = []
    i = 0
    while i < len(page['chunks']):
        chunk_content = page['chunks'][i]
        if i + 1 < len(page['chunks']):
            chunk_content += page['chunks'][i + 1]
        if i + 2 < len(page['chunks']):
            chunk_content += page['chunks'][i + 2]

        i += 2
        chunk_contents.append(chunk_content)

    page['chunk_contents'] = chunk_contents

    page['max_scrolls'] = len(chunk_contents) - 1

    return page
