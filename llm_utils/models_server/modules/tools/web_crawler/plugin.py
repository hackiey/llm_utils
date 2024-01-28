from trafilatura import fetch_url, extract


def web_crawler(url):
    try:
        print(url)
        downloaded = fetch_url(url)
        content = extract(downloaded, include_formatting=False, include_links=False, include_images=False, include_tables=False)
        print(content)

        return {"status": 200, "content": content}

    except Exception as e:
        return {"status": 500, "result": str(e)}
