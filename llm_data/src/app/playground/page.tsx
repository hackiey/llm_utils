'use client';

import * as React from "react";
import {useState} from "react";
import {signIn, useSession} from "next-auth/react";

import Grid from "@mui/material/Unstable_Grid2";
import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import {ChatApp} from "@/app/playground/chat";

function App(){
    const { data: session, status } = useSession();
    const [tabValue, setTabValue] = useState('1');

    return <Grid container sx={{ padding: "0 2em", width: "100%" }} >
        <Grid xs={12} md={12}>

            <TabContext value={tabValue}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <TabList onChange={(event: React.SyntheticEvent, newValue: string) => {
                        setTabValue(newValue);
                    }} aria-label="lab API tabs example">

                        <Tab label="Chat" value="1" />

                    </TabList>
                </Box>

                <TabPanel value="1">
                    <ChatApp />
                </TabPanel>

            </TabContext>

        </Grid>
    </Grid>
}

export default function Home(){
    const { data: session, status } = useSession();

    return (
        <App />
    );
}