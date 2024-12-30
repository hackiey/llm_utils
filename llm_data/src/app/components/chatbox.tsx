import * as React from 'react';
import {useEffect, useState} from 'react';
import {Theme, useTheme} from '@mui/material/styles';
import {TextareaAutosize} from '@mui/base';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    InputLabel,
    List,
    MenuItem,
    OutlinedInput,
    Select
} from '@mui/material';

import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import styles from "./chatbox.module.scss";
import {Markdown} from "@/app/components/markdown";

import {chatCompletions} from "@/app/client/platforms/openai";
import {AvailableModels, ColumnItems, modelConfig} from '@/app/constant';
import {useSession} from 'next-auth/react';
import MessageBox from "@/app/components/message";
import {isMaintainer} from "@/app/utils/auth";
import {ChatboxType} from "@/app/types";
import {createEmptySample, createMessage} from "@/app/store/sample";
import ToolsBox from "@/app/components/tools-box";

function getStyles(name: string, personName: readonly string[], theme: Theme) {
    return {
        fontWeight:
            personName.indexOf(name) === -1
                ? theme.typography.fontWeightRegular
                : theme.typography.fontWeightMedium,
    };
}

function CategoryMultipleSelects(props: {category: string, selects: string[], setSelects: Function, updateMeta: Function, multiple: boolean}){
    const theme = useTheme();

    const width = 130;
    const [categoryItems, setCategoryItems] = useState<string[]>(ColumnItems[props.category].items);

    const handleChange = (event: any) => {
        const {
            target: { value },
        } = event;

        const values = typeof value === 'string' ? value.split(',') : value;

        let _value = values;
        // 单选
        if (props.category == "difficulty"){
            _value = values[0];
        }

        props.updateMeta(props.category, _value).then((data: any)=>{
            props.setSelects(values);
        });
    };

    let menuItems: any = [];

    categoryItems.forEach((item) => {
        menuItems.push(
            <MenuItem
                key={"label_"+item}
                value={item}
                style={getStyles(item, categoryItems, theme)}
            >
                {item}
            </MenuItem>
        )
    });

    return (
        <FormControl sx={{ m: 1, width: width+"px"}}>
            <InputLabel id="demo-multiple-chip-label">{ColumnItems[props.category].name}</InputLabel>
            <Select
                labelId="demo-multiple-chip-label"
                id="demo-multiple-chip"
                multiple={props.multiple}
                value={props.selects}
                onChange={handleChange}
                input={<OutlinedInput id="select-multiple-chip" label="chip" />}
                renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value: any) => (
                            <Chip key={value} label={value} />
                        ))}
                    </Box>
                )}
            >
                {menuItems}
            </Select>
        </FormControl>
    );
}

export default function Chatbox(props: {
    chatboxType: ChatboxType, config: any,
    sample: any, prompt: any,
    createEmptySample: Function,
    updateSample: Function, updatePrompt: Function }) {

    const { data: session, status } = useSession();
    const username = session?.user?.name || "";

    const sampleChatboxTypes = [ChatboxType.samples, ChatboxType.prompts];
    const playgroundChatboxTypes = [ChatboxType.playground]
    const inputChatboxTypes = [ChatboxType.playground, ChatboxType.samples, ChatboxType.prompts]

    const [logMessage, setLogMessage] = useState("");

    // 展示
    const [messages, setMessages] = useState(props.sample.messages);
    const [taskSelects, setTaskSelects] = useState<string[]>(props.sample.tasks);
    const [tagSelects, setTagSelects] = useState<string[]>(props.sample.tags);
    const [difficultySelects, setDifficultySelects] = useState<string[]>([props.sample.difficulty]);

    const [editIndex, setEditIndex] = useState(-1);

    // 输入
    const [inputRole, setInputRole] = useState("user");
    const [inputContent, setInputContent] = useState("");
    const [inputModel, setInputModel] = useState(props.config.model || "gpt-4o");

    const [useTools, setUseTools] = useState<boolean>(false);
    const [tools, setTools] = useState<any[]>([]);

    const [assistantContent, setAssistantContent] = useState("");
    const [toolCallsReference, setToolCallsReference] = useState("");

    async function updateSample(dtype: string) {
        props.updateSample(props.sample, dtype, username).then((data: any)=>{
            if (sampleChatboxTypes.includes(props.chatboxType) && data.message != ""){
                setLogMessage("[" + new Date().toLocaleTimeString() + "] [" + data.user + "] " + data.message);
            }
        });
    }

    async function updateMeta(category: string, selects: string[]){
        props.sample[category] = selects;
        return await updateSample("meta");
    }

    async function updateMessages(messages: any[]){
        props.sample.messages = messages;
        setMessages(messages);

        console.log("[Update Messages]", messages);
        return await updateSample("messages");
    }

    async function updatePrompt(index: number, title: string){

        const promptMessages = props.sample.messages.slice(0, index + 1);
        console.log(promptMessages);
        if (title == "" || promptMessages.length == 0 || promptMessages[0].content == ""){
            setLogMessage("[" + new Date().toLocaleTimeString() + "] [" + (session?.user?.name||"") + "] " + "Prompt标题和内容不能为空");

        } else{

            props.prompt.title = title;
            props.prompt.messages = promptMessages;
            props.prompt.tasks = taskSelects;
            props.prompt.tags = tagSelects;
            props.prompt.difficulty = difficultySelects[0];

            const resData = await props.updatePrompt(props.prompt, username);
            setLogMessage("[" + new Date().toLocaleTimeString() + "] [" + resData.user + "] " + resData.message);
        }
    }

    useEffect(() => {
        setMessages(props.sample.messages);

        setTaskSelects(props.sample.tasks);
        setTagSelects(props.sample.tags);
        setDifficultySelects([props.sample.difficulty]);

        setUseTools(false);

        // 判断是否为新建PROMPT
        if (props.sample._id == undefined && props.prompt._id == undefined && props.prompt.messages != undefined &&
            props.prompt.messages.length > 0 && props.prompt.messages[0].content == ""){
            setEditIndex(0);
        }else{
            setEditIndex(-1);
        }
        setLogMessage("");

    }, [props.sample, props.prompt]);

    function emptyChatbox(){
        setMessages([]);
        delete props.sample._id;
        props.sample.messages = [];
    }

    function handleSubmit(messages: any[], _tools?: any[]){
        if (messages.length == 0){
            return;
        }

        let model = inputModel;
        let system = [];
        if (playgroundChatboxTypes.includes(props.chatboxType)){
            model = props.config.model;
            if (props.config.instructions != ""){
                system.push(createMessage("system", props.config.instructions, "",
                    session?.user?.name||"", undefined, _tools, [], undefined));
            }
        }

        chatCompletions({
            messages: [...system, ...messages],
            tools: _tools,
            config: { ...modelConfig, model: model, stream: true },

            onUpdate(message: any, chunk: any, toolCalls: any[]) {
                setAssistantContent(message);
                if(toolCalls.length > 0){
                    setToolCallsReference(JSON.stringify(toolCalls));
                }else{
                    setToolCallsReference("");
                }
            },

            onFinish(message: any, toolCalls: any[]) {
                setAssistantContent("");

                messages.push(createMessage("assistant", message, model, session?.user?.name||"", undefined, _tools, toolCalls, undefined));
                setMessages(messages);

                props.sample.messages = messages;

                updateSample("messages");
            },
            onError(error: any) {
                console.log(error);
            },
            onController(controller: any) {
                console.log(controller);
            }
        });
    }

    // 提交输入
    function handleAddMessage(e: any){
        if (inputContent == "" && inputRole != "assistant"){
            return;
        }

        let _tools: any[] = [];
        if (useTools && tools.length > 0){
            _tools = tools.map((tool: any) => tool);
        }

        // 添加到message中并刷新
        if (inputRole == "user" && _tools && _tools.length > 0) {
            messages.push(createMessage(inputRole, inputContent, "", session?.user?.name || ""));
        }else if (inputRole == "function"){
            messages.push(createMessage(inputRole, inputContent, "", session?.user?.name||""));
        }else {
            messages.push(createMessage(inputRole, inputContent, "", session?.user?.name||""));
        }

        props.sample.messages = messages;
        setMessages(messages);

        updateSample("messages");

        setInputContent("");

        // 如果当前角色是user，返回assistant
        if (inputRole == "user"){
            handleSubmit(messages, _tools);
        }
    }

    const listMessages: any[] = [];
    messages.forEach((message: any, index: number) => {
        listMessages.push(
            <MessageBox key={"message_" + index} uid={props.sample.id}
                        chatboxType={props.chatboxType}
                        message={message} index={index} messages={messages}
                        promptTitle={props.prompt.title == undefined ? "" : props.prompt.title}
                        editIndex={editIndex} setEditIndex={setEditIndex}
                        updateMessages={updateMessages}
                        updatePrompt={updatePrompt}

            />
        );
    });

    return (
        <Box sx={{display: "flex", flexDirection: "column", height: "calc(100vh - 110px)"}}>

            <Box sx={{alignSelf: "flex"}}>
                {props.sample.tasks != undefined ? (
                    <Box sx={{display: "flex", width: "fit-content", alignItems: 'center'}}>
                        <CategoryMultipleSelects category={"tasks"} selects={taskSelects} setSelects={setTaskSelects} multiple={false} updateMeta={updateMeta} />
                        <CategoryMultipleSelects category={"tags"} selects={tagSelects} setSelects={setTagSelects} multiple={false} updateMeta={updateMeta} />
                        <CategoryMultipleSelects category={"difficulty"} selects={difficultySelects} setSelects={setDifficultySelects} multiple={false} updateMeta={updateMeta} />
                    </Box>
                ) : null}
                {props.sample._id != undefined && sampleChatboxTypes.includes(props.chatboxType) ? (
                    <Box>
                        <Box>
                            <Checkbox checked={props.sample.deleted == "已删除"} onChange={(e: any)=>{
                                props.sample.deleted = e.target.checked ? "已删除" : "未删除";
                                updateSample("deleted");
                            }}/>
                            <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>删除</span>

                            {isMaintainer(session) ? (
                                <>
                                    <Checkbox checked={props.sample.data_type == "test"} onChange={(e: any)=>{
                                        props.sample.data_type = e.target.checked ? "test" : "train";
                                        updateSample("data_type");
                                    }} />
                                    <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>测试</span>
                                </>) : null}

                            <Checkbox checked={props.sample.marked == "已标记"} onChange={(e: any) => {
                                props.sample.marked = e.target.checked ? "已标记" : "未标记";
                                updateSample("marked");
                            }} />
                            <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>标记</span>

                            <Checkbox checked={props.sample.verified == "已验证"} onChange={(e: any)=>{
                                props.sample.verified = e.target.checked ? "已验证" : "未验证";
                                updateSample("verified");
                            }} />
                            <span style={{color: "gray", fontSize: "0.8em"}}>验证</span>
                        </Box>

                        {isMaintainer(session) ?
                            <Box>
                                <Checkbox checked={props.sample.inspection == "已通过"} onChange={(e: any) => {
                                    props.sample.inspection = e.target.checked ? "已通过" : "待质检";
                                    updateSample("inspection");
                                }} />
                                <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>通过</span>
                                <Checkbox checked={props.sample.inspection == "待返修"} onChange={(e: any) => {
                                    props.sample.inspection = e.target.checked ? "待返修" : "待质检";
                                    updateSample("inspection");
                                }} />
                                <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>返修</span>
                            </Box> : null}
                    </Box>
                ) : (<Box></Box>)}

                {/* Clear */}
                {playgroundChatboxTypes.includes(props.chatboxType) &&
                    <Box sx={{height: "40px"}}>
                        <Button sx={{float: "right"}} variant="outlined" size="small" onClick={emptyChatbox}>Clear</Button>

                        <Button sx={{float: "right", marginRight: "20px"}} variant='outlined' color={"success"} size="small" onClick={()=>{
                                        handleSubmit(props.sample.messages, undefined);
                                    }}>运行</Button>
                    </Box>}

                {/* Log Message */}
                {playgroundChatboxTypes.includes(props.chatboxType) ? <></> :
                    <span style={{color: "gray", fontSize: "12px", height: "15px", marginLeft: "1em"}}>{logMessage}</span>}

            </Box>

            {/* messages */}
            <Box>
                <List sx={{ width: '100%' }}>
                    {listMessages}
                    <Box sx={{p: 1}}>
                        <Markdown content={assistantContent} />
                    </Box>
                </List>
            </Box>

            {inputChatboxTypes.includes(props.chatboxType) &&
                <Box sx={{marginTop: "auto"}}>
                    <Grid container spacing={1} sx={{marginTop: 1.5}}>
                        <Grid xs={2} md={2} >
                            <FormControl variant="standard" sx={{ m: 1, width: "80%"}}>
                                <InputLabel id="demo-simple-select-standard-label">Role</InputLabel>
                                <Select
                                    labelId="demo-simple-select-standard-label"
                                    id="demo-simple-select-standard"
                                    value={inputRole}
                                    onChange={(e: any)=>{setInputRole(e.target.value)}}
                                    label="InputRole"
                                >
                                    <MenuItem value={"user"}>user</MenuItem>
                                    <MenuItem value={"assistant"}>assistant</MenuItem>

                                    {sampleChatboxTypes.includes(props.chatboxType) &&
                                        <MenuItem value={"system"}>system</MenuItem>}
                                </Select>
                            </FormControl>

                        </Grid>
                        <Grid xs={8} md={8}>
                            <TextareaAutosize style={{ marginTop: "1em", width: "100%"}} color="primary" className={styles["edit-textarea"]}
                                value={inputContent} onChange={(e: any)=>{setInputContent(e.target.value)}}
                            ></TextareaAutosize>

                            {/* ToolsBox || ToolCallsBox */}
                            {sampleChatboxTypes.includes(props.chatboxType) && false &&
                                <Box sx={{width: "100%"}}>
                                    <Box sx={{width: "100%", height: "40px"}}>
                                        {inputRole == "user" && <>
                                            <span style={{float: "right", color: "gray", fontSize: "0.8em", margin: "0.8em 1em 0em 0em"}}>使用工具</span>
                                            <Checkbox sx={{float: "right"}} checked={useTools} onChange={(e: any)=>{
                                                setUseTools(e.target.checked);
                                            }} />
                                        </>}
                                    </Box>

                                    {useTools && inputRole == "user" &&
                                        <ToolsBox tools={tools} updateTools={setTools} />}

                                </Box>}

                        </Grid>

                        <Grid xs={2} md={2}>
                            {
                                sampleChatboxTypes.includes(props.chatboxType) && inputRole == "user" ? (
                                    <Box sx={{height: 25}}>
                                        <FormControl variant="standard" sx={{marginTop: -2.5, marginBottom: 1, float: "right"}}>
                                            <Select
                                                labelId="demo-simple-select-standard-label"
                                                id="demo-simple-select-standard"
                                                value={inputModel}
                                                onChange={(e: any)=>{setInputModel(e.target.value)}}
                                                label="InputModel"
                                            >
                                                {AvailableModels.map((model: string, index: number)=>(
                                                    <MenuItem key={model} value={model}>{model}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                ) : (<Box sx={{height: 25}}></Box>)
                            }

                            <Button variant={"outlined"} sx={{float: "right", width: "100%"}} onClick={handleAddMessage}>添加</Button>

                        </Grid>

                        {/*{sampleChatboxTypes.includes(props.chatboxType) && props.sample._id == undefined ? (*/}
                        {/*    <Alert sx={{width: "100%"}} severity="info">*/}
                        {/*        1. 选择user并添加，会自动触发assistant回复<br/>*/}
                        {/*        2. 只有包含assistant信息的对话会被保存<br/>*/}
                        {/*        3. source=labeling*/}
                        {/*    </Alert>*/}
                        {/*    ) : (<Box></Box>)}*/}
                    </Grid>
                </Box>
            }
        </Box>
    )
}
