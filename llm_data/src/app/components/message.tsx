import {use, useEffect, useState} from "react";
import {useSession} from "next-auth/react";

import Grid from '@mui/material/Unstable_Grid2';
import {Alert, Avatar, Box, Button, ButtonGroup, IconButton, ListItem, ListItemAvatar, TextField, Checkbox, Divider, Chip, Paper} from "@mui/material";
import {MenuItem, Menu, InputBase} from "@mui/material";
import {TextareaAutosize} from "@mui/base";

import {Markdown} from "@/app/components/markdown";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssistantIcon from "@mui/icons-material/Assistant";

import {chatCompletions} from "@/app/client/platforms/openai";
import {modelConfig, AvailableModels} from "@/app/constant";

import {ThumbUpOutlined, ThumbDownOutlined, ThumbUp, ThumbDown, Person} from "@mui/icons-material";

import {isMaintainer} from "@/app/utils/auth";
import styles from "./chatbox.module.scss";
import ToolsBox from "@/app/components/tools-box";
import ToolCallsBox from "@/app/components/tool-calls-box";
import {cleanUpMessages, createMessage} from "@/app/store/sample";
import {validateToolCall} from "@/app/utils/utils";
import {ChatboxType} from "@/app/types";

const icons: { [index: string]: any } = {
    user: <PersonIcon />,
    assistant: <AssistantIcon />,
    tool: <PersonIcon />
};

const backgroundColors: { [index: string]: any } = {
    user: "#FFFFFF",
    assistant: "#F7F7F8",
    tool: "#FFFFFF"
};

const avatarBackgroundColors: { [index: string]: any } = {
    user: "#5D4138",
    assistant: "#1BC37D",
    tool: "#FD71F8"
};

export default function MessageBox(props: {
    uid: string,
    chatboxType: ChatboxType,
    message: any, index: number, messages: any,
    promptTitle: string,
    editIndex: number, setEditIndex: Function,
    // updateMessage: Function,
    updateMessages: Function,
    // deleteMessage: Function,
    updatePrompt: Function,
}){

    const { data: session, status } = useSession();

    const messages = props.messages;
    const message = props.message;

    const editable = [ChatboxType.playground, ChatboxType.samples, ChatboxType.prompts].includes(props.chatboxType);
    const modelDisplayChatboxTypes = [ChatboxType.playground, ChatboxType.samples, ChatboxType.prompts, ChatboxType.chat_logs];

    const sampleChatboxTypes = [ChatboxType.samples, ChatboxType.prompts];
    const playgroundChatboxTypes = [ChatboxType.playground, ChatboxType.samples, ChatboxType.prompts]

    const [promptTitle, setPromptTitle] = useState(props.promptTitle);

    const [reference, setReference] = useState("");
    const [toolCallsReference, setToolCallsReference] = useState("");
    const [referenceStreaming, setReferenceStreaming] = useState(false);
    const [editContent, setEditContent] = useState("");

    // 当前message是否能保存
    const [saveDisabled, setSaveDisabled] = useState(true);
    
    const [name, setName] = useState(message.name);
    const [editTools, setEditTools] = useState<any[]>([]);
    const [editToolCalls, setEditToolCalls] = useState<any[]>([]);

    const [useTools, setUseTools] = useState(false);
    // const [useToolCalls, setUseToolCalls] = useState(false);

    const [referenceModel, setReferenceModel] = useState("gpt-4-1106-preview");
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState([]);
    const [searchStreaming, setSearchStreaming] = useState(false);
    const [answerWithSearch, setAnswerWithSearch] = useState(false);

    useEffect(() => {
        setPromptTitle(props.promptTitle);
    }, [props.promptTitle]);

    function packToolCalls(){
        let _editToolCalls: any[] = [];
        if (message.tool_calls != null && message.tool_calls.length > 0){

            message.tool_calls.forEach((tool_call: any, index: number) => {
                // 在messages中找出tool_call_id 等于 tool_call.id 的message
                let _message = messages.find((m: any) => m.tool_call_id == tool_call.id);

                let content = "";
                if (_message != undefined){
                    content = _message.content;
                }

                _editToolCalls.push({
                    id: tool_call.id,
                    type: "function",
                    function: {
                        name: tool_call.function.name,
                        arguments: tool_call.function.arguments
                    },
                    content: content
                })
            });
        }
        return _editToolCalls;
    }

    useEffect(() => {
        setName(message.name);

        setEditTools(message.tools);
        if (message.tools && message.tools.length > 0){
            setUseTools(true);
        }else{
            setUseTools(false);
        }

        setEditToolCalls(packToolCalls());

        setToolCallsReference("");

        setReference("");
        setReferenceStreaming(false);
    }, [props.message]);

    useEffect(() => {
        let valid = true;
        if (!useTools){
            if (editContent == ""){
                setSaveDisabled(true);
            }else{
                setSaveDisabled(false);
            }
            return;
        }

        if (editTools && editTools.length == 0){
            valid = false;
        }
        editToolCalls.forEach((tool_call: any, index: number) => {
            if (!validateToolCall(tool_call.id, tool_call.type, tool_call.function.name, tool_call.function.arguments, tool_call.content).status){
                valid = false;
                return;
            }
        });
        setSaveDisabled(!valid);
    }, [editToolCalls, useTools, editContent]);

    // 保存编辑内容
    function handleSaveClick(e: any) {
        console.log(editToolCalls, message.tool_calls);
        if ((editContent == message.content) && (name == message.name) && (editTools == message.tools) && (editToolCalls == message.tool_calls)) {
            console.log("无变化");
            props.setEditIndex(-1);
            return;
        }

        messages[props.index].content = editContent;
        messages[props.index].update_user = session?.user?.name||"";
        messages[props.index].update_time = new Date().getTime();
        messages[props.index].model = referenceModel;

        messages[props.index].vote = message.vote;

        messages[props.index].name = name;
        messages[props.index].tools = editTools;
        messages[props.index].tool_calls = editToolCalls;

        // 清理messages，删除原toolCalls中tool_call_id对应的message
        if (message.tool_calls && message.tool_calls.length > 0){

            let _messages = messages;
            message.tool_calls.forEach((tool_call: any, index: number) => {
                _messages = _messages.filter((message: any) =>
                    message.tool_call_id == undefined || message.tool_call_id != tool_call.id);
            });
            let toolMessages: any[] = [];

            editToolCalls.forEach((tool_call: any, index: number) => {

                toolMessages.push(createMessage("tool", tool_call.content, "", session?.user?.name||"",
                    tool_call.function.name, undefined, undefined, tool_call.id));
            });

            _messages = [..._messages.slice(0, props.index+1), ...toolMessages, ..._messages.slice(props.index+1)];

            _messages = cleanUpMessages(_messages);
            props.updateMessages(_messages);
        }else{
            let _messages = cleanUpMessages(messages);
            props.updateMessages(_messages);
        }

        props.setEditIndex(-1);
    }

    function handleDelete(index: number){
        messages.splice(index, 1);
        let _messages = cleanUpMessages(messages);

        props.updateMessages(_messages);
    }

    function handleThumbUp(e: any){
        if (message.vote == 1){
            messages[props.index].vote = 0;
        }else{
            messages[props.index].vote = 1;
        }
        props.updateMessages([...messages]);

    }

    function handleThumbDown(e: any){
        if (message.vote == -1){
            messages[props.index].vote = 0;
        }else{
            messages[props.index].vote = -1;
        }
        props.updateMessages([...messages]);

    }

    // LLM生成参考
    function handleLLM(e: any) {
        let model = referenceModel.toLowerCase();
        if (model == "gpt-3.5") {
            model = "gpt-3.5-turbo";
        }

        // 选取截止到editContent.index-1的所有messages
        let sendMessages = messages.slice(0, props.index);

        if (answerWithSearch && searchResult.length > 0){
            if (model.startsWith("gpt")) {
                let searchReference: any[] = [];
                searchResult.forEach((item: any, index: number) => {
                    searchReference.push({
                        title: item.title,
                        content: item.content,
                    });
                });

                sendMessages.push({
                    role: "assistant",
                    content: "",
                    function_call: {
                        name: "search",
                        arguments: JSON.stringify({query: messages[props.index - 1].content, top_k: 8})
                    }
                });
                sendMessages.push({
                    role: "function",
                    name: "search",
                    content: JSON.stringify(searchReference)
                });
            } else {
                let content = "";
                sendMessages.forEach((item: any, index: number) => {
                    content += `{"role": "${item.role}", "content": "${item.content}"}\n`
                });
                sendMessages = [{
                    role: "user",
                    content: `历史对话: \n\n${content}\n\n搜索结果: \n\n${JSON.stringify(searchResult)}\n\n请根据搜索结果，回答用户问题: ${messages[messages.length-1].content}`
                }]
            }
        }

        setReferenceStreaming(false);

        // 判断是否使用工具
        let tools;
        if (useTools) {
            tools = editTools;
        }
        chatCompletions({
            messages: sendMessages,
            tools: tools,
            config: {...modelConfig, model: model, stream: true},
            onUpdate(message, chunk, toolCalls) {
                setReference(message);
                if (toolCalls.length > 0) {
                    setToolCallsReference(JSON.stringify(toolCalls));
                } else {
                    setToolCallsReference("");
                }
            },
            onFinish(message, toolCalls) {
                setReference(message);
                setToolCallsReference("");
                setEditToolCalls(toolCalls);
                setReferenceStreaming(true);
            },
            onError(error) {
                console.log(error);
            },
            onController(controller) {
                console.log(controller);
            }
        });

    }

    async function handleSearch(e: any){
        setSearchStreaming(true);
        // const query = messages[props.index-1].content;
        const response = await fetch("/api/tools/search", {
            method: "POST",
            body: JSON.stringify({query: searchQuery, top_k: 8}),
            headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (data.status == 200){
            // setAnswerWithSearch(true);
            setSearchStreaming(false);
            setSearchResult(data.results);
        }
    }

    const css = {
        width: '100%',
        background: backgroundColors[message.role],
        paddingTop: "1.5em",
        paddingBottom: "1.5em",
        borderBottom: "1px solid #E1E1E2"
    };

    return (
    <ListItem sx={css}>
        {/* Message */}

        <ListItemAvatar sx={{ alignSelf: "flex-start" }}>
            <Avatar sx={{ background: avatarBackgroundColors[message.role] }}>
                {icons[message.role]}
            </Avatar>
        </ListItemAvatar>

        <Grid container spacing={2} columns={12} sx={{width: "100%"}}>
            <Grid xs={editable ? 11 : 12} md={editable ? 11 : 12}>
                <Box sx={{ width: "100%"}}>{
                    props.editIndex == props.index ? (
                        <Box>
                            {/* ========================================== 编辑框 ========================================== */}

                            {/* 编辑 Name */}
                            {message.name && (
                                <TextField size="small" inputProps={{style: {fontSize: 12}}} sx={{margin: "5px 0px 5px 0px"}} value={name} label={"Name"} onChange={(e: any)=>{
                                    setName(e.target.value);
                                }} />
                            )}
                            
                            {/* 编辑 Content */}
                            <TextareaAutosize
                                color='primary'
                                className={styles["edit-textarea"]}
                                // defaultValue={message.content}
                                value={editContent || ""}
                                placeholder={"请输入"+message.role+"..."}
                                onChange={(e: any)=>{
                                    setEditContent(e.target.value);
                                }}
                            />

                            {/* 参考回复 */}
                            <Markdown content={reference} />

                            {/* 参考ToolCalls */}
                            {toolCallsReference != "" && (<Markdown content={toolCallsReference} />)}
                            
                            {/* 按钮 */}
                            <Box sx={{marginTop: "1em", height: "40px"}}>
                                <ButtonGroup>
                                    <Button variant="outlined" color="primary" size="small" value={props.index} disabled={saveDisabled} onClick={handleSaveClick}>
                                        保存
                                    </Button>

                                </ButtonGroup>

                                {message.role == "assistant" && sampleChatboxTypes.includes(props.chatboxType) && (
                                    <Button sx={{marginLeft: "5px"}} variant="outlined" color="success" size="small" disabled={!(reference != "" && referenceStreaming)} onClick={()=>{
                                        if (reference == "") {
                                            return;
                                        }
                                        setEditContent(reference);
                                    }}>
                                        应用参考
                                    </Button>
                                )}

                                {message.role == "assistant" && sampleChatboxTypes.includes(props.chatboxType) &&
                                    <Box sx={{float: "right", marginTop: "-5px"}}>
                                        <Checkbox sx={{marginLeft: "-10px"}} checked={useTools}
                                                  onChange={(e: any)=>{
                                                        setUseTools(e.target.checked);
                                                  }} />
                                        <span style={{color: "gray", fontSize: '0.8em', marginLeft: "-5px"}}>使用工具</span>
                                    </Box>}

                            </Box>
                                
                            {/* 编辑 Tools */}
                            <Box>
                                {message.role == "assistant" && sampleChatboxTypes.includes(props.chatboxType) && useTools ? (
                                    <Box sx={{marginTop: "10px"}}>
                                        <ToolsBox tools={editTools} updateTools={setEditTools} />
                                    </Box>) : <Box></Box>
                                }
                            </Box>

                            {/* 编辑 Tool Calls */}
                            {useTools && sampleChatboxTypes.includes(props.chatboxType) &&
                                <ToolCallsBox editToolCalls={editToolCalls} updateEditToolCalls={setEditToolCalls} />
                            }

                            {/* Reference Model */}
                            {message.role == "assistant" && sampleChatboxTypes.includes(props.chatboxType) ?
                                <Box sx={{ marginTop: "0.2em"}}>

                                    <Box sx={{width: "100%"}}>
                                        {/* ---------------------------------- Reference Models ---------------------------------- */}
                                        <Button
                                            sx={{float: "right", color: "gray", minWidth: "10px"}}
                                            variant='text' size="small" aria-label="more" id="long-button"
                                            aria-controls={open ? 'long-menu' : undefined} aria-expanded={open ? 'true' : undefined}
                                            aria-haspopup="true"
                                            onClick={(e: any)=>{setAnchorEl(e.currentTarget)}}
                                        >
                                            <MoreVertIcon sx={{width: "20px", m:0, p:0}}/>
                                        </Button>
                                        <Menu
                                            id="long-menu"
                                            MenuListProps={{'aria-labelledby': 'long-button'}} anchorEl={anchorEl} open={open}
                                            onClose={()=>{setAnchorEl(null)}}
                                        >
                                            {AvailableModels.map((model, index)=>(
                                                <MenuItem key={model} selected={false} onClick={()=>{
                                                    setReferenceModel(model);
                                                    setAnchorEl(null);
                                                }}>
                                                    {model}
                                                </MenuItem>
                                            ))}
                                        </Menu>
                                        
                                        {/* ---------------------------------- Reference Model Button ---------------------------------- */}
                                        <ButtonGroup sx={{float: "right" }} >
                                            <Button variant='outlined' color="success" size="small" onClick={handleLLM} value={"LLM"}
                                                    disabled={!referenceStreaming && reference != ""}>
                                                {referenceModel}
                                            </Button>
                                        </ButtonGroup>
                                        
                                        {/* ---------------------------------- Use Search Result Checkbox ---------------------------------- */}
                                        <Box sx={{float: "right"}}>
                                            <span style={{fontSize: "12px", color: "gray"}}>使用搜索结果</span>
                                            <Checkbox size="small" checked={answerWithSearch} disabled={!(searchResult.length > 0 && isMaintainer(session))} onChange={(e: any)=>{setAnswerWithSearch(e.target.checked)}} />
                                        </Box>

                                    </Box>

                                    <Paper component="form" sx={{ p: '2px 4px', marginTop: "22px", display: 'flex', alignItems: 'center', width: "100%", height: "32px", backgroundColor: "transparent"}}>
                                        <InputBase sx={{ ml: 1, flex: 1 }} placeholder="搜索..." inputProps={{ 'aria-label': 'search', style: {fontSize: "13px", color: "#252525"} }} 
                                            onChange={(e: any)=>{
                                                setSearchQuery(e.target.value);
                                            }} value={searchQuery} />
                                        <Divider sx={{ height: 28}} orientation="vertical" />
                                        <IconButton type="button" sx={{ p: '10px' }} aria-label="search" onClick={handleSearch} disabled={searchStreaming}>
                                            <SearchIcon />
                                        </IconButton>
                                    </Paper>

                                    {searchResult.length > 0 ? (
                                        <Box sx={{marginTop: 1}}>
                                            <Box>
                                                {searchResult.map((item: any, index: number)=>(
                                                    <Box key={index} sx={{marginTop: "1em", fontSize: "13px"}}>
                                                        <a href={item.url} target={"_blank"} style={{color:"revert", textDecoration: "revert"}}>{item.title}</a>
                                                        <p style={{color: "#454545"}}>{item.content}</p>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    ) : <Box></Box>}

                                </Box>
                                : <Box></Box>
                            }
                        </Box>
                    ) :
                    <Box sx={{width: "100%", minHeight: "20px"}}>
                        {/* ========================================== 非编辑显示 ========================================== */}

                        <Box sx={{marginTop: "2px"}}>

                            {/* Name */}
                            {message.name && <Box sx={{fontSize: "14px", color: "gray"}}>
                                {message.name}
                            </Box>}

                            {/* Content */}
                            <Markdown content={message.content} />
                            
                            {/* Tools Calls */}
                            {(message.tool_calls && message.tool_calls.length > 0) && <Box>
                                {message.tool_calls.map((tool_call: any, index: number)=> 
                                    <Box key={index} sx={{marginTop: "5px"}}>
                                        <p style={{fontSize: "14px", color: "gray"}}>{tool_call.function.name}</p>
                                        <Markdown content={tool_call.function.arguments} />
                                    </Box>
                                )}
                                </Box>
                            }
                            
                            {/* Tools */}
                            {message.tools && message.tools.length > 0 ? (
                                <Box sx={{marginTop: "5px"}}>
                                    <Chip size="small" label="Tools" sx={{marginRight: "5px"}} />
                                </Box>
                            ): <></>}
                        </Box>

                        {/* Prompt保存 */}
                        <Box>
                        {
                            message.role == "system" && props.index == 0 ?
                            <Box sx={{marginTop: "2em"}}>
                                <TextField size="small" inputProps={{style: {fontSize: 12}}} sx={{width: "12em"}}
                                    placeholder="Prompt标题"  value={promptTitle}
                                    onChange={(e: any)=>{setPromptTitle(e.target.value)}}>
                                </TextField>
                                <Button variant="outlined" color="success" size="small" sx={{marginLeft: "2em", height: "2.8em", fontSize: "12px"}}
                                    onClick={(e: any)=>{props.updatePrompt(props.index, promptTitle);}} >
                                    创建&更新 Prompt
                                </Button>
                                <Alert sx={{marginTop: 1}} severity="info">对于Prompt的任何改动都需要点击 “创建&更新 PROMPT”</Alert>
                            </Box>
                            : <Box></Box>
                        }
                        </Box>
                    </Box>}

                    {/* ========================================== 点踩点赞 ========================================== */}
                    {message.role == "assistant" && modelDisplayChatboxTypes.includes(props.chatboxType)?
                        <Box sx={{float: "right", display: "flex", flexDirection: "column", justifyContent: "flex-end",
                                marginRight: "0px", height: "10px"}}>
                            <Box sx={{marginBottom: "-30px"}}>
                                <span style={{fontSize: "12px", color: "gray", marginRight: "10px"}}>{message.model}</span>
                                <IconButton sx={{marginRight: "-5px"}} onClick={handleThumbUp}>
                                    {message.vote < 1 ? <ThumbUpOutlined sx={{width: "15px"}} /> : <ThumbUp sx={{width: "15px"}} />}
                                </IconButton>
                                <IconButton onClick={handleThumbDown}>
                                    {message.vote > -1 ? <ThumbDownOutlined sx={{width: "15px"}} /> : <ThumbDown sx={{width: "15px"}} />}
                                </IconButton>
                            </Box>

                        </Box>: null}

                </Box>
            </Grid>
            {editable ?
            <Grid xs={1} md={1}>
                {message.role != "tool" &&
                    <Box sx={{alignSelf: "flex-start", marginTop: "-5px"}}>

                        {/* 编辑按钮 */}
                        <ButtonGroup>
                            <IconButton aria-label="edit" onClick={()=>{
                                props.setEditIndex(props.index);

                                if (message.role == "assistant"){
                                    setReference("");
                                    setReferenceStreaming(false);

                                    if (props.index > 0 && messages[props.index-1].content != undefined) {
                                        setSearchQuery(messages[props.index-1].content.substring(0, 26));
                                    }
                                    setAnswerWithSearch(false);
                                    setSearchResult([]);
                                    setSearchStreaming(false);
                                }

                                setEditContent(message.content);
                            }}>
                                <EditIcon className={styles["edit-icon"]} />
                            </IconButton>

                        </ButtonGroup>
                        <ButtonGroup>
                        {
                            // 只有当前选择的message才显示删除按钮
                            props.index == props.editIndex ? (
                                <IconButton aria-label="delete" value={props.index} onClick={()=>{
                                    // props.deleteMessage(props.index);
                                    handleDelete(props.index);
                                    props.setEditIndex(-1);
                                }}>
                                    <DeleteIcon className={styles["edit-icon"]} />
                                </IconButton>
                            ) : (<div></div>)
                        }
                        </ButtonGroup>
                    </Box>
                }

            </Grid> : null}
        </Grid>

    </ListItem>
    )
}