"use client";

import * as React from 'react';

import { useSession, signIn, signOut } from 'next-auth/react'

import Grid from "@mui/material/Unstable_Grid2";
import {Avatar, Box, IconButton, Link, ListItemIcon, Menu, MenuItem, Tab} from "@mui/material";
import {useState} from "react";

import {TabContext, TabList, TabPanel} from "@mui/lab";
import Samples from "@/app/samples/samples";
import Prompts from "@/app/samples/prompts";
import Leaderboard from "@/app/samples/leaderboard";
import ChatLogs from "@/app/samples/chat-logs";
import AvatarMenu from "@/app/components/avatar-menu";

import {isMaintainer} from "@/app/utils/auth";
import Tools from "@/app/samples/tools";

function App() {

    const { data: session, status } = useSession();
    const [tabValue, setTabValue] = useState('1');

    return (
        <Grid container sx={{ padding: "0 2em", width: "100%" }} spacing={2}>
            <Grid xs={12} md={12} sx={{overflow: "auto"}}>

                <AvatarMenu />

                <TabContext value={tabValue}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <TabList onChange={(event: React.SyntheticEvent, newValue: string) => {
                            setTabValue(newValue);
                        }} aria-label="lab API tabs example">
                            <Tab label="Samples" value="1" />
                            <Tab label="Prompts" value="2" />
                            <Tab label="Tools" value="3" />
                            <Tab label={"Chat Logs"} value={"4"} />
                            <Tab label="数据分布" value="5" />
                            <Tab label="偏好数据" value="8" />
                            <Tab label="贡献排名" value="6" />
                        </TabList>
                    </Box>

                    <TabPanel value="1">
                        <Samples />
                    </TabPanel>
                    <TabPanel value="2">
                        <Prompts />
                    </TabPanel>

                    <TabPanel value={"3"}>
                        <Tools />
                    </TabPanel>

                    <TabPanel value="4">
                        <ChatLogs />
                    </TabPanel>

                    <TabPanel value={"5"}>
                        <Box>Distribution</Box>
                    </TabPanel>

                    <TabPanel value={"8"}>
                        <Box>Preference</Box>
                    </TabPanel>

                    <TabPanel value="6">
                        <Leaderboard />
                    </TabPanel>

                </TabContext>

            </Grid>
        </Grid>
    )
}

export default function Home() {

    const { data: session, status } = useSession();

    if (!session){
        return <>
            {signIn()}
        </>
    }

    return (
        <App />
    );
}
