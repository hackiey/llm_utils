import {NextRequest, NextResponse} from "next/server";
import {requestJsonPost} from "@/app/api/common/utils";

async function handler(req: NextRequest, { params }: { params: { path: string[] } }){
    const BASE_URL = process.env.AGENTS_BASE_URL || "http://127.0.0.1:8010";

    let path = params['path'][0];
    const reqParams = await req.json();

    console.log("========================== "+path+" ==========================");
    console.log(reqParams);
    if (path == "create"){
        const data = await requestJsonPost(`${BASE_URL}/v1/agents/create`, reqParams);
        return NextResponse.json({status: 200, message: data.message, agent: data.agent});
    } else if (path == "list") {
        const data = await requestJsonPost(`${BASE_URL}/v1/agents/list`, reqParams);
        return NextResponse.json(data);
    } else if (path == "total_count"){
        const data = await requestJsonPost(`${BASE_URL}/v1/agents/total_count`, reqParams);
        return NextResponse.json(data);
    } else if (path == "get_config"){
        const data = await requestJsonPost(`${BASE_URL}/v1/agents/get_config`, reqParams);
        return NextResponse.json(data);
    } else if (path == "jump_to_action"){
        const data = await requestJsonPost(`${BASE_URL}/v1/agents/jump_to_action`, reqParams);
        return NextResponse.json(data);
    } else if (path == "run_action"){
        const data = await requestJsonPost(`${BASE_URL}/v1/agents/run_action`, reqParams);
        return NextResponse.json(data);
    }
}

export const POST = handler;