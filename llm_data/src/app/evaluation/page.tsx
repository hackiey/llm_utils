"use client";

import * as React from 'react';

import { useSession, signIn, signOut } from 'next-auth/react'
import { useSearchParams } from "next/navigation";

import Grid from "@mui/material/Unstable_Grid2";
import {Avatar, Box, IconButton, Link, ListItemIcon, Menu, MenuItem, Tab} from "@mui/material";
import {useState} from "react";

import {TabContext, TabList, TabPanel} from "@mui/lab";
import Evaluation from "@/app/evaluation/evaluation";
import Distribution from "@/app/evaluation/results";

import AvatarMenu from "@/app/components/avatar-menu";

function App() {

    const { data: session, status } = useSession();
    const [tabValue, setTabValue] = useState('1');

    return (
        <Grid container sx={{ padding: "0 2em", width: "100%" }} spacing={2}>
            <Grid xs={12} md={12} sx={{overflow: "auto", height: "100vh"}}>

                <AvatarMenu />

                <TabContext value={tabValue}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <TabList onChange={(event: React.SyntheticEvent, newValue: string) => {
                            setTabValue(newValue);
                        }} aria-label="lab API tabs example">
                            <Tab label="评测" value="1" />

                            <Tab label="评测结果" value="2" />
                        </TabList>
                    </Box>


                    <TabPanel value="1">
                        <Evaluation />
                    </TabPanel>

                    <TabPanel value="2">
                        <Distribution />
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
