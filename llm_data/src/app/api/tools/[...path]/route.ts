import {NextRequest, NextResponse} from "next/server";
import {ToolsPath} from "@/app/constant";

const PROTOCOL = "https";

// 引入mongoose
import mongoose, {model} from "mongoose";

import {ToolSchema} from "@/app/api/common/schemas";

mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "");

const ToolModel = mongoose.models.tools || model("tools", ToolSchema);

async function handler(req: NextRequest, { params }: { params: { path: string[] } } ) {
    let path = params["path"][0];

    const reqParams = await req.json();

    let baseUrl = process.env.BASE_URL || "";
    if (!baseUrl.startsWith("http")) {
        baseUrl = `${PROTOCOL}://${baseUrl}`;
    }
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    let filters: any = reqParams.filters;

    if (path == "list"){
        console.log("========================== tools list ==========================")
        console.log(reqParams);

        const data = await ToolModel.find(filters, null, {
            skip: reqParams.page * reqParams.page_size,
            limit: reqParams.page_size,
            sort: {update_time: -1}
        });

        return NextResponse.json(data);
    }

    if (path == "total-count"){
        const total_count = await ToolModel.countDocuments(filters);

        return NextResponse.json({total_count: total_count});
    }

    if (path == "search"){
        const fetchUrl = `${baseUrl}/${ToolsPath.SearchPath}`;
        console.log(fetchUrl);
        const response = await fetch(fetchUrl, {
            method: "POST",
            body: JSON.stringify(reqParams),
            headers: { "Content-Type": "application/json" },
        });
        const result = await response.json();
        console.log(result);
        return NextResponse.json({status: 200, results: result.results});
    }
}

export const POST = handler;