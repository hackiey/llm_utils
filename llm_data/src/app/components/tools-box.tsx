'use client'
import {Box, Button, TextField, Divider, List, ListItem, Select, MenuItem, Switch} from "@mui/material";
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import {IconButton, DialogActions, DialogTitle, DialogContent, DialogContentText} from "@mui/material";
import Dialog from '@mui/material/Dialog';
import {AddCircleOutline, CheckCircleOutlined, RemoveCircleOutline} from "@mui/icons-material";

import {useState, useEffect} from "react";

import Editor from '@monaco-editor/react';
import * as React from "react";

function Tool(props: {functionJson: string, index: number, editIndex: number, setEditIndex: Function,
    updateFunctionJson: Function, removeFunction: Function}){

    const functionData = JSON.parse(props.functionJson);

    const [name, setName] = useState<string>(functionData.name);
    const [description, setDescription] = useState<string>(functionData.description);
    const [functionJson, setFunctionJson] = useState<string>(JSON.stringify(JSON.parse(props.functionJson), null, 4));

    const [alertOpen, setAlertOpen] = useState<boolean>(false);
    const [validateMessage, setValidateMessage] = useState<string>("");

    useEffect(() => {
        const functionData = JSON.parse(props.functionJson);
        setName(functionData.name);
        setFunctionJson(JSON.stringify(JSON.parse(props.functionJson), null, 4));
    }, [props.functionJson]);

    function handleClose(){
        setAlertOpen(false);
    }

    function validateFunctionJson(functionJson: string){
        try{
            const functionData = JSON.parse(functionJson);

            if (functionData.name == undefined || functionData.name == ""){
                return {status: false, message: "name为空"};
            }

            const re = "^[a-zA-Z0-9_-]{1,64}$";
            console.log(functionData.name);
            if (functionData.name.match(re) == null){
                return {status: false, message: "name需满足正则表达式" + re};
            }

            if (functionData.description == undefined){
                return {status: false, message: "description为空"};
            }
            if (functionData.parameters == undefined){
                return {status: false, message: "缺失parameters字段"};
            }
            if (functionData.parameters.type != "object"){
                return {status: false, message: "parameters.type需为object"};
            }
            if (functionData.parameters.properties == undefined){
                return {status: false, message: "缺失parameters.properties字段, properties字段可以为空字典"};
            }
            if (functionData.parameters.required == undefined){
                return {status: false, message: "缺失parameters.required字段, required字段可以为空数组"};
            }

            return {status: true, message: ""}

        }catch (e){
            return {status: false, message: "JSON格式错误"};
        }
    }

    return <Box className={"tool-box"} sx={{border: props.editIndex == props.index ? "1px solid lightgray" : "", borderRadius: "5px", padding: "0px 4px 0px 8px"}}>
        <Box sx={{display: "flex", width: "100%"}}>
            <IconButton sx={{marginLeft: "0px", width: "30px"}} onClick={() => {props.removeFunction(props.index)}}>
                <RemoveCircleOutline />
            </IconButton>

            <Box sx={{marginRight: "auto", textAlign: "left", width: "calc(100% - 80px)"}} onClick={()=>{props.setEditIndex(props.index)}}>
                <p style={{ color: "#565665", margin: "8px 0px 0px 10px", fontWeight: "500"}}>{name}</p>
                <p style={{color: "#565665", margin: "0px 0px 0px 10px", fontSize: "13px"}}>
                    {description}
                </p>
            </Box>

            {props.index == props.editIndex ?
                <IconButton sx={{width: "30px"}} onClick={()=>{
                    const validResult = validateFunctionJson(functionJson);
                    if (validResult.status){
                        const functionData = JSON.parse(functionJson);
                        props.updateFunctionJson(props.index, functionJson);
                        setName(functionData.name);
                        setDescription(functionData.description);
                        props.setEditIndex(-1);
                    }else{
                        setValidateMessage(validResult.message);
                        setAlertOpen(true);
                    }
                }}>
                    <CheckCircleOutlined />
                </IconButton> : <></>}

        </Box>

        {props.editIndex == props.index ? (
            <Box>
                <Editor height="300px" defaultLanguage="json" defaultValue={functionJson} onChange={(e: any)=>{setFunctionJson(e)}} 
                options={{lineNumbers: "off", minimap: {enabled: false}}} />
            </Box>
        ) : <></>}

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

export default function ToolsBox(props: {tools: any[], updateTools: Function}){

    const [editIndex, setEditIndex] = useState<number>(-1);

    const [functionsJson, setFunctionsJson] = useState<string[]>([]);
    const [tools, setTools] = useState<any[]>([]);

    useEffect(()=>{
        let _functionsJson: string[] = [];

        if (props.tools == undefined){
            return;
        }

        props.tools.map((tool: any) => {
            if (tool.type == "function"){
                _functionsJson.push(tool.function);
            }
        });
        setFunctionsJson(_functionsJson);

        let _tools: any[] = [];
        props.tools.filter((tool: any) => {
            if (tool.type != "function"){
                _tools.push(tool);
            }
        });
        setTools(_tools);

    }, []);

    function updateTools(functionsJson: string[]) {

        let _tools: any[] = [];
        functionsJson.map((functionJson: string) => {
            _tools.push({"type": "function", "function": functionJson});
        });

        tools.map((tool: any) => {
            _tools.push(tool);
        });

        props.updateTools(_tools);
    }

    function updateFunctionJson(index: number, functionJson: string){
        functionsJson[index] = functionJson

        setFunctionsJson([...functionsJson]);

        updateTools(functionsJson);
    }

    function removeFunction(index: number){
        functionsJson.splice(index, 1);
        setFunctionsJson([...functionsJson]);
        setEditIndex(-1);
        updateTools(functionsJson);
    }

    function updateSwitch(toolName: string, checked: boolean){
        let _tools = props.tools;
        if (checked) {
            _tools.push({"type": toolName,});
        }else {
            _tools.splice(_tools.findIndex((tool: any) => {
                return tool.type == toolName
            }), 1);
        }
        // 去重
        const tools = _tools.filter((tool: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => (
                t.type === tool.type
            ))
        );
        props.updateTools(tools);
    }

    return <Box sx={{marginTop: "5px"}}>
        {/* <p style={{color: "gray"}}>Tools</p>

        <Divider sx={{margin: "5px 0px 8px 0px"}} /> */}

        <span style={{color: "#454545", fontWeight: "bold"}}>Functions</span>

        <IconButton sx={{float: "right", marginTop: "-5px"}} size={"small"} onClick={()=>{
            setFunctionsJson([...functionsJson, JSON.stringify({
                name: "未命名",
                description: "",
                parameters: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }, null, 4)]);
            setEditIndex(functionsJson.length);
        }}>
            <AddCircleOutline />
        </IconButton>
        {/* <List sx={{height: "1px"}}></List> */}
        <Box sx={{width: "100%"}}>
            {functionsJson.map((functionJson: string, index: number) => (
                <Tool key={index} index={index} functionJson={functionJson} editIndex={editIndex} setEditIndex={setEditIndex}
                        updateFunctionJson={updateFunctionJson} removeFunction={removeFunction} />
            ))}
        </Box>

        <Divider sx={{margin: "8px 0px 8px 0px"}} />

        <Box sx={{marginTop: "10px"}}>
            <span style={{color: "#454545"}}>Retrieval<span style={{color: "gray"}}>(Coming Soon)</span></span>
            <Switch sx={{float: "right", margin: "-6px -4px 0px 0px"}} disabled={true} onClick={(e: any)=>{
                updateSwitch("retrieval", e.target.checked);
            }} />
        </Box>

    </Box>
}