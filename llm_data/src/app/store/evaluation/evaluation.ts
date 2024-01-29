import {FilterOperators} from "@/app/types";
import {extractFilters} from "@/app/utils/utils";

let filters: any[] = [
    {type: "tasks", operator: FilterOperators.Equal, arrayValue:["全部"], textValue: ""},
    {type: "tags", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "difficulty", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "verified", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "evaluation_task_name", operator: FilterOperators.Equal, arrayValue: [], textValue: ""},
]

let page: number = 1;

export let evaluationStore = {
    getPage: function(){
        return page;
    },
    updatePage: function(newPage: number){
        page = newPage;
    },
    getEvaluationFilters: function(){
        return filters;
    },
    updateEvaluationFilters: function(newFilters: any[]){
        filters = newFilters;
    }
}

export async function fetchEvaluationSamples(page: Number, filters: any){
    filters = extractFilters(filters);
    console.log("[Evaluation Filters]", filters);

    const response = await fetch("/api/evaluation/list", {
        method: "POST",
        body: JSON.stringify({
            page: page,
            pageSize: 1,
            filters: filters
        }),
        headers: {"Content-Type": "application/json"}
    });

    return response.json();
}

export async function fetchEvaluationSampleTotalCount(filters: any){
    filters = extractFilters(filters);
    const response = await fetch("/api/evaluation/total-count", {
        method: "POST",
        body: JSON.stringify({filters: filters}),
        headers: {"Content-Type": "application/json"}
    });
    return response.json();
}

export async function requestUpdateEvaluationSample(evaluationSample: any, dtype: string, username: string){
    const update_time = new Date().getTime();
    let updateBody:{[index: string]: any} = {
        _id: evaluationSample._id,
        update_time: update_time,
        update_user: username,
        verified_time: update_time,
        verified_user: username,
        verified: "已验证"
    };
    if (dtype == "rank_tags"){
        updateBody.rank_tags = evaluationSample.rank_tags;
        const response = await fetch("/api/evaluation/update-rank-tags", {
            method: "POST",
            body: JSON.stringify(updateBody),
            headers: {"Content-Type": "application/json"}
        });

        return response.json();
    }
}