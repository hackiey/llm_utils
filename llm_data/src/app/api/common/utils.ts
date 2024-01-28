
export async function requestJsonPost(url: string, data: any){
    const result = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {"Content-Type": "application/json"}
    });

    return result.json();
}