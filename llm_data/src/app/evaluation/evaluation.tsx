import {Box, Card, CardContent, Avatar, Button, List, ListItem, ListItemAvatar, TextField, Divider, Chip, Checkbox} from "@mui/material";
import { useState, useEffect } from "react";
import Grid from '@mui/material/Unstable_Grid2';
import { DragDropContext, Droppable, Draggable, DroppableProps } from "@hello-pangea/dnd";
import { Markdown } from "@/app/components/markdown";
import Filters from "@/app/components/filters";
import PersonIcon from "@mui/icons-material/Person";
import AssistantIcon from "@mui/icons-material/Assistant";
import * as React from "react";
import { evaluationStore, fetchEvaluationSamples, fetchEvaluationSampleTotalCount, requestUpdateEvaluationSample } from "@/app/store/evaluation";
import {useSession} from "next-auth/react";

const icons: { [index: string]: any } = {
    user: <PersonIcon />,
    assistant: <AssistantIcon />
};

const backgroundColors: { [index: string]: any } = {
    user: "#FFFFFF",
    assistant: "#F7F7F8"
};

const avatarBackgroundColors: { [index: string]: any } = {
    user: "#5D4138",
    assistant: "#1BC37D"
};

export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => {
          cancelAnimationFrame(animation);
          setEnabled(false);
        };
    }, []);
    if (!enabled) {
        return null;
    }
    return <Droppable {...props}>{children}</Droppable>;
};

const grid = 8;

function getItemStyle(isDragging: boolean, draggableStyle: any){
    return {
        // some basic styles to make the items look a bit nicer
        userSelect: 'none',
        padding: grid * 2,
        margin: `0 ${grid}px 0 0`,

        // change background colour if dragging
        background: isDragging ? 'lightgreen' : 'grey',

        // styles we need to apply on draggables
        ...draggableStyle
    }
}

function ResponseCard(props: {message: any, dtype: string, provided: any}){
    return (
        <Card sx={{m: 1, maxWidth: props.dtype == "replies" ? "18%" : "100%"}}
              ref={props.provided.innerRef} {...props.provided.draggableProps} {...props.provided.dragHandleProps}>
            <CardContent>
                <Box sx={{width: "30px", textAlign: "center", padding: "2px", margin: "-10px 0px 10px -10px", borderRadius: "5px", backgroundColor: "#1996d3"}}>
                    <span style={{color: "white"}}>{props.message.index+1}</span>
                </Box>
                <Markdown content={props.message.content} />
            </CardContent>
        </Card>
    )
}

export default function Evaluation (){

    const { data: session, status } = useSession();

    const orderRankIds = ["rank-1", "rank-2", "rank-3", "rank-4", "rank-5"];

    const [page, setPage] = useState(evaluationStore.getPage());
    const [pageValue, setPageValue] = useState(evaluationStore.getPage()+1);
    const [totalCount, setTotalCount] = useState(0);
    const [filters, setFilters] = useState(evaluationStore.getEvaluationFilters());
    const [evaluationSample, setEvaluationSample] = useState<{[index: string]: any}>({});
    const [messages, setMessages] = useState<any[]>([]);
    const [replies, setReplies] = useState<{[index: string]: any}>({});

    const [submitButtonString, setSubmitButtonString] = useState("提交");
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [autoNext, setAutoNext] = useState(true);

    // replyIds: Array.from({length: Object.keys(_replies).length}, (_, i) => `reply-${i+1}`)},
    let _droppableData: {[key: string]: any} = {
        replies: {id: "replies", rank: -1, replyIds: []}
    };
    for (let i=0; i<orderRankIds.length; i++){
        _droppableData[orderRankIds[i]] = {
            id: orderRankIds[i],
            rank: i+1,
            replyIds: []
        };
    }
    const [droppableData, setDroppableData] = useState<{[index: string]: any}>(_droppableData);

    function updateFilters(newFilters: any[]){
        setFilters(newFilters);
        evaluationStore.updateEvaluationFilters(newFilters);
    }
    function updatePageValue(newPageValue: number){
        setPageValue(newPageValue);
        setPage(newPageValue-1);
        evaluationStore.updatePage(newPageValue-1);
    }

    function prevPage(){
        if (pageValue <= 1) {
            return;
        }
        updatePageValue(pageValue-1);
    }
    function nextPage(){
        if (pageValue >= totalCount) {
            return;
        }
        updatePageValue(pageValue+1);
    }

    async function refreshData(){
        console.log(filters);
        const res = await fetchEvaluationSamples(page, filters);

        setSubmitDisabled(false);
        setSubmitButtonString("提交");

        if(res.length == 0){
            setDroppableData(_droppableData);
            setEvaluationSample({});
            setTotalCount(0);
            setMessages([]);
            return;
        }
        const _evaluationSample = res[0];

        setEvaluationSample(_evaluationSample);

        // 更新messages
        setMessages(_evaluationSample.messages)

        // 更新回复数据
        let _replies: {[index: string]: any} = {};
        for (let i=0; i<_evaluationSample.replies.length; i++){
            _replies[`reply-${i+1}`] = {
                id: `reply-${i+1}`,
                index: i,
                model: _evaluationSample.reply_tags[i],
                role: _evaluationSample.replies[i].role,
                content: _evaluationSample.replies[i].content
            };
        }
        setReplies(_replies);

        // 更新droppable data
        droppableData.replies.replyIds = [];
        for (let i=0; i<orderRankIds.length; i++){
            droppableData[orderRankIds[i]].replyIds = [];
        }
        _evaluationSample.rank_tags.map((rank_tag: any, index: number)=>{
            if (rank_tag == -1){
                droppableData.replies.replyIds.push(`reply-${index+1}`)
            }else{
                droppableData[`rank-${rank_tag}`].replyIds.push(`reply-${index+1}`);
            }
        });
        setDroppableData(droppableData);

        // 更新总数
        const _totalCount = await fetchEvaluationSampleTotalCount(filters);
        if (pageValue > _totalCount.total_count){
            updatePageValue(_totalCount.total_count);
            // setPageValue(_totalCount.total_count);
            // setPage(_totalCount.total_count-1);
        }
        setTotalCount(_totalCount.total_count);
    }

    useEffect(()=>{

        refreshData();
    }, [filters, page]);

    async function handleSubmit(e: any){
        setSubmitDisabled(false);
        for (let i=0; i<orderRankIds.length; i++){
            if (droppableData[orderRankIds[i]].replyIds.length == 0){
                continue;
            }
            droppableData[orderRankIds[i]].replyIds.forEach((replyId: string)=>{
                evaluationSample.rank_tags[replies[replyId].index] = droppableData[orderRankIds[i]].rank;
            });
        }
        const response = await requestUpdateEvaluationSample(evaluationSample, "rank_tags", session?.user?.name || "");
        if (response.status == 200){
            if (autoNext){
                nextPage();
            }
            setSubmitButtonString("提交成功");
        }
        setSubmitDisabled(true);
    }

    function onDragEnd(result: any){
        // dropped outside the list
        if (!result.destination) {
            return;
        }
        const {destination, source, draggableId } = result;
        if (destination.droppableId === source.droppableId) {
            // 拖拽到了同一个列表
            const items = Array.from(droppableData[source.droppableId].replyIds);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            droppableData[source.droppableId].replyIds = items;
        }else{
            // 拖拽到了不同的列表
            droppableData[source.droppableId].replyIds.splice(source.index, 1);
            droppableData[destination.droppableId].replyIds.splice(destination.index, 0, draggableId);
        }
        setDroppableData(droppableData);
    }

    return (
        <Box>
            <Grid container spacing={2}>
                <Grid xs={12} md={8}>
                    <Filters filters={filters} availableFilterTypes={[]} updateFilters={updateFilters}/>
                </Grid>
                <Grid xs={12} md={4}>
                    <Box sx={{float: "right"}}>
                        <span style={{fontSize: "12px", color: "#454647"}}>全量: {totalCount}</span>
                        <Button sx={{m: 1}} variant={"outlined"} size={"small"} onClick={prevPage}>上一个</Button>
                        <TextField variant="standard" size={"small"}
                                   sx={{width: "2.5em", marginTop: "5px"}} inputProps={{style: {textAlign: "center"}}} value={pageValue}
                                   onChange={(e: any)=>{
                                       setPageValue(e.target.value);
                                   }}
                                   onKeyDown={(e: any)=>{
                                        if (e.keyCode == 13){
                                            if (e.target.value > totalCount) {
                                                // setPageValue(totalCount);
                                                updatePageValue(totalCount);
                                            }else if (e.target.value < 1){
                                                // setPageValue(1);
                                                updatePageValue(1);
                                            }else {
                                                updatePageValue(parseInt(e.target.value));
                                                // setPageValue(parseInt(e.target.value));
                                                // setPage(parseInt(e.target.value) - 1);
                                            }
                                        }
                                   }}
                        />
                        <Button sx={{margin: "10px 0px 10px 10px"}} variant={"outlined"} size={"small"} onClick={nextPage}>下一个</Button>
                    </Box>
                </Grid>
            </Grid>
            <Divider sx={{marginTop: "10px", marginBottom: "10px"}}/>
            <Chip sx={{m: 1}} label={"任务: "+ evaluationSample.tasks} variant="outlined" />
            <Chip sx={{m: 1}} label={"标签: "+ evaluationSample.tags} variant="outlined" />
            <Chip sx={{m: 1}} label={"难度: "+ evaluationSample.difficulty} variant="outlined" />

            <List sx={{width: "100%", marginTop: -1}}>
                {/*取到倒数第二条*/}
                {messages.slice(0, messages.length-1).map((message: any, index: number)=>(
                    <ListItem key={index} sx={{
                        width: "100%", paddingTop: "1.5em", "paddingBottom": "1.5em", borderBottom: "1px slid #E1E1E2",
                        backgroundColor: backgroundColors[message.role]
                    }}>

                        <ListItemAvatar sx={{ alignSelf: "flex-start" }}>
                            <Avatar sx={{ background: avatarBackgroundColors[message.role] }}>
                                {icons[message.role]}
                            </Avatar>
                        </ListItemAvatar>

                        <Box sx={{width: "100%"}}>
                            <Markdown content={message.content} />
                        </Box>
                    </ListItem>
                ))}
            </List>
            <Divider/>
            <Box sx={{marginTop: "20px"}}>
                <p style={{fontWeight: "bold", color: "#454556", marginBottom: "5px"}}>参考答案</p>
                <Markdown content={messages.length > 0 ? messages[messages.length-1].content : ""} />
            </Box>
            <Divider sx={{width: "50%", marginTop: "10px"}} />
            <Box sx={{height: "40px", marginTop: "20px"}}>
                <span style={{fontWeight: "bold", color: "#454556", margin: "20px 5px 5px 0px"}}>
                    根据以上聊天记录和参考答案，为以下回复排序
                </span>

                <Box sx={{float: "right", marginTop: "-10px"}}>
                    <Checkbox checked={autoNext} onChange={(e: any)=> {
                        setAutoNext(e.target.checked);
                    }} />
                    <span style={{color: "gray", fontSize: "0.8em", marginRight: "1em"}}>自动下一个</span>
                    <Button variant={"outlined"} size={"small"} disabled={submitDisabled}
                        onClick={handleSubmit}>
                        {submitButtonString}
                    </Button>
                </Box>
            </Box>

            <DragDropContext onDragEnd={onDragEnd}>
                <StrictModeDroppable droppableId="replies" direction={"horizontal"}>
                    {(provided, snapshot) => (
                        <Box ref={provided.innerRef}
                            style={{display: 'flex', alignItems: "start", overflow: 'auto', minHeight: "100px", border: "1px solid lightblue", borderRadius: "5px"}}
                            {...provided.droppableProps}
                        >
                            {droppableData["replies"].replyIds.map((replyId: string, index: number)=>(
                                <Draggable key={replyId} draggableId={replyId} index={index}>
                                    {(provided, snapshot) => (
                                        <ResponseCard message={replies[replyId]} dtype={"replies"} provided={provided} />
                                    )}
                                </Draggable>

                            ))}
                            {provided.placeholder}
                        </Box>
                    )}
                </StrictModeDroppable>

                <Grid container spacing={2} sx={{marginTop: 2}}>
                    {orderRankIds.map((rankId, index)=>(
                        <Grid xs={12} md key={index}>
                            <p style={{fontWeight: "bold", color: "#454556", margin: "5px"}}>
                                Rank{index+1}{index==0 ? "（最好）":""}{index==(orderRankIds.length-1)?"（最差）":""}
                            </p>

                            {/*Droppable*/}
                            <StrictModeDroppable droppableId={rankId} direction={"vertical"}>
                                {(provided, snapshot) => (
                                    <Box ref={provided.innerRef}
                                        sx={{display: "flex", alignItems: "start", flexDirection: "column", border: "1px solid lightblue", borderRadius: "5px", minHeight: "500px"}}
                                        {...provided.droppableProps}
                                    >
                                        {droppableData[rankId].replyIds.map((replyId: string, index: number) => {
                                            const reply = replies[replyId];

                                            return (
                                                <Draggable key={replyId} draggableId={replyId} index={index}>
                                                    {(provided, snapshot) => (
                                                        <ResponseCard message={reply} dtype={"rank"} provided={provided}/>
                                                    )}
                                                </Draggable>
                                            )
                                        })}
                                        {provided.placeholder}
                                    </Box>
                                )}
                            </StrictModeDroppable>
                        </Grid>
                    ))}
                </Grid>

            </DragDropContext>
        </Box>
    )
}