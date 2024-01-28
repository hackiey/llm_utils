
import { NextRequest, NextResponse } from 'next/server'

async function handler(req: NextRequest, {params} : {params: {path: string[]}}) {
    let path = params["path"][0];

    let BASE_URL = process.env.BASE_URL || "";

    const reqParams = await req.json();

    if (path == "problem"){
        const result = await fetch(`${BASE_URL}/lab/llm-challenges/problem`, {
            method: "POST",
            body: JSON.stringify(reqParams),
            headers: {"Content-Type": "application/json"}
        }).then(res => res.json());

        console.log(result);

        return NextResponse.json(result);
    }else if(path == "validate"){

        const result = await fetch(`${BASE_URL}/lab/llm-challenges/validate`, {
            method: "POST",
            body: JSON.stringify(reqParams),
            headers: {"Content-Type": "application/json"}
        }).then(res => res.json());

        console.log(result);

        return NextResponse.json(result);
    }else if(path == "next-problem"){
        const result = await fetch(`${BASE_URL}/lab/llm-challenges/next-problem`, {
            method: "POST",
            body: JSON.stringify(reqParams),
            headers: {"Content-Type": "application/json"}
        }).then(res => res.json());

        console.log(result);

        return NextResponse.json(result);
    }

    return NextResponse.json({status: 404, message: "Not Found"})

}

export const POST= handler;