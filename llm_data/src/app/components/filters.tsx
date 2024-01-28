
import {Box, Menu, MenuItem, TextField, Divider, Select, Button, IconButton} from "@mui/material";
import { useState } from "react";
import {FilterOperators} from "@/app/types";
import {FilterItemOperators, ColumnItems} from "@/app/constant";
import * as React from "react";

const FONT_SIZE = 12;
const DEFAULT_INPUT_WIDTH = 50;
const selectCss = {
    fontSize: "12px",
    marginTop: 0.1,
    marginLeft: -1,
    marginRight: -1,
    boxShadow: 'none',
    ".MuiOutlinedInput-notchedOutline": { border: 0 },
    "&.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {border: 0,},
    "&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {border: 0,},
}

const menuItemCss = {
    fontSize: "13px"
}

export function Filter(props: {type: string, operator: FilterOperators, arrayValue: string[], textValue: string, index: number,
    filters: any[], updateFilters: Function, fixed: boolean}){

    // 值类型: select/text/date
    const valueType = ColumnItems[props.type].type;

    // 操作符列表
    const [operatorList, setOperatorList] = useState(FilterItemOperators[valueType]);
    const multipleOperators = [FilterOperators.Contains, FilterOperators.NotContains];

    // 当前操作符
    const [operator, setOperator] = useState(props.operator);
    // 当前值
    const [arrayValue, setArrayValue] = useState(props.arrayValue);
    const [singleValue, setSingleValue] = useState(props.arrayValue[0]);
    const [inputValue, setInputValue] = useState(props.textValue);
    const disableInputOperators = [FilterOperators.IsEmpty, FilterOperators.NotEmpty];

    function refreshFilters(_operator: any, _arrayValue: any, _inputValue: any){
        let newFilters = [...props.filters];
        newFilters[props.index] = {type: props.type, operator: _operator, arrayValue: _arrayValue, textValue: _inputValue};
        props.updateFilters(newFilters);
    }

    return (
        <Box sx={{display: "flex", width: 'fit-content', m: 1, paddingLeft: 1, paddingRight: 0.2, alignItems: 'center',
            border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1, }} >
            <span style={{color: "#1975D2", fontSize: "13px", marginRight: "8px"}}><b>{ColumnItems[props.type].name}</b></span>

            <Divider orientation="vertical" flexItem />

            <Select
                sx={selectCss}
                value={operator}
                size={"small"}
                onChange={(e: any)=>{
                    setOperator(e.target.value);
                    refreshFilters(e.target.value, arrayValue, inputValue);
                }}
            >
                {operatorList.map((item: string, index: number) => (
                    <MenuItem key={index} sx={{...menuItemCss}} value={item}>{item}</MenuItem>
                ))}
            </Select>

            <Divider orientation="vertical" flexItem/>

            {valueType == "select" ? (
                <Select sx={{...selectCss, maxWidth: "100px", fontWeight: "bold", color: "#575757"}} value={multipleOperators.includes(operator)?arrayValue:singleValue} size={"small"}
                        multiple={multipleOperators.includes(operator)}
                        onChange={(e: any)=>{
                            if (multipleOperators.includes(operator)){
                                setArrayValue(e.target.value);
                                refreshFilters(operator, e.target.value, inputValue);
                            }else{
                                setArrayValue([e.target.value]);
                                setSingleValue(e.target.value);
                                refreshFilters(operator, [e.target.value], inputValue);
                            }
                        }}>

                    {!multipleOperators.includes(operator) ? <MenuItem sx={{...menuItemCss}} value={"全部"}>全部</MenuItem> : null}

                    {ColumnItems[props.type].items.map((item: string, index: number) => (
                        <MenuItem key={index} sx={{...menuItemCss}} value={item}>
                            {item}
                        </MenuItem>
                    ))}
                </Select>
            ):(
                <TextField variant="standard" size={"small"} InputProps={{disableUnderline: true}} inputProps={{style: {fontSize: FONT_SIZE, fontWeight: "bold", color: "#575757"}}}
                       sx={{marginTop: 0.5, marginLeft: 0.5, marginRight: 0.5, width: disableInputOperators.includes(operator)?10:DEFAULT_INPUT_WIDTH}}
                       placeholder={disableInputOperators.includes(operator)?"":"请输入..."} value={disableInputOperators.includes(operator)?"":inputValue}
                       disabled={disableInputOperators.includes(operator)}
                       onChange={(e: any)=>{setInputValue(e.target.value);}}
                       onKeyDown={(e: any)=>{
                           if (e.keyCode == 13){
                               refreshFilters(operator, arrayValue, inputValue);
                           }
                       }}
                />
            )}

            {
                !props.fixed ? (
                    // 删除Filter
                    <IconButton sx={{marginLeft: 0, marginRight: 0, fontSize: "12px", marginTop: -0.2}} onClick={()=>{
                            let newFilters = [...props.filters];
                            newFilters.splice(props.index, 1);
                            props.updateFilters(newFilters);
                        }}>
                        x
                    </IconButton>
                ) : null
            }

        </Box>
    )
}

export default function Filters(props: {filters: any[], availableFilterTypes: string[], updateFilters: Function}){

    const [anchorEl, setAnchorEl] = useState(null);
    const addFilterMenuOpen = Boolean(anchorEl);

    let fixedFiltersLength = props.filters.filter(filter => !props.availableFilterTypes.includes(filter.type)).length;

    return (
        <Box sx={{ width: "100%", marginLeft: -1, marginTop: -1}}>
            <Box sx={{ display: "flex", flexWrap: "wrap", width: "100%"}}>
                {props.filters.filter(filter => !props.availableFilterTypes.includes(filter.type)).map((filter, index) => (
                    <Filter key={index} index={index} type={filter.type} operator={filter.operator}
                            arrayValue={filter.arrayValue} textValue={filter.textValue}
                            filters={props.filters} updateFilters={props.updateFilters} fixed={true}/>
                ))}
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", width: "100%"}}>
                {
                    props.filters.filter(filter => props.availableFilterTypes.includes(filter.type)).map((filter, index) => (
                        <Filter key={fixedFiltersLength+index} index={fixedFiltersLength+index} type={filter.type} operator={filter.operator}
                                arrayValue={filter.arrayValue} textValue={filter.textValue}
                                filters={props.filters} updateFilters={props.updateFilters} fixed={false}/>
                    ))
                }

                {props.availableFilterTypes.length > 0 ? (
                    <Box>
                        <Button id="add-filter-button" variant={"outlined"} size={"small"} sx={{marginTop: 1.5, marginLeft: 1, fontSize: "12px", height: 30}}
                            aria-controls={addFilterMenuOpen ? 'add-filter-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={addFilterMenuOpen ? 'true' : undefined}
                            onClick={(e: any)=>{setAnchorEl(e.currentTarget);}}>添加过滤器</Button>
                        <Menu
                            id="add-filter-menu"
                            anchorEl={anchorEl}
                            open={addFilterMenuOpen}
                            onClose={()=>{setAnchorEl(null)}}
                        >
                            {props.availableFilterTypes.map((type, index) => (
                                <MenuItem key={index} onClick={()=>{
                                    setAnchorEl(null);
                                    let newFilters = [...props.filters];
                                    if (ColumnItems[type].type == "select") {
                                        newFilters.push({type: type, operator: FilterOperators.Contains, arrayValue: ["全部"], textValue: ""});
                                    }else if (ColumnItems[type].type == "text") {
                                        newFilters.push({type: type, operator: FilterOperators.Equal, arrayValue: [], textValue: ""});
                                    }else if (ColumnItems[type].type == "date") {
                                        newFilters.push({type: type, operator: FilterOperators.Before, arrayValue: [], textValue: new Date().toISOString().split("T")[0]});
                                    }

                                    props.updateFilters(newFilters);

                                }}>{ColumnItems[type].name}</MenuItem>
                            ))}
                        </Menu>
                        </Box>
                    ) : null}

            </Box>
        </Box>
    )
}