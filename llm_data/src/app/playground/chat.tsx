import * as React from "react";
import {useEffect, useState} from "react";

import {Box, Button, IconButton, InputBase, MenuItem, Paper, Select, List, ListItem, Chip, Tab} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import {TextareaAutosize} from "@mui/base";
import chatbox_styles from "@/app/components/chatbox.module.scss";
import playground_styles from "@/app/playground/playground.module.scss";
import {AvailableModels} from "@/app/constant";

import Chatbox from "@/app/components/chatbox";
import {ChatboxType} from "@/app/types";
import {playgroundChatLogStore, createEmptyChatLog} from "@/app/store/chat-log";
import {createMessage} from "@/app/store/sample";
import {hasAssistant} from "@/app/utils/utils";
import {v4 as uuidv4} from "uuid";


export function ChatApp(){

    // const [tabValue, setTabValue] = useState('1');

    const [sample, setSample] = useState<any>(playgroundChatLogStore.sample);
    const [config, setConfig] = useState<any>(playgroundChatLogStore.config);

    const [chatLogsData, setChatLogsData] = useState<any[]>([]);
    const [selectedChatLogId, setSelectedChatLogId] = useState<string>("");

    useEffect(() => {
        let _chatLogsData: any[] = [];
        const chatLogsDataJson = localStorage.getItem("chatLogsData");

        if (chatLogsDataJson != null){
            _chatLogsData = JSON.parse(chatLogsDataJson);

            if (_chatLogsData.length > 0) {
                setChatLogsData(_chatLogsData);
            }
        }

    }, []);

    async function setChatLog(selectedChatLogId: string){
        const chatLogData = await playgroundChatLogStore.requestRetrieveChatLog(selectedChatLogId);
        const newSample = chatLogData.chat_log;

        let model = config.model;
        if (newSample.messages.length > 0 && newSample.messages[newSample.messages.length-1].model != ""){
            model = newSample.messages[newSample.messages.length-1].model;
        }

        if (newSample.messages.length > 0 && newSample.messages[0].role == "system") {
            setConfig({...config, instructions: newSample.messages[0].content, model: model});
            newSample.messages = newSample.messages.slice(1);
        }else{
            setConfig({...config, model: model, instructions: ""});
        }

        setSample(newSample);
        playgroundChatLogStore.sample = newSample;
    }

    useEffect(() => {

        if (selectedChatLogId != ""){
            setChatLog(selectedChatLogId);
        }
    }, [selectedChatLogId]);

    async function updateSample(newSample: any, dtype: string, username: string){
        let system = [];
        if (config.instructions && config.instructions != ""){
            system.push(createMessage("system", config.instructions, "",
                    username, undefined, undefined, [], undefined));
        }

        const messages = [...system, ...newSample.messages];

        if (playgroundChatLogStore.sample._id == undefined){

            if (hasAssistant(newSample.messages)){
                newSample.session_id = uuidv4();

                const resData = await playgroundChatLogStore.requestNewSample({
                    ...newSample,
                    messages: messages
                });

                if (resData.status == 200){
                    playgroundChatLogStore.sample = newSample;
                    playgroundChatLogStore.sample._id = resData._id;
                }

                chatLogsData.unshift({
                    _id: resData._id,
                    update_time: new Date().toLocaleString(),
                    message: messages[0].content
                });
                // 只保留前100条
                chatLogsData.splice(100, chatLogsData.length-100);

                localStorage.setItem("chatLogsData", JSON.stringify(chatLogsData));

                setChatLogsData([...chatLogsData]);

                console.log("[New Chat Log]", resData, playgroundChatLogStore.sample);

                return resData;
            }
        }else{
            return await playgroundChatLogStore.requestUpdateSample(newSample, dtype, username, config);
        }
    }

    return <Grid container sx={{ width: "100%", height: "calc(100vh - 100px)"}} >

        <Grid xs={12} md={3} sx={{overflow: "auto", borderRight: "1px solid #e7e7e7"}}>

            <p className={playground_styles['title']} style={{marginTop: "2em"}}>Model*</p>
            <Select
                sx={{width: "90%"}}
                value={config.model}
                size={"small"}
                onChange={(e: any)=>{
                    setConfig({...config, model: e.target.value})
                    playgroundChatLogStore.config = {...config, model: e.target.value};
                }}
            >
                {AvailableModels.map((model: any, index: number)=>(
                    <MenuItem key={index} value={model}>{model}</MenuItem>
                ))}
            </Select>

            <p className={playground_styles['title']} style={{marginTop: "10px"}}>Instructions</p>
            <TextareaAutosize style={{ width: "90%", height: "calc(100% - 155px)", overflow: "auto"}} color="primary" className={chatbox_styles["edit-textarea"]}
                value={config.instructions} onChange={(e: any)=>{
                    setConfig({...config, instructions: e.target.value})
                    playgroundChatLogStore.config = {...config, instructions: e.target.value};
                }}
            ></TextareaAutosize>

        </Grid>

        <Grid xs={12} md={6} sx={{overflow: "auto", borderRight: "1px solid #e7e7e7"}}>
            <Box sx={{width: "90%", margin: "auto", height: "calc(100vh - 120px)"}}>

                <Chatbox chatboxType={ChatboxType.playground} config={config}
                         sample={playgroundChatLogStore.sample} prompt={playgroundChatLogStore.prompt}
                         createEmptySample={createEmptyChatLog}
                         updateSample={updateSample} updatePrompt={()=>{}}/>
            </Box>

        </Grid>

        <Grid xs={12} md={3}>

            <List className={"chat-history"}
                  sx={{width: '100%', bgcolor: 'background.paper', marginTop: "-20px", height: "calc(100vh - 100px)", overflow: "auto"}}>
                {
                    chatLogsData.map((chatLog: any, index: number)=>{
                        return <ListItem key={index} onClick={()=>{
                            setSelectedChatLogId(chatLog._id);
                        }}>
                            <Box sx={{borderBottom: "1px solid lightgray", width: "100%"}}>
                                <span style={{fontSize: "12px", color: "gray"}}>{chatLog.update_time}</span>
                                <p style={{fontSize: "14px", margin: "10px 0px 10px 10px", color: "#232323"}}>{chatLog.message}</p>
                            </Box>

                        </ListItem>
                    })
                }
            </List>
        </Grid>

    </Grid>
}