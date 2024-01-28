import {useState, useEffect} from "react";
import {
    Box,
    Chip,
    IconButton,
    TextField,
    Link,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button
} from "@mui/material";
import {TextareaAutosize} from "@mui/base";
import styles from "@/app/components/chatbox.module.scss";
import {AddCircleOutline, CheckCircleOutlined, RemoveCircleOutline} from "@mui/icons-material";
import * as React from "react";
import { randomBytes } from 'crypto';
import Dialog from "@mui/material/Dialog";

import {validateToolCall} from "@/app/utils/utils";

export function ToolCall(props: {index: number, editIndex: number, setEditIndex: Function, toolCall: any,
                                removeToolCall: Function, updateToolCall: Function}){

    const [toolCallId, setToolCallId] = useState("");
    const [toolType, setToolType] = useState("");
    const [functionName, setFunctionName] = useState("");
    const [functionArguments, setFunctionArguments] = useState("");
    const [functionArgumentsObj, setFunctionArgumentsObj] = useState<any>({});
    const [content, setContent] = useState("");

    const [alertOpen, setAlertOpen] = useState<boolean>(false);
    const [validateMessage, setValidateMessage] = useState<string>("");

    function handleClose(){
        setAlertOpen(false);
    }

    // 初始化
    useEffect(()=> {
        setToolCallId(props.toolCall.id);
        setToolType(props.toolCall.type);
        setFunctionName(props.toolCall.function.name);
        setFunctionArguments(props.toolCall.function.arguments);

        setContent(props.toolCall.content);

        try{
            setFunctionArgumentsObj(JSON.parse(props.toolCall.function.arguments));
        }catch (e) {
            setFunctionArgumentsObj({});
        }
    }, [props]);

    return <Box sx={{}}>
        <Box sx={{display: "flex", width: "100%"}}>
            <IconButton sx={{marginLeft: "0px", width: "30px"}} onClick={() => {
                props.removeToolCall(props.index);
            }}>
                <RemoveCircleOutline />
            </IconButton>

            <Box sx={{marginRight: "auto", textAlign: "left", width: "calc(100% - 80px)"}} onClick={()=>{props.setEditIndex(props.index)}}>
                <p style={{color: content==""||content==undefined?"red":"#565665", margin: "8px 0px 0px 10px", fontSize: "14px", fontWeight: "500"}}>
                    {functionName}({(Object.entries(setFunctionArgumentsObj).map(([key, value]) => `${key}=${value}`)).join(', ')})
                </p>
                <p style={{ color: content==""||content==undefined?"red":"#565665", margin: "0px 0px 10px 10px", fontSize: "13px"}}>
                    {props.toolCall.id}
                </p>
            </Box>

            {props.index == props.editIndex ?
                <IconButton sx={{width: "30px"}} onClick={()=>{
                    const validResult = validateToolCall(toolCallId, toolType, functionName, functionArguments, content);
                    if (validResult.status){
                        props.updateToolCall(props.index, {
                            id: toolCallId,
                            type: toolType,
                            function: {
                                name: functionName,
                                arguments: functionArguments
                            },
                            content: content
                        });
                    }else{
                        setValidateMessage(validResult.message);
                        setAlertOpen(true);
                    }
                }}>
                    <CheckCircleOutlined />
                </IconButton> : <></>}
        </Box>

        {props.index == props.editIndex && (
            <Box>
                <TextField sx={{width: "100%"}} inputProps={{style: {fontSize: "13px", color: "black"}}} size="small"
                           value={functionName} label={"function name"}
                           onChange={(e: any)=>{
                               setFunctionName(e.target.value);
                           }}/>

                <TextField sx={{width: "100%", margin: "10px 0px 10px 0px"}} inputProps={{style: {fontSize: "13px", color: "black"}}} size="small"
                           value={functionArguments} label={"function arguments"} onChange={(e: any)=>{
                               setFunctionArguments(e.target.value);
                           }} />

                <p style={{color: "gray", fontSize: "13px", marginBottom: "3px"}}>Function 执行结果</p>
                <TextareaAutosize
                    color='primary'
                    className={styles["edit-textarea"]}
                    // defaultValue={message.content}
                    value={content || ""}
                    placeholder={"请输入function执行结果"}
                    onChange={(e: any)=>{
                        setContent(e.target.value);
                    }}
                />
            </Box>)}

        <Dialog open={alertOpen} onClose={handleClose} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                  {validateMessage}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} autoFocus>OK</Button>
            </DialogActions>
        </Dialog>
    </Box>
}

export default function ToolCallsBox(props: {editToolCalls: any[], updateEditToolCalls: Function}){
    const [editIndex, setEditIndex] = useState<number>(-1);

    function updateToolCall(index: number, toolCall: any){
        props.editToolCalls[index] = {
            id: toolCall.id,
            type: toolCall.type,
            function: toolCall.function,
            content: toolCall.content
        };

        setEditIndex(-1);
        props.updateEditToolCalls([...props.editToolCalls]);
    }

    function removeTollCall(index: number){
        props.editToolCalls.splice(index, 1);
        setEditIndex(-1);

        props.updateEditToolCalls([...props.editToolCalls]);
    }

    return <Box sx={{marginTop: "10px"}}>

        <span style={{color: "#454545", fontWeight: "bold"}}>Tool Calls</span>

        <IconButton sx={{float: "right", marginTop: "-5px"}} size={"small"} onClick={()=>{
            props.updateEditToolCalls([...props.editToolCalls, {
                id: "call_"+randomBytes(12).toString("hex"),
                type: "function",
                function: {
                    name: "",
                    arguments: ""
                },
                content: ""
            }]);
            setEditIndex(props.editToolCalls.length);
        }}>
            <AddCircleOutline />
        </IconButton>

        {props.editToolCalls.map((tool_call: any, index: number)=>
            <ToolCall key={index} index={index} editIndex={editIndex} setEditIndex={setEditIndex} toolCall={tool_call}
                      removeToolCall={removeTollCall} updateToolCall={updateToolCall} />
        )}
    </Box>
}
