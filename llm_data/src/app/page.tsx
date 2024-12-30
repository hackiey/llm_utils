"use client";

import * as React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react'

import Grid from "@mui/material/Unstable_Grid2";
import {useState} from "react";
import {Box, Link} from "@mui/material";

function App() {

    const { data: session, status } = useSession();
    const [tabValue, setTabValue] = useState('1');

    const [avatarAnchorEl, setAvatarAnchorEl] = useState(null);
    const avatarOpen = Boolean(avatarAnchorEl);

    return (
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: '100vh' }}
        >
            <Grid xs={3} sx={{textAlign: "center"}}>
                    <Link href={"https://chat-next.iem-bj.xmxdev.com/#/chat"} target={"_blank"}>Chat</Link>
                    <Link sx={{marginLeft: "50px"}} href={"/demo"}>AI Demo</Link>
                    {/*<Link sx={{marginLeft: "50px"}} href={"/playground"}>Playground</Link>*/}
                    {/*<Link sx={{marginLeft: "50px"}} href={"/lab"}>Lab</Link>*/}
                    {/*<Link sx={{marginLeft: "50px"}} href={"/samples"}>Samples</Link>*/}
                    <Link sx={{marginLeft: "50px"}} href={"/evaluation"}>Evaluation</Link>
            </Grid>
        </Grid>

    )
}

export default function Home() {

    // const { data: session, status } = useSession();

    return (
        <App />
    );
}
