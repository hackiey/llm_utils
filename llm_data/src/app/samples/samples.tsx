import React, {useEffect, useState} from "react";

import Box from '@mui/material/Box';
import {DataGrid, GridColDef} from '@mui/x-data-grid';
import {Alert, Button, Checkbox, IconButton} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh';
import {ColumnItems} from "@/app/constant";
import {useSession} from 'next-auth/react'
import Filters from "@/app/components/filters";

import {createEmptySample, sampleStore} from "@/app/store/sample";
import {convertSampleToRow, samplesData} from "@/app/store/data-store";


import {setQuickUserFilter} from "@/app/utils/utils";
import Grid from "@mui/material/Unstable_Grid2";
import Chatbox from "@/app/components/chatbox";
import {ChatboxType, FilterOperators} from "@/app/types";

const columns: GridColDef[] = [
    {
        field: 'verified',
        headerName: ColumnItems.verified.name,
        type: 'boolean',
        width: 50,
    },
    {
        field: "marked",
        headerName: ColumnItems.marked.name,
        type: "boolean",
        width: 50
    },
    {
        field: "deleted",
        headerName: ColumnItems.deleted.name,
        type: "boolean",
        width: 50
    },
    {
        field: 'source',
        headerName: ColumnItems.source.name,
        type: "string",
        width: 90
    },
    {
        field: 'prompt',
        headerName: 'Prompt',
        width: 800,
        // editable: true,
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
        headerName: ColumnItems.tags.name,
        width: 100
    },
    {
        field: 'language',
        headerName: '语言',
        type: 'string',
        width: 60,
        // editable: true,
    },
    {
        field: 'update_user',
        headerName: ColumnItems.update_user.name,
        type: 'string',
        width: 100,
    },
    {
        field: 'update_time',
        headerName: ColumnItems.update_time.name,
        type: 'string',
        width: 100,
    },
    {
        field: "characters",
        headerName: ColumnItems.characters.name,
        type: "number",
        width: 70
    },
    {
        field: "is_train",
        headerName: ColumnItems.data_type.name,
        type: "boolean",
        width: 50
    },
    {
        field: "verified_user",
        headerName: ColumnItems.verified_user.name,
        type: "string",
        width: 100,
    },
    {
        field: "verified_time",
        headerName: ColumnItems.verified_time.name,
        type: "string",
        width: 100,
    }
    
];

export default function Samples() {

    const { data: session, status } = useSession();
    const username = session?.user?.name || "";

    const [sample, setSample] = useState(sampleStore.sample);
    const [prompt, setPrompt] = useState(sampleStore.prompt);
    const [rows, setRows] = useState(samplesData.rows);

    const [filters, setFilters] = useState(samplesData.filters);

    const [justMeVerified, setJustMeVerified] = useState(false);
    const [justMeCreated, setJustMeCreated] = useState(false);
    const [justMeUpdated, setJustMeUpdated] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({page: 0, pageSize: 100});

    function updateFilters(newFilters: any[]){
        samplesData.filters = newFilters;
        setFilters(newFilters);
    }

    function updateRows(newSample: any){
        rows.forEach((row: any, index: number) => {
            if (row.id == newSample._id){
                setRows([...rows.slice(0, index), convertSampleToRow(newSample), ...rows.slice(index+1)]);
            }
        });

        samplesData.rows = rows;
    }

    async function updateSample(newSample:any, dtype: string, username: string){
        const resData = await sampleStore.requestUpdateSample(newSample, dtype, username);
        if (resData.status == 200){
            updateRows(newSample);
        }
        return resData;
    }
    async function updatePrompt(newPrompt: any, username: string){
        return await sampleStore.requestUpdatePrompt(newPrompt, username);
    }

    function refreshRows(){
        setIsLoading(true);

        samplesData.fetchRows(paginationModel.page, paginationModel.pageSize).then((data) => {
            let _rows: { [index: string]: any }[] = [];

            data.forEach((sample: any, index: Number) => {
                _rows.push(convertSampleToRow(sample));
            });
            setRows(_rows);
            samplesData.rows = _rows;
            setIsLoading(false);
        });

        samplesData.fetchTotalCount().then((data: any) => {
            setRowCount(data.total_count);
        });
    }

    // 获取行数据
    useEffect(() => {
        let justMeVerifiedFlag = false;
        let justMeCreatedFlag = false;
        let justMeUpdatedFlag = false;
        filters.map((filter) => {
            if (filter.operator == FilterOperators.Equal && filter.type == "verified_user" && filter.textValue == session?.user?.name){
                justMeVerifiedFlag = true;
            }
            if (filter.operator == FilterOperators.Equal && filter.type == "create_user" && filter.textValue == session?.user?.name){
                justMeCreatedFlag = true;
            }
            if (filter.operator == FilterOperators.Equal && filter.type == "update_user" && filter.textValue == session?.user?.name){
                justMeUpdatedFlag = true;
            }
        });
        setJustMeVerified(justMeVerifiedFlag);
        setJustMeCreated(justMeCreatedFlag);
        setJustMeUpdated(justMeUpdatedFlag);

        samplesData.filters = filters;

        refreshRows();
    }, [paginationModel, filters])

    // ======================================= Row Selection =======================================
    function handleRowSelection(newSelection: any){
        rows.forEach((row: any) => {
            if (row.id == newSelection[0]){
                setSample(row.sample);
                sampleStore.sample = row.sample;
                setPrompt({});
                sampleStore.prompt = {};
                console.log("[Select Sample]", row.sample);
            }
        });
    }

    return (
        <Grid container sx={{width: '100%'}} spacing={2}>
            <Grid xs={12} md={8} sx={{overflow: "auto", height: "calc(100vh - 90px)"}}>

                <Filters filters={filters} availableFilterTypes={samplesData.availableFilterTypes} updateFilters={updateFilters} />

                <Box sx={{display: "flex", marginTop: 2}}>

                    <Box sx={{marginLeft: -1.5}}>
                        <Checkbox checked={justMeVerified} onChange={(e: any)=>{
                            setJustMeVerified(e.target.checked);
                            setQuickUserFilter("verified_user", e.target.checked, session?.user?.name || "", filters, setFilters);
                        }} />
                        <span style={{color: "gray", fontSize: "0.8em"}}>只看我验证的</span>
                        <Checkbox checked={justMeUpdated} onChange={(e: any)=>{
                            setJustMeUpdated(e.target.checked);
                            setQuickUserFilter("update_user", e.target.checked, session?.user?.name || "", filters, setFilters);
                        }} />
                        <span style={{color: "gray", fontSize: "0.8em"}}>只看我更新的</span>
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
                    <Button sx={{height: 30, marginTop: 0.5}} style={{backgroundColor: "#1876d2"}} variant='contained' size="small" onClick={()=>{
                        const newSample = createEmptySample(session?.user?.name||"");
                        setSample(newSample);
                        sampleStore.sample = newSample;
                        setPrompt({})
                        sampleStore.prompt = {};
                    }}>新建对话样本</Button>

                </Box>

                <Box>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        rowCount={rowCount}
                        loading={isLoading}
                        disableColumnFilter
                        paginationMode="server"
                        pageSizeOptions={[25, 50, 100]}
                        onPaginationModelChange={setPaginationModel}
                        onRowSelectionModelChange={handleRowSelection}
                    />
                </Box>
            </Grid>
            <Grid xs={12} md={4} sx={{overflow: "auto", height: "calc(100vh - 90px)"}}>
                {sampleStore.sample.messages == undefined && sampleStore.prompt.messages == undefined ? (
                    <Alert severity="info">
                        没有选择对话
                    </Alert>
                ): (
                    <Chatbox chatboxType={ChatboxType.samples} config={{}}
                             sample={sampleStore.sample} prompt={sampleStore.prompt}
                             createEmptySample={createEmptySample}
                             updateSample={updateSample} updatePrompt={updatePrompt} />
                )}
            </Grid>
        </Grid>
    );
}