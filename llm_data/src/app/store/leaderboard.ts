
export async function fetchLeaderboard(){

    const promptCreateUserLeaderboard = await fetch("/api/prompts/create-user-leaderboard", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
    });

    const sampleCreateUserLeaderboard = await fetch("/api/samples/create-user-leaderboard", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
    });

    let userLeaderboard: any[] = [];
    const promptCreateUserLeaderboardJson = await promptCreateUserLeaderboard.json();
    const sampleCreateUserLeaderboardJson = await sampleCreateUserLeaderboard.json();

    promptCreateUserLeaderboardJson.forEach((user: any) => {
        userLeaderboard.push({
            username: user._id,
            prompt_count: user.count,
            sample_count: 0
        });
    });

    sampleCreateUserLeaderboardJson.forEach((user: any) => {
        let found = false;
        userLeaderboard.forEach((user2: any) => {
            if (user2.username == user._id){
                user2.sample_count = user.count;
                found = true;
            }
        });
        if (!found){
            userLeaderboard.push({
                username: user._id,
                prompt_count: 0,
                sample_count: user.count
            });
        }
    });

    // 过滤user为空的数据
    userLeaderboard = userLeaderboard.filter((user: any) => {
        return user.username != "";
    });

    return userLeaderboard;
}