import React, {useEffect, useState} from "react";
import {useSession} from "next-auth/react";
import {Box, IconButton, Alert, Checkbox} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import RefreshIcon from "@mui/icons-material/Refresh";

import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Filters from "@/app/components/filters";
import {chatLogsData, convertChatLogToRow} from "@/app/store/data-store";
// import {chatLogStore} from "@/app/store/sample";
import {ColumnItems} from "@/app/constant";
import {ChatboxType} from "@/app/types";
import Chatbox from "@/app/components/chatbox";
// import {requestUpdateChatLog} from "@/app/store/chat-log";
import {chatLogStore} from "@/app/store/chat-log";

const columns: GridColDef[] = [
    {
        field: "pending",
        headerName: "处理",
        type: "boolean",
        width: 50
    },
    {
        field: "prompt",
        headerName: ColumnItems.prompt.name,
        type: "string",
        width: 700
    },
    {
        field: "create_time",
        headerName: ColumnItems.create_time.name,
        type: "string",
        width: 100
    },
    {
        field: "update_time",
        headerName: ColumnItems.update_time.name,
        type: "string",
        width: 100
    },
    {
        field: "messages_count",
        headerName: ColumnItems.messages_count.name,
        type: "number",
        width: 70
    },
    {
        field: "characters",
        headerName: ColumnItems.characters.name,
        type: "number",
        width: 100
    },
    {
        field: "status",
        headerName: ColumnItems.status.name,
        type: "string",
    },
    {
        field: "language",
        headerName: ColumnItems.language.name,
        type: "string"
    },

]

export default function ChatLogs(){

    const {data: session, status} = useSession();
    const username = session?.user?.name || "";

    const [chatLog, setChatLog] = useState(chatLogStore.sample);
    const [rows, setRows] = useState(chatLogsData.rows);
    const [isLoading, setIsLoading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({page: 0, pageSize: 100});

    const [filters, setFilters] = useState(chatLogsData.filters);

    const [chatLogStatus, setChatLogStatus] = useState(chatLogStore.sample.status);
    const [logMessage, setLogMessage] = useState("");

    function updateFilters(newFilters: any[]){
        chatLogsData.filters = newFilters;
        setFilters(newFilters);
    }

    function updateRows(newChatLog: any){
        rows.forEach((row: any, index: number) => {
            if (row.id == newChatLog._id){
                setRows([...rows.slice(0, index), convertChatLogToRow(newChatLog), ...rows.slice(index+1)]);
            }
        });
    }

    function refreshRows() {
        setIsLoading(true);

        chatLogsData.fetchTotalCount().then((data: any) => {
            setRowCount(data.total_count);
        });

        chatLogsData.fetchRows(paginationModel.page, paginationModel.pageSize).then((data: any)=>{
            let _rows: {[index: string]: any}[] = [];

            data.forEach((chatLog: any, index:number) => {
                _rows.push(convertChatLogToRow(chatLog));
            });

            chatLogsData.rows = _rows;
            setRows(_rows);

            setIsLoading(false);
        });
    }

    useEffect(() => {

        chatLogsData.filters = filters;
        refreshRows();
    }, [paginationModel, filters]);

    function handleRowSelection(newSelection: any){
        rows.forEach((row: any) => {
            if (row.id == newSelection[0]){
                chatLogStore.sample = row.chatLog;
                setChatLog(row.chatLog);

                setChatLogStatus(row.chatLog.status);
                setLogMessage("");

                console.log("[Select ChatLog]", row.chatLog);
            }
        })
    }

    async function handleChatLogStatusChange(e: any){

        let status = e.target.value;
        if (status == "发送修改" || status == "发送验证"){
            status = "已发送";
        }

        if (chatLogStore.sample.status == status){
            return;
        }
        chatLogStore.sample.status = status;

        let verified = false;
        if (e.target.value == "发送验证"){
            verified = true;
        }
        // const resData = await requestUpdateChatLog(chatLogStore.sample, isVerified, username);
        // const resData = await chatLogStore.requestUpdateSample(chatLogStore.sample, isVerified, username);
        chatLogStore.sample.verified = verified;
        const resData = await chatLogStore.requestUpdateSample(chatLogStore.sample, "status", username, {});

        console.log(resData);

        if (resData.status == 200){
            updateRows(chatLogStore.sample);
            setChatLog(chatLogStore.sample);
            setChatLogStatus(chatLogStore.sample.status);
            setLogMessage(`[${new Date().toLocaleString()}] ${resData.message}`);
        }
    }

    return (
        <Grid container sx={{width: '100%'}} spacing={2}>
            <Grid xs={12} md={6} sx={{overflow: "auto", height: "100vh"}}>

                <Filters filters={filters} availableFilterTypes={chatLogsData.availableFilterTypes} updateFilters={updateFilters} />

                <Box sx={{marginLeft: 2, height: 50}}>
                    <IconButton aria-label="refresh" sx={{marginLeft: "auto", marginRight: 1, float:"right"}} onClick={
                        ()=>{
                            refreshRows();
                        }}>
                        <RefreshIcon />
                    </IconButton>
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

            <Grid xs={12} md={6} sx={{overflow: "auto", height: "100vh"}}>
                {chatLog.messages == undefined && chatLog.messages == undefined ? (
                    <Alert severity="info">
                        没有选择ChatLog
                    </Alert>
                ):(
                    <Box>

                        <Checkbox
                            checked={chatLogStatus == "待处理"}
                            onChange={handleChatLogStatusChange}
                            value="待处理"
                        />
                        <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>待处理</span>

                        <Checkbox
                            checked={chatLogStatus == "已删除"}
                            onChange={handleChatLogStatusChange}
                            value="已删除"
                        />
                        <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>删除</span>

                        <Checkbox
                            checked={chatLogStatus == "已发送"}
                            onChange={handleChatLogStatusChange}
                            value="发送修改"
                        />
                        <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>发送并修改</span>

                        <Checkbox
                            checked={chatLogStatus == "已发送"}
                            onChange={handleChatLogStatusChange}
                            value="发送验证"
                        />
                        <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>发送并验证</span>

                        <p style={{color: "gray", fontSize: "12px", height: "15px", marginLeft: "1em", marginBottom: "-2em"}}>{logMessage}</p>

                        <Chatbox chatboxType={ChatboxType.chat_logs} config={{}}
                                 sample={chatLog} prompt={chatLogStore.prompt}
                                 createEmptySample={()=>{}}
                                 updateSample={async ()=>{}} updatePrompt={async()=>{}}/>
                    </Box>

                )}
            </Grid>
        </Grid>
    )
}