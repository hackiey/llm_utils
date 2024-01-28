
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {useState, useEffect} from "react";
import {fetchLeaderboard} from "@/app/store/leaderboard";

const columns: GridColDef[] = [
    {
        field: "id",
        headerName: "排名",
        type: "number",
        width: 50
    },
    {
        field: "username",
        headerName: "账户名",
        type: "string",
        width: 300
    },
    {
        field: "prompts_count",
        headerName: "prompts创建数量",
        type: "number",
        width: 150
    },
    {
        field: "samples_count",
        headerName: "samples创建数量",
        type: "number",
        width: 150
    }
];

export default function Leaderboard(){
    const [rows, setRows] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        setIsLoading(true);
        fetchLeaderboard().then((data) => {
            console.log(data);
            setIsLoading(false);

            let _rows:any[] = [];
            data.forEach((item: any, index: number) => {
                _rows.push({
                    id: index+1,
                    username: item.username,
                    "prompts_count": item.prompt_count,
                    "samples_count": item.sample_count
                });
            });
            console.log(_rows);
            setRows(_rows);
        });
    }, []);

    return (
        <DataGrid rows={rows} columns={columns} rowCount={10} loading={isLoading} />
    );
}