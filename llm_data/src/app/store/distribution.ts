
import {extractFilters} from "@/app/utils/utils";
import {FilterOperators} from "@/app/types";

let filters: any[] = [
    {type: "tasks", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "tags", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""},
    {type: "difficulty", operator: FilterOperators.Equal, arrayValue: ["全部"], textValue: ""}
];

let currentTask: any = undefined;

export let distribution = {
    getCurrentTask: function(){
        return currentTask;
    },
    updateCurrentTask: function(newTask: any){
        currentTask = newTask;
    },
    getDistributionFilters: function(){
        return filters;
    },
    updateDistributionFilters: function(newFilters: any[]){
        filters = newFilters;
    }
}

export async function fetchEvaluationTasks(){
    const response = await fetch("/api/evaluation/tasks", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {"Content-Type": "application/json"}
    });
    return response.json();
}

export async function fetchDistributionSamples(filters: any, task: any){
    let taskId = task._id;
    let models = task.models;

    filters = extractFilters(filters);
    if ('$and' in filters){
        filters['$and'].push({task_id: taskId});
        filters['$and'].push({verified: "已验证"});
    }else {
        filters['$and'] = [{task_id: taskId}, {verified: "已验证"}];
    }

    console.log("[Distribution Filters]", filters);

    const response = await fetch("/api/evaluation/list", {
        method: "POST",
        body: JSON.stringify({
            page: 0,
            pageSize: -1,
            filters: filters
        }),
        headers: {"Content-Type": "application/json"}
    });

    const evaluationSamples = await response.json();

    return calculateEvaluationResult(evaluationSamples, models);
}

function calculateEvaluationResult(evaluationSamples: any[], models: string[]){

    let modelResult: {[index: string]: any} = {
        confusion_matrix: [],
        taskScore: {},
        tagScore: {},
        difficultyScore: {},
        taskNum: {},
        tagNum: {},
        difficultyNum: {},
    };
    models.map((model) => {
        modelResult.confusion_matrix.push(
            Array.from({length: models.length}, (_, index) => [0, 0, 0])); // [win, lose, tie]

        modelResult.taskScore[model] = {};
        modelResult.tagScore[model] = {};
        modelResult.difficultyScore[model] = {};
    });

    evaluationSamples.map((evaluationSample) => {
        let rank_tags: number[] = evaluationSample.rank_tags;
        let reply_tags: string[] = evaluationSample.reply_tags;

        evaluationSample.tasks.map((task: string) => {
            if (!(task in modelResult.taskNum)){
                modelResult.taskNum[task] = 0;
            }
            modelResult.taskNum[task] += 1;
        });
        evaluationSample.tags.map((tag: string) => {
            if (!(tag in modelResult.tagNum)){
                modelResult.tagNum[tag] = 0;
            }
            modelResult.tagNum[tag] += 1;
        });
        if (!(evaluationSample.difficulty in modelResult.difficultyNum)){
            modelResult.difficultyNum[evaluationSample.difficulty] = 0;
        }
        modelResult.difficultyNum[evaluationSample.difficulty] += 1;

        reply_tags.map((reply_tag1: string, index1: number) => {
            let rank1: number = rank_tags[index1];

            evaluationSample.tasks.map((task: string) => {
                if (!(task in modelResult.taskScore[reply_tag1])){
                    modelResult.taskScore[reply_tag1][task] = 0;
                }
                modelResult.taskScore[reply_tag1][task] += rank1
            });

            evaluationSample.tags.map((tag: string) => {
                if (!(tag in modelResult.tagScore[reply_tag1])){
                    modelResult.tagScore[reply_tag1][tag] = 0;
                }
                modelResult.tagScore[reply_tag1][tag] += rank1;
            });
            if (!(evaluationSample.difficulty in modelResult.difficultyScore[reply_tag1])){
                modelResult.difficultyScore[reply_tag1][evaluationSample.difficulty] = 0;
            }
            modelResult.difficultyScore[reply_tag1][evaluationSample.difficulty] += rank1;

            reply_tags.map((reply_tag2: string, index2: number) => {
                if (index1 == index2){
                    return;
                }
                let rank2: number = rank_tags[index2];
                if (rank1 < rank2){
                    modelResult.confusion_matrix[models.indexOf(reply_tag1)][models.indexOf(reply_tag2)][0] += 1;
                }else if (rank1 > rank2){
                    modelResult.confusion_matrix[models.indexOf(reply_tag1)][models.indexOf(reply_tag2)][1] += 1;
                }else if (rank1 == rank2){
                    modelResult.confusion_matrix[models.indexOf(reply_tag1)][models.indexOf(reply_tag2)][2] += 1;
                }
            });
        });

    });

    Object.keys(modelResult.taskScore).map((model: string, index: number)=>{
        Object.keys(modelResult.taskScore[model]).map((task: string, index: number) => {
            modelResult.taskScore[model][task] = modelResult.taskScore[model][task] / modelResult.taskNum[task];
        })
    });
    Object.keys(modelResult.tagScore).map((model: string, index: number)=>{
        Object.keys(modelResult.tagScore[model]).map((tag: string, index: number) => {
            modelResult.tagScore[model][tag] = modelResult.tagScore[model][tag] / modelResult.tagNum[tag];
        });
    });
    Object.keys(modelResult.difficultyScore).map((model: string, index: number)=>{
        Object.keys(modelResult.difficultyScore[model]).map((difficulty: string, index: number) => {
            modelResult.difficultyScore[model][difficulty] = modelResult.difficultyScore[model][difficulty] / modelResult.difficultyNum[difficulty];
        });
    });

    return modelResult;
}