import React, {useEffect, useState} from 'react';
import {useSession} from 'next-auth/react'
import {Alert, Box, Button, Checkbox, IconButton} from '@mui/material';
import {DataGrid, GridColDef} from '@mui/x-data-grid';

// import {createSample} from "@/app/store/sample";
import Chatbox from '@/app/components/chatbox';
import {ColumnItems} from "@/app/constant";
import {ChatboxType, FilterOperators} from "@/app/types";
import RefreshIcon from "@mui/icons-material/Refresh";
import Filters from "@/app/components/filters";
import {setQuickUserFilter} from "@/app/utils/utils";
import Grid from "@mui/material/Unstable_Grid2";

import {convertPromptToRow, promptsData} from "@/app/store/data-store";
import {createEmptySample, createPrompt, promptStore} from "@/app/store/sample";

const columns: GridColDef[] = [
    {
        field: 'title',
        headerName: '标题',
        type: "string",
        width: 150,
    },
    {
        field: "prompt",
        headerName: "Prompt",
        type: "string",
        width: 800
    },
    {
        field: "create_user",
        headerName: "创建用户",
        type: "string",

    },
    {
        field: "create_time",
        headerName: ColumnItems.create_time.name,
        type: "string",
    },
    {
        field: "difficulty",
        headerName: ColumnItems.difficulty.name,
        type: "string",
        width: 70
    },
    {
        field: 'tasks',
        headerName: ColumnItems.tasks.name,
        width: 70,
        // editable: true,
    },
    {
        field: 'tags',
        headerName: ColumnItems.tasks.name,
        width: 100
    },
]

export default function Samples() {
    const { data: session, status } = useSession();

    const [sample, setSample] = useState(promptStore.sample);
    const [prompt, setPrompt] = useState(promptStore.prompt);
    const [rows, setRows] = useState(promptsData.rows);

    const [filters, setFilters] = useState(promptsData.filters);

    const [isLoading, setIsLoading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({page: 0, pageSize: 100,});

    const [justMeCreated, setJustMeCreated] = useState(false);

    function updateFilters(newFilters: any[]){
        promptsData.filters = newFilters;
        setFilters(newFilters);
    }

    function updateRows(newPrompt: any){
        // 更新rows中的sample
        rows.forEach((row: any, index: number) => {
            if (row.id == newPrompt._id){
                setRows([...rows.slice(0, index), convertPromptToRow(newPrompt), ...rows.slice(index+1)]);
            }
        });
    }

    async function updateSample(newSample: any, dtype: string, username: string){
        return await promptStore.requestUpdateSample(newSample, dtype, username);
    }
    async function updatePrompt(newPrompt: any, username: string){
        const resData = await promptStore.requestUpdatePrompt(newPrompt, username);

        updateRows(newPrompt);
        return resData;
    }

    function refreshRows(){
        setIsLoading(true);

        promptsData.fetchTotalCount().then((data: any) => {
            setRowCount(data.total_count);
        });

        promptsData.fetchRows(paginationModel.page, paginationModel.pageSize).then((data: any) => {
            let _rows: {[index: string]: any}[] = [];

            data.forEach((prompt: any) => {
                _rows.push(convertPromptToRow(prompt));
            });

            promptsData.rows = _rows;
            setRows(_rows);

            setIsLoading(false);
        });
    }

    // 获取行数据
    useEffect(()=>{
        let justMeCreatedFlag = false;
        filters.map((filter: any) => {
            if (filter.operator == FilterOperators.Equal && filter.type == "create_user" && filter.textValue == session?.user?.name){
                justMeCreatedFlag = true;
            }
        });
        setJustMeCreated(justMeCreatedFlag);

        promptsData.filters = filters;

        refreshRows();
    }, [paginationModel, filters])

    // ======================================= Row Selection =======================================
    function handleRowSelection(newSelection: any){
        rows.forEach((row: any) => {
            if (row.id == newSelection[0]){

                let sample: any = createEmptySample(session?.user?.name||"");
                sample.messages.push(row.original.messages[0]);
                sample.tasks = row.original.tasks;
                sample.tags = row.original.tags;
                sample.difficulty = row.original.difficulty;

                promptStore.sample = sample;
                setSample(sample);

                promptStore.prompt = row.original;

                setPrompt(row.original);
                console.log("[Select Prompt]", row);
            }
        });
    }

    return (
        <Grid container sx={{width: '100%'}} spacing={2}>
            <Grid xs={12} md={8} sx={{overflow: "auto", height: "100vh"}}>
                <Filters filters={filters} availableFilterTypes={promptsData.availableFilterTypes} updateFilters={updateFilters} />

                <Box sx={{display: "flex", height: 50, marginTop: 2}}>

                    <Box sx={{marginLeft: -1.5}}>
                        <Checkbox checked={justMeCreated} onChange={(e: any)=>{
                            setJustMeCreated(e.target.checked);
                            setQuickUserFilter("create_user", e.target.checked, session?.user?.name || "", filters, setFilters);
                        }} />
                        <span style={{color: "gray", fontSize: "0.8em"}}>只看我创建的</span>
                    </Box>

                    <IconButton aria-label="refresh" sx={{marginLeft: "auto", marginRight: 1, float:"right"}} onClick={
                        ()=>{
                            refreshRows();
                        }}>
                        <RefreshIcon />
                    </IconButton>

                    <Button sx={{height: 30, marginTop: 0.5}} style={{backgroundColor: "#1876d2"}} variant='contained' size="small"
                            onClick={()=> {
                                let sample: any = createEmptySample(session?.user?.name || "");
                                sample.messages = [{role: "system", content: ""}];

                                promptStore.sample=sample;
                                setSample(sample);

                                const prompt = createPrompt("", sample, sample.messages, session?.user?.name || "");
                                promptStore.prompt = prompt;
                                setPrompt(prompt);
                            }}>
                        新建Prompt
                    </Button>

                </Box>

                <DataGrid
                    rows={rows}
                    columns={columns}
                    getRowHeight={() => 'auto'}
                    rowCount={rowCount}
                    loading={isLoading}
                    paginationMode="server"
                    pageSizeOptions={[25, 50, 100]}
                    onPaginationModelChange={setPaginationModel}
                    onRowSelectionModelChange={handleRowSelection}
                />
            </Grid>
            <Grid xs={12} md={4} sx={{overflow: "auto", height: "100vh"}}>
                {sample.messages == undefined && prompt.messages == undefined ? (
                    <Alert severity="info">
                        没有选择Prompt
                    </Alert>
                ):(
                    <Chatbox chatboxType={ChatboxType.prompts} config={{}}
                             sample={sample} prompt={prompt}
                             createEmptySample={()=>{}}
                             updateSample={updateSample} updatePrompt={updatePrompt} />
                )}
            </Grid>
        </Grid>
    )

}