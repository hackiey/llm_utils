import {Box, IconButton} from "@mui/material";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React, {useState, useEffect} from "react";

import { convertToolToRow, promptsData, toolsData} from "@/app/store/data-store";
import {toolStore} from "@/app/store/sample";
import Grid from "@mui/material/Unstable_Grid2";
import Filters from "@/app/components/filters";
import RefreshIcon from "@mui/icons-material/Refresh";
import Editor from '@monaco-editor/react';


const columns: GridColDef[] = [
    {
        field: "verified",
        headerName: "验证",
        type: "boolean",
        width: 70
    },
    {
        field: "deleted",
        headerName: "删除",
        type: "boolean",
        width: 70
    },
    {
        field: 'name',
        headerName: 'name',
        type: "string",
        width: 150,
    },
    {
        field: "display_name",
        headerName: "名称",
        type: "string",
        width: 150
    },
    {
        field: "description",
        headerName: "描述",
        type: "string",
        width: 500
    },
    {
        field: "category",
        headerName: "分类",
        type: "string",
        width: 100
    },
    {
        field: "tags",
        headerName: "标签",
        type: "string",
        width: 100
    },
    {
        field: "source",
        headerName: "来源",
        type: "string",
        width: 90,
    }
]

export default function Tools() {

    const [tool, setTool] = useState(toolStore.tool);
    const [toolJson, setToolJson] = useState(toolStore.toolJson);

    const [rows, setRows] = useState<any[]>(toolsData.rows);

    const [filters, setFilters] = useState(toolsData.filters);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({page: 0, pageSize: 100,});

    function updateFilters(newFilters: any[]){
        toolsData.filters = newFilters;
        setFilters(newFilters);
    }

    function updateRows(newTool: any){
        // 更新rows中的tool
        rows.forEach((row: any, index: number) => {
            if (row.id == newTool._id){
                setRows([...rows.slice(0, index), convertToolToRow(newTool), ...rows.slice(index+1)]);
            }
        })
    }

    function refreshRows(){
        setIsLoading(true);

        toolsData.fetchTotalCount().then((data: any) =>{
            setRowCount(data.total_count);
        });

        toolsData.fetchRows(paginationModel.page, paginationModel.pageSize).then((data: any) => {
            let _rows: {[index: string]: any}[] = [];

            data.forEach((tool: any) => {
                _rows.push(convertToolToRow(tool));
            });

            promptsData.rows = _rows;
            setRows(_rows);

            setIsLoading(false);
        })
    }

    useEffect(() => {

        refreshRows();

    }, [paginationModel, filters]);

    // ======================================= Row Selection =======================================
    function handleRowSelection(newSelection: any){
        rows.forEach((row: any) => {
            if (row.id == newSelection[0]){
                toolStore.tool = row.tool;
                toolStore.toolJson = toolStore.convertToJson(row.tool);

                setTool(toolStore.tool);
                setToolJson(toolStore.toolJson);

                console.log("[Select Tool]", row.tool);
            }
        });
    }

    return (
        <Grid container sx={{width: '100%'}} spacing={2}>

            <Grid xs={12} md={8} sx={{overflow: "auto", height: "100vh"}}>

                <Filters filters={filters} availableFilterTypes={toolsData.availableFilterTypes} updateFilters={updateFilters} />

                <Box sx={{display: "flex", height: 50, marginTop: 2}}>

                    <IconButton aria-label="refresh" sx={{marginLeft: "auto", marginRight: 1, float:"right"}} onClick={
                        ()=>{
                            refreshRows();
                        }}>
                        <RefreshIcon />
                    </IconButton>

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

            <Grid xs={12} md={4} sx={{overflow: "auto"}}>
                <Box sx={{marginTop: "100px"}}>
                    <Editor height="80vh" defaultLanguage="json" value={toolJson} onChange={(e: any)=>{console.log(e)}} />
                </Box>

            </Grid>

        </Grid>
    );
}