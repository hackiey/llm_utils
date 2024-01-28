import { Box, Divider, Grid } from '@mui/material';
import { BarChart } from '@mui/x-charts';

import Filters from '@/app/components/filters';
import {useEffect, useState} from "react";
import {distribution, fetchDistributionSamples, fetchEvaluationTasks} from "@/app/store/distribution";
import {Markdown} from "@/app/components/markdown";
import {ColumnItems} from "@/app/constant";

function PieDistribution(props: {distribution: {[index:string]: number}, category: string}){

    let xLabels: any[] = [];
    let data: any[] = [];
    ColumnItems[props.category].items.map((label: string, index: number)=>{
        xLabels.push(label);
        data.push(props.distribution[label] ? props.distribution[label] : 0);
    });

    return (
         <Box sx={{marginTop: "20px"}}>
            <BarChart series={[{data: data, label: "Num"}]}
                      xAxis={[{ data: xLabels, scaleType: 'band' }]}
                      width={ColumnItems[props.category].items.length * 70}
                      height={300}
                      colors={['#1976d2']}
            />
        </Box>

    )
}

function EvaluationResult(props: {evaluationResult: any, task: any}){
    if (props.task == undefined || props.evaluationResult.confusion_matrix == undefined){
        return null;
    }
    return (
        <Box style={{marginTop: "20px"}}>
            <Markdown content={`# ${props.task?.name || "Task"}`} />

            <Box sx={{marginTop: "30px"}}></Box>
            <p><span style={{color: "#55bb55"}}>Win</span>/<span style={{color: "#bb5555"}}>Lose</span>/<span style={{color: "#5555bb"}}>Draw</span></p>
            <table className={"distribution"} border={2}>
                <thead>
                    <tr>
                        <th></th>
                        {props.task.models.map((model: string, index: number)=>(
                            <th key={index}>{model}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>

                {props.task.models.map((model: string, index1: number)=>(
                    <tr key={index1}>
                        <th>{model}</th>

                        {props.task.models.map((model2: string, index2: number)=> {
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
                                    <span
                                        style={{color: "#55bb55"}}>{winNum}</span>
                                </Box>
                                <Box sx={{borderRight: "1px solid lightblue", width: "33%", float: "left"}}>
                                    <span
                                        style={{color: "#bb5555"}}>{loseNum}</span>
                                </Box>

                                <span
                                    style={{color: "#5555bb"}}>{drawNum}</span>

                                <Divider/>
                                <Box sx={{borderRight: "1px solid lightblue", width: "33%", float: "left"}}>
                                    <span
                                        style={{color: "#55bb55"}}>{winRate}</span>
                                </Box>
                                <Box sx={{borderRight: "1px solid lightblue", width: "33%", float: "left"}}>
                                    <span
                                        style={{color: "#55bb55"}}>{loseRate}</span>
                                </Box>

                                <span
                                    style={{color: "#bb5555"}}>{drawRate}</span>
                            </td>)
                        })}
                    </tr>
                ))}
                </tbody>
            </table>

            <Box sx={{marginTop: "30px"}}></Box>
            <Markdown content={"## Average rank"} />

            <PieDistribution distribution={props.evaluationResult.taskNum} category={"tasks"} />
            <table className={"distribution-column"} style={{marginTop: "20px"}}>
                <thead>
                    <tr>
                        <th></th>
                        {ColumnItems.tasks.items.map((task: string, index: number)=>(
                            <th key={index}>{task}</th>
                        ))}</tr>
                </thead>
                <tbody>

                    {props.task.models.map((model: string, index: number)=>(
                        <tr key={index}>
                            <th>{model}</th>
                            {ColumnItems.tasks.items.map((task: string, index: number)=>(
                                <td key={index}>
                                    {props.evaluationResult.taskScore[model][task] == undefined ? 0 : props.evaluationResult.taskScore[model][task].toFixed(2)}
                                </td>))}
                        </tr>
                    ))}

                </tbody>
            </table>

            <PieDistribution distribution={props.evaluationResult.tagNum} category={"tags"} />
            <table className={"distribution-column"} style={{marginTop: "20px"}}>
                <thead>
                    <tr>
                        <th></th>
                        {ColumnItems.tags.items.map((task: string, index: number)=>(
                            <th key={index}>{task}</th>
                        ))}</tr>
                </thead>
                <tbody>

                    {props.task.models.map((model: string, index: number)=>(
                        <tr key={index}>
                            <th>{model}</th>
                            {ColumnItems.tags.items.map((tag: string, index: number)=>(
                                <td key={index}>
                                    {props.evaluationResult.tagScore[model][tag] == undefined ? 0 : props.evaluationResult.tagScore[model][tag].toFixed(2)}
                                </td>))}
                        </tr>
                    ))}

                </tbody>
            </table>

            <PieDistribution distribution={props.evaluationResult.difficultyNum} category={"difficulty"} />
            <table className={"distribution-column"} style={{marginTop: "20px"}}>
                <thead>
                    <tr>
                        <th></th>
                        {ColumnItems.difficulty.items.map((difficulty: string, index: number)=>(
                            <th key={index}>{difficulty}</th>
                        ))}</tr>
                </thead>
                <tbody>

                    {props.task.models.map((model: string, index: number)=>(
                        <tr key={index}>
                            <th>{model}</th>
                            {ColumnItems.difficulty.items.map((difficulty: string, index: number)=>(
                                <td key={index}>
                                    {props.evaluationResult.difficultyScore[model][difficulty] == undefined ? 0 : props.evaluationResult.difficultyScore[model][difficulty].toFixed(2)}
                                </td>))}
                        </tr>
                    ))}

                </tbody>
            </table>
        </Box>
    );
}

export default function Distribution() {

    const [tasks, setTasks] = useState<any[]>([]);
    const [currentTask, setCurrentTask] = useState<any>(distribution.getCurrentTask());
    const [evaluationResult, setEvaluationResult] = useState<{[index: string]: any}>({});

    const [filters, setFilters] = useState(distribution.getDistributionFilters());
    const availableFilterTypes: string[] = [];

    function updateFilters(newFilters: any[]){
        setFilters(newFilters);
        distribution.updateDistributionFilters(newFilters);
    }

    async function getTasks(){
        const tasks: any = await fetchEvaluationTasks();
        setTasks(tasks);

        if (!currentTask && tasks.length > 0) {
            setCurrentTask(tasks[0]);
        }
    }

    async function updateEvaluationResult(){
        const modelResult = await fetchDistributionSamples(filters, currentTask);
        setEvaluationResult(modelResult);
    }

    useEffect(()=>{
        getTasks();
    }, []);

    useEffect(() => {
        if (currentTask){
            updateEvaluationResult();
        }
    }, [filters, currentTask]);

    return (
        <Box>
            <Filters filters={filters} availableFilterTypes={availableFilterTypes} updateFilters={updateFilters} />

            <EvaluationResult evaluationResult={evaluationResult} task={currentTask} />
        </Box>
    )
}