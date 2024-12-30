import { NextRequest, NextResponse } from 'next/server'

import { Schema, Types, model } from 'mongoose';
import mongoose from "mongoose";

import {EvaluationSampleSchema} from "@/app/api/common/schemas";
mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "");

const EvaluationSampleModel = mongoose.models.evaluation_samples || model("evaluation_samples", EvaluationSampleSchema);

async function handler(req: NextRequest, {params} : {params: {path: string[]}}) {
    let path = params["path"][0];

    const reqParams = await req.json();

    let filters: any = reqParams.filters || {};

    if (path == "list") {
        console.log(filters);
        let options: {[index: string]: any} = {sort: {create_time: 1}};
        if (reqParams.pageSize < 0){
            options.skip = reqParams.page;
        }else{
            options.skip = reqParams.page * reqParams.pageSize;
            options.limit = reqParams.pageSize;
        }
        const data = await EvaluationSampleModel.find(filters, null, options);
        return NextResponse.json(data);
    }

    if (path == "total-count"){
        console.log(filters);
        const total_count = await EvaluationSampleModel.countDocuments(filters);
        return NextResponse.json({total_count: total_count});
    }

    if (path == "update-rank-tags"){
        console.log(reqParams);
        const response = await EvaluationSampleModel.updateOne(
            {_id: reqParams._id}, {
                rank_tags: reqParams.rank_tags,
                update_time: reqParams.update_time,
                update_user: reqParams.update_user,
                verified_time: reqParams.verified_time,
                verified_user: reqParams.verified_user,
                verified: reqParams.verified
            });
        return NextResponse.json({status: 200, message: "更新成功"});
    }
}

export const POST = handler;