
"use client";
import {Box, Tab, Paper, IconButton, InputBase, Divider, Button, ButtonGroup, TextField, Slider, Stack} from "@mui/material";
import {Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Grid from "@mui/material/Unstable_Grid2";
import {useEffect, useState} from "react";
import {TextareaAutosize} from "@mui/base";
import styles from "@/app/components/chatbox.module.scss";
import * as React from "react";

export default function Home(){

    const [tabValue, setTabValue] = useState('1');

    const [alertOpen, setAlertOpen] = useState(false);

    const [currentIndex, setCurrentIndex] = useState("1");
    // const [totalNum, setTotalNum] = useState(0);
    const [agentInfo, setAgentInfo] = useState<any>({});
    const [agents, setAgents] = useState([]);

    const [question, setQuestion] = useState("");

    const [totalActions, setTotalActions] = useState(0);
    const [actionIndex, setActionIndex] = useState(0);
    const [actionDescription, setActionDescription] = useState<string>("");

    const [position, setPosition] = useState("search");
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [findInPageQuery, setFindInPageQuery] = useState("");
    const [page, setPage] = useState<any>({});

    const [actionsLeft, setActionsLeft] = useState(0);
    const [quotesLeft, setQuotesLeft] = useState(0);
    const [quoteContent, setQuoteContent] = useState("");
    const [quotes, setQuotes] = useState<any[]>([]);
    const [actionMessage, setActionMessage] = useState("");
    const [openPages, setOpenPages] = useState<any[]>([]);

    useEffect(() => {
        listAgents();
    }, []);

    useEffect(() => {
        jumpToSample(1);
    }, [agents]);

    async function listAgents(){
        const res = await fetch("/api/agents/list", {
            method: "POST",
            body: JSON.stringify({name: "search_agent_v1"}),
            headers: {"Content-Type": "application/json"}
        });
        const resData = await res.json();
        setAgents(resData['agents']);
    }

    async function previousSample(){
        let _currentIndex = parseInt(currentIndex);
        if (_currentIndex <= 1){
            _currentIndex = 1
        }else{
            _currentIndex -= 1;
        }
        if (_currentIndex != parseInt(currentIndex)){
            jumpToSample(_currentIndex);
        }
    }

    async function nextSample(){
        let _currentIndex = parseInt(currentIndex);
        if (_currentIndex >= agents.length) {
            _currentIndex = agents.length;
        }else{
            _currentIndex += 1;
        }
        if (_currentIndex != parseInt(currentIndex)){
            jumpToSample(_currentIndex);
        }
    }

    async function jumpToSample(index: number){
        setCurrentIndex(index.toString());
        const indexNum = index - 1;
        if (agents[indexNum] !== undefined){
            const agentInfo = agents[indexNum];

            setQuestion(agentInfo['info']['question']);
            setAgentInfo(agentInfo);
            setPosition("search");
            setSearchResults([]);
            setQuotes([]);
            setActionIndex(0);
            setActionDescription("");

            const res = await fetch("/api/agents/get_config", {
                method: "POST",
                body: JSON.stringify({agent_id: agentInfo['agent_id']}),
                headers: {"Content-Type": "application/json"}
            });

            const resData = await res.json();
            setTotalActions(resData['total_actions']);
            setActionsLeft(resData['config']['max_actions']);
            setQuotesLeft(resData['config']['max_quote_content']);
        }
    }

    async function jumpToAction(index: number){
        if (index == 0){
            jumpToSample(parseInt(currentIndex));
        }
        if (index > 0 && index <= totalActions){

            const res = await fetch("/api/agents/jump_to_action", {
                method: "POST",
                body: JSON.stringify({agent_id: agentInfo['agent_id'], action_index: index-1}),
                headers: {"Content-Type": "application/json"}
            });
            const resData = await res.json();
            console.log(resData);
            setObservation(resData.action, resData.observation);

            setActionIndex(index);
        }
    }

    function setObservation(action: any, observation: any){
        setPosition(observation.position);

        const search_results = observation.search_results;
        if (search_results.query) {
            setQuery(search_results.query);
        }
        if (search_results.results) {
            setSearchResults(search_results.results);
        }

        if (observation.quotes){
            setQuotes(observation.quotes);
        }

        setPage(observation.page);

        setActionsLeft(observation.actions_left);
        setQuotesLeft(observation.quotes_left);
        setOpenPages(observation.open_pages);

        let _actionDescription = "";
        if (action.action == "search"){
            _actionDescription = "搜索：" + action.query;
        } else if (action.action == "open_url"){
            _actionDescription = "打开页面：" + action.title;
        } else if (action.action == "find_in_page"){
            _actionDescription = "在页面中查找：" + action.find_in_page_query;
        } else if (action.action == "scroll_up") {
            _actionDescription = "向上滚动页面";
        } else if (action.action == "scroll_down"){
            _actionDescription = "向下滚动页面";
        } else if (action.action == "back"){
            _actionDescription = "返回至搜索页面 (" + action.query + ")";
        } else if (action.action == "quote"){

            if (action.quote.length < 40){
                _actionDescription = "添加引用：" + action.quote;
            }else{
                console.log(action.quote.slice(0, 5));
                _actionDescription = "添加引用：" + action.quote.slice(0, 20) + "......" + action.quote.slice(action.quote.length-20, action.quote.length);
            }
        }

        if (observation.action_message != ""){
            _actionDescription += " => " + observation.action_message;
        }

        setActionDescription(_actionDescription);
    }

    async function runAction(action: any){
        const res = await fetch("/api/agents/run_action", {
            method: "POST",
            body: JSON.stringify({agent_id: agentInfo['agent_id'], action: action, action_index: actionIndex-1}),
            headers: {"Content-Type": "application/json"}
        });
        const resData = await res.json();
        console.log("[Run Action]", action, resData);

        const observation = resData.observation;

        setObservation(action, observation);
        setTotalActions(actionIndex + 1);
        setActionIndex(actionIndex + 1);
    }

    return (
        <Grid container sx={{padding: "0 2em", width: "1440px", marginTop: "20px", marginLeft: "auto", marginRight: "auto"}} spacing={2}>
            <Grid xs={12} md={6}>
                <h2 style={{marginBottom: "10px", fontSize: "18px", fontWeight: "bold"}}>{question}</h2>
            </Grid>
            <Grid xs={12} md={6}>
                <Box sx={{height: "50px", float: "right"}}>
                    <TextField sx={{marginTop: "-17px", marginRight: "10px"}} label={"跳转至...("+agents.length+")"} variant="standard" value={currentIndex}
                               onChange={(e)=>{
                                   setCurrentIndex(e.target.value);
                               }}
                               onKeyDown={(e: any)=>{
                                   // 提交
                                   if (e.keyCode == 13) {
                                       jumpToSample(parseInt(currentIndex));
                                   }
                               }}
                    />
                    <ButtonGroup size={"small"}>
                        <Button variant={"outlined"} onClick={previousSample}>上一个</Button>
                        <Button variant={"outlined"} onClick={nextSample}>下一个</Button>
                    </ButtonGroup>
                </Box>
            </Grid>

            <Stack spacing={2} direction="row" sx={{padding: "0 9px 10px 9px", width: "100%"}} alignItems="center">

                <ButtonGroup size={"small"} variant={"outlined"}>
                    <Button onClick={(e)=>{jumpToAction(0);}}>{"<<"}</Button>
                    <Button onClick={(e)=>{jumpToAction(actionIndex-1);}}>{"<"}</Button>
                </ButtonGroup>
                <Slider disabled value={actionIndex} min={0} max={totalActions} marks={[
                    {value: actionIndex, label: actionIndex},
                    {value: totalActions, label: totalActions}
                ]} aria-label="Disabled slider" />
                <ButtonGroup size={"small"} variant={"outlined"}>
                    <Button onClick={(e)=>{jumpToAction(actionIndex+1);}}>{">"}</Button>
                    <Button onClick={(e)=>{jumpToAction(totalActions);}}>{">>"}</Button>
                </ButtonGroup>

            </Stack>

            <Box sx={{height: "30px", margin: "10px 0 10px 10px"}}>
                <span style={{color: "gray"}}>{actionDescription}</span>
            </Box>
            <Divider />
            <Grid container xs={12} md={12} spacing={10}>

                <Grid xs={12} md={6}>
                    <Box sx={{width: "100%"}}>
                        <Box sx={{width: "100%", marginBottom: "20px"}}>
                            <Button variant="outlined" size={"small"} disabled={position=="search"} onClick={(e)=>{
                                runAction({action: "back", query: page.query})
                            }}>返回至搜索页</Button>

                            <span style={{marginLeft: "20px", color: 'gray'}}>剩余操作数量: {actionsLeft}</span>
                        </Box>
                    </Box>

                    <Box>
                        {/* 搜索页面 */}
                        {position == "search" && <Box>
                            <Paper component="form" sx={{ p: '2px 4px', display: 'flex', alignItems: 'center' }}>
                                <InputBase sx={{ ml: 1, flex: 1 }} placeholder={"搜索..."} value={query}
                                           onChange={(e)=>{
                                               setQuery(e.target.value);
                                           }}
                                           onKeyDown={(e: any)=>{
                                               if (e.keyCode == 13) {
                                                   e.preventDefault();
                                                   if (query != "") {
                                                       runAction({action: "search", query: query})
                                                   }
                                               }
                                           }}
                                />
                                <IconButton type="button" sx={{ p: '10px' }} onClick={()=>{
                                    if (query != "") {
                                        runAction({action: "search", query: query})
                                    }
                                }}>
                                <SearchIcon />
                              </IconButton>
                            </Paper>

                            {searchResults.map((r: any, index: number)=> {
                                return <Box key={index} sx={{marginTop: "10px", marginBottom: "10px"}}>
                                    <Box sx={{alignSelf: "none"}}>
                                        <p style={{color: openPages.includes(r.url) ? "purple" : "blue", cursor: "pointer"}}
                                            onClick={(e)=>{
                                                runAction({action: "open_url", url: r.url, title: r.title, query: query, scroll: 0});
                                            }}>
                                            {r.title}
                                        </p>
                                    </Box>
                                    <Box><p>{r.summary}</p></Box>
                                    <Divider />
                                </Box>
                            })}
                        </Box>}

                        {/*  Open Url页面  */}
                        {position == "page" && <Box>

                            <p style={{fontSize: "18px", fontWeight: "bold"}}>{page.title}</p>

                            <Stack spacing={2} direction="row" sx={{ marginTop: "10px", marginBottom: "30px"}} alignItems="center">
                                <Button size={"small"} variant={"outlined"} onClick={(e)=>{
                                    if (page.scroll > 0) {
                                        runAction({action: "scroll_up", url: page.url, distance: 1, query: page.query, scroll: page.scroll});
                                    }
                                }}>{"<"}</Button>
                                <Slider disabled value={page.scroll} min={0} max={page.max_scrolls}
                                        marks={[{value: page.scroll, label: page.scroll}, {value: page.max_scrolls, label: page.max_scrolls}]}
                                        aria-label="Disabled slider" />
                                <Button size={"small"} variant={"outlined"} onClick={(e)=>{

                                    if (page.scroll < page.max_scrolls) {
                                        runAction({action: "scroll_down", url: page.url, distance: 1, query: page.query, scroll: page.scroll})
                                    }
                                }}>{">"}</Button>
                            </Stack>

                            <Paper component="form" sx={{ p: '2px 4px', m: "0 0 20px 0", display: 'flex', alignItems: 'center' }}>
                                <InputBase sx={{ ml: 1, flex: 1 }} placeholder={"在文中搜索..."} value={findInPageQuery}
                                           onChange={(e)=>{
                                               setFindInPageQuery(e.target.value);
                                           }}
                                           onKeyDown={(e: any)=>{
                                               if (e.keyCode == 13) {
                                                   e.preventDefault();
                                                   if (findInPageQuery != "") {
                                                       runAction({action: "find_in_page", query: page.query, find_in_page_query: findInPageQuery, url: page.url});
                                                   }
                                               }
                                           }}
                                />
                                <IconButton type="button" sx={{ p: '10px' }} onClick={()=>{
                                    if (findInPageQuery != "") {
                                        runAction({action: "find_in_page", query: page.query, find_in_page_query: findInPageQuery, url: page.url});
                                    }
                                }}>
                                <SearchIcon />
                              </IconButton>
                            </Paper>

                            <pre style={{width: "100%", whiteSpace: "pre-wrap"}}>{page.chunk_content}</pre>

                        </Box>}
                    </Box>

                </Grid>

                <Grid xs={12} md={6}>
                    <Button variant={"outlined"} size={"small"} onClick={(e)=>{
                        if (quoteContent != ""){
                            runAction({action: "quote", quote: quoteContent, url: page.url, title: page.title});
                            setQuoteContent("");
                        }
                    }}>添加引用</Button>
                    <span style={{marginLeft: "20px", color: 'gray'}}>剩余引用字数: {quotesLeft}</span>

                    <Button variant={"outlined"} size={"small"} color={"success"} sx={{float: "right"}} onClick={(e)=>{}}>完成引用, 开始回答</Button>
                    <TextareaAutosize style={{ margin: "1.5em 0 20px 0", width: "100%"}} color="primary" className={styles["edit-textarea"]}
                                      placeholder={"引用内容..."}
                                      value={quoteContent}
                                      onChange={(e: any)=>{setQuoteContent(e.target.value)}}
                    ></TextareaAutosize>

                    {quotes.map((q: any, index: number)=>{
                        return <Box key={index} sx={{marginTop: "10px"}}>
                            <Divider sx={{marginBottom: "10px"}} />
                            <p style={{fontSize: "18px", margin: "0 0 10px 0"}}>{q.title}</p>

                            <pre style={{width: "100%", whiteSpace: "pre-wrap", margin: "10px 0 0 0"}}>{q.quotes.join("\n")}</pre>
                        </Box>
                    })}
                </Grid>


                <Dialog
                    open={alertOpen}
                    onClose={()=>{setAlertOpen(false)}}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >

                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            当前操作会导致已产生的后续操作全被删除，是否继续？
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={()=>{setAlertOpen(false)}}>取消</Button>
                        <Button onClick={()=>{setAlertOpen(false)}} autoFocus>
                            确定
                        </Button>
                    </DialogActions>
                </Dialog>

            </Grid>
        </Grid>
    )

}