import {Avatar, Box, IconButton, ListItemIcon, Menu, MenuItem} from "@mui/material";
import {signOut, useSession} from "next-auth/react";
import {Logout} from "@mui/icons-material";
import * as React from "react";
import {useState} from "react";


export default function AvatarMenu(){

    const { data: session, status } = useSession();
    const [avatarAnchorEl, setAvatarAnchorEl] = useState(null);
    const avatarOpen = Boolean(avatarAnchorEl);

    return <Box sx={{m: 1, height: 30, float: "right"}}>
        <IconButton
            onClick={(e: any)=>{setAvatarAnchorEl(e.currentTarget)}}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={avatarOpen ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={avatarOpen ? 'true' : undefined}
        >
            <Avatar sx={{ width: 32, height: 32 }}>{session?.user?.name && session.user.name.length>0 ? session.user.name[0] : "用户"}</Avatar>
        </IconButton>

        <Menu
            anchorEl={avatarAnchorEl}
            id="account-menu"
            open={avatarOpen}
            onClose={()=>{setAvatarAnchorEl(null)}}
            onClick={()=>{setAvatarAnchorEl(null)}}
        >
            <MenuItem onClick={()=>{
                window.location.href = "/samples";
            }}>
                Samples
            </MenuItem>

             <MenuItem onClick={()=>{
                window.location.href = "/evaluation";
            }}>
                Evaluation
            </MenuItem>

            <MenuItem onClick={()=>signOut()}>
                <ListItemIcon>
                    <Logout fontSize="small" />
                </ListItemIcon>
                退出
            </MenuItem>
        </Menu>
    </Box>
}