import {AuthType} from "@/app/types";


export function isMaintainer(session: any){
    return parseInt(session?.user?.email || "10") <= AuthType.maintainer;
}
export function isAdmin(session: any){
    return parseInt(session?.user?.email || "10") <= AuthType.admin;
}