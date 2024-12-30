import { Box, Divider } from '@mui/material';
import { BarChart } from '@mui/x-charts';

import Filters from '@/app/components/filters';
import {useEffect, useState} from "react";
import {distribution, fetchDistributionSamples, fetchEvaluationTasks} from "@/app/store/evaluation/distribution";
import {Markdown} from "@/app/components/markdown";
import {ColumnItems} from "@/app/constant";
import {useSearchParams} from "next/navigation";
import {evaluationStore} from "@/app/store/evaluation/evaluation";
import {FilterOperators} from "@/app/types";

function PieDistribution(props: {distribution: {[index:string]: number}}){

    let xLabels: any[] = [];
    let data: any[] = [];
    Object.keys(props.distribution).forEach(key=>{
        xLabels.push(key);
        data.push(props.distribution[key]);
    });

    return (
         <Box sx={{marginTop: "20px"}}>
            <BarChart series={[{data: data, label: "Num"}]}
                      xAxis={[{ data: xLabels, scaleType: 'band' }]}
                      width={Object.keys(props.distribution).length * 70}
                      height={300}
                      colors={['#1976d2']}
            />
        </Box>

    )
}

function EvaluationResult(props: {evaluationResult: any}){
    if (props.evaluationResult.confusion_matrix == undefined){
        return null;
    }
    return (
        <Box style={{marginTop: "20px"}}>
            <Markdown content={`# ${props.evaluationResult?.taskName || "Task"}`} />

            <Box sx={{marginTop: "30px"}}></Box>
            <p><span style={{color: "#55bb55"}}>Win</span>/<span style={{color: "#bb5555"}}>Lose</span>/<span style={{color: "#5555bb"}}>Draw</span></p>
            <table className={"distribution"} border={2}>
                <thead>
                    <tr>
                        <th></th>
                        {props.evaluationResult.models.map((model: string, index: number)=>(
                            <th key={index}>{model}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>

                {props.evaluationResult.models.map((model: string, index1: number)=>(
                    <tr key={index1}>
                        <th>{model}</th>

                        {props.evaluationResult.models.map((model2: string, index2: number)=> {
                            if (model == model2) {
                                return (<td key={index2}></td>)
                            }
                            const winNum = props.evaluationResult.confusion_matrix[index1][index2][0];
                            const loseNum = props.evaluationResult.confusion_matrix[index1][index2][1];
                            const drawNum = props.evaluationResult.confusion_matrix[index1][index2][2];

                            const winRate = (winNum / (winNum + loseNum + drawNum) * 100).toFixed(2)+"%";
                            const loseRate = (loseNum / (winNum + loseNum + drawNum) * 100).toFixed(2)+"%";
                            const drawRate = (drawNum / (winNum + loseNum + drawNum) * 100).toFixed(2)+"%";

                            return (<td key={index2} style={{minWidth: "200px"}}>
                                <Box sx={{borderRight: "1px solid lightblue", width: "33%", float: "left"}}>
                                    <span style={{color: "#55bb55"}}>{winNum}</span>
                                </Box>
                                <Box sx={{borderRight: "1px solid lightblue", width: "33%", float: "left"}}>
                                    <span style={{color: "#bb5555"}}>{loseNum}</span>
                                </Box>

                                <span style={{color: "#5555bb"}}>{drawNum}</span>

                                <Divider/>
                                <Box sx={{borderRight: "1px solid lightblue", width: "33%", float: "left"}}>
                                    <span style={{color: "#55bb55"}}>{winRate}</span>
                                </Box>
                                <Box sx={{borderRight: "1px solid lightblue", width: "33%", float: "left"}}>
                                    <span style={{color: "##bb5555"}}>{loseRate}</span>
                                </Box>

                                <span style={{color: "#5555bb"}}>{drawRate}</span>
                            </td>)
                        })}
                    </tr>
                ))}
                </tbody>
            </table>

            <Box sx={{marginTop: "30px"}}></Box>
            <Markdown content={"## Average rank \n\n 分数越低代表排名越靠前"} />

            {/*<PieDistribution distribution={props.evaluationResult.tagNum}/>*/}
            <table className={"distribution-column"} style={{marginTop: "20px"}}>
                <thead><tr><th></th><th>平均排名</th></tr></thead>
                <tbody>
                    {props.evaluationResult.modelScore.map((modelScore: any, index: number) => (
                        <tr key={index}>
                            <th>{modelScore["model"]}</th>
                            <td>{modelScore["score"].toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <table className={"distribution-column"} style={{marginTop: "20px"}}>
                <thead>
                    <tr>
                        <th></th>
                        {Object.keys(props.evaluationResult.tagNum).map((tag: string, index:number)=>(
                            <th key={index}>{tag}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>总数</td>
                        {Object.keys(props.evaluationResult.tagNum).map((tag: string, index: number) => (
                            <td key={index}>
                                {props.evaluationResult.tagNum[tag] == undefined ? 0 : props.evaluationResult.tagNum[tag]}
                            </td>
                        ))}
                    </tr>
                    {props.evaluationResult.models.map((model: string, index: number) => (
                        <tr key={index}>
                            <th>{model}</th>
                            {Object.keys(props.evaluationResult.tagScore[model]).map((tag: string, index: number) => (
                                <td key={index}>
                                    {props.evaluationResult.tagScore[model][tag] == undefined ? 0 : props.evaluationResult.tagScore[model][tag].toFixed(2)}
                                </td>))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </Box>
    );
}

export default function Distribution() {
    const [evaluationResult, setEvaluationResult] = useState<{ [index: string]: any }>({});

    const searchParams = useSearchParams();
    const taskName = searchParams.get("task");

    const [filters, setFilters] = useState(distribution.getDistributionFilters());
    const availableFilterTypes: string[] = [];

    function updateFilters(newFilters: any[]){
        setFilters(newFilters);
        distribution.updateDistributionFilters(newFilters);
    }

    async function updateEvaluationResult(){
        const modelResult = await fetchDistributionSamples(filters.concat([{type: "evaluation_task_name", operator: FilterOperators.Equal, arrayValue: [], textValue: taskName}]));
        setEvaluationResult(modelResult);
    }

    useEffect(()=>{
        // getTasks();
        updateEvaluationResult();
    }, [filters]);

    return (
        <Box>
            <Filters filters={filters} availableFilterTypes={availableFilterTypes} updateFilters={updateFilters} />

            <EvaluationResult evaluationResult={evaluationResult} />
        </Box>
    )
}