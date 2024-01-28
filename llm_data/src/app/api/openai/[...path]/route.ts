
// import { type OpenAIListModelResponse } from "@/app/client/platforms/openai";
// import { getServerSideConfig } from "@/app/config/server";
import { OpenaiPath } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";

const ALLOWD_PATH = new Set(Object.values(OpenaiPath));

// function getModels(remoteModelRes: OpenAIListModelResponse) {
//   const config = getServerSideConfig();

//   if (config.disableGPT4) {
//     remoteModelRes.data = remoteModelRes.data.filter(
//       (m) => !m.id.startsWith("gpt-4"),
//     );
//   }

//   return remoteModelRes;
// }

const PROTOCOL = "https";

async function requestOpenai(req: NextRequest) {
    const controller = new AbortController();
    const authValue = req.headers.get("Authorization") ?? "";
    const openaiPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
        "/api/openai/",
        "",
    );

    let baseUrl = process.env.BASE_URL || "https://api.openai.com/v1";

    if (!baseUrl.startsWith("http")) {
        baseUrl = `${PROTOCOL}://${baseUrl}`;
    }

    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    console.log("[Proxy] ", openaiPath);
    console.log("[Base Url]", baseUrl);

    // if (process.env.OPENAI_ORG_ID) {
    //     console.log("[Org ID]", process.env.OPENAI_ORG_ID);
    // }

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 10 * 1 * 1000);

    const fetchUrl = `${baseUrl}/${openaiPath}`;
    const fetchOptions: RequestInit = {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            Authorization: authValue,
            ...(process.env.OPENAI_ORG_ID && {
                "OpenAI-Organization": process.env.OPENAI_ORG_ID,
            }),
        },
        method: req.method,
        body: req.body,
        // to fix #2485: https://stackoverflow.com/questions/55920957/cloudflare-worker-typeerror-one-time-use-body
        redirect: "manual",
        // @ts-ignore
        duplex: "half",
        signal: controller.signal,
    };

    try {
        console.log(fetchUrl);
        const res = await fetch(fetchUrl, fetchOptions);

        // to prevent browser prompt for credentials
        const newHeaders = new Headers(res.headers);
        newHeaders.delete("www-authenticate");
        // to disable nginx buffering
        newHeaders.set("X-Accel-Buffering", "no");

        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}


async function handle(req: NextRequest,{ params }: { params: { path: string[] } }) {
    console.log("[OpenAI Route] params ", params);

    if (req.method === "OPTIONS") {
        return NextResponse.json({ body: "OK" }, { status: 200 });
    }

    const subpath = params.path.join("/");

    if (!ALLOWD_PATH.has(subpath)) {
        console.log("[OpenAI Route] forbidden path ", subpath);
        return NextResponse.json(
            {
                error: true,
                msg: "you are not allowed to request " + subpath,
            },
            {
                status: 403,
            },
        );
    }

    //   const authResult = auth(req);
    //   if (authResult.error) {
    //     return NextResponse.json(authResult, {
    //       status: 401,
    //     });
    //   }

    try {
        const response = await requestOpenai(req);

        // // list models
        // if (subpath === OpenaiPath.ListModelPath && response.status === 200) {
        //     const resJson = (await response.json()) as OpenAIListModelResponse;
        //     const availableModels = getModels(resJson);
        //     return NextResponse.json(availableModels, {
        //         status: response.status,
        //     });
        // }

        return response;
    } catch (e) {
        console.error("[OpenAI] ", e);
        return NextResponse.json(prettyObject(e));
    }
}

export const GET = handle;
export const POST = handle;

// export const runtime = "edge";
