
import NextAuth from "next-auth"
import type { AuthOptions, DefaultUser } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { AuthType } from "@/app/types";

interface User extends DefaultUser {
    id: string
    name: string
    auth: number
}

async function credentialsAuthorize(credentials: any){
    const maintainers = process.env.MAINTAINERS?.split(",") ?? [];

    // TODO: fix email as auth type
    if (maintainers.includes(credentials.username+":"+credentials.password)){
        return {
            id: credentials.username,
            name: credentials.username,
            email: AuthType.maintainer.toString()
        } as User;
    }

    if (credentials.username + "!@#" == credentials.password){
        return {
            id: credentials.username,
            name: credentials.username,
            email: AuthType.labeler.toString()
        } as User;
    }
    return null;
}

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log(credentials);

                const user = await credentialsAuthorize(credentials)
                if (user) {
                    return user
                } else {
                    return null
                }
            },
        }),
    ],
};

const handler = NextAuth(authOptions);

export {handler as GET, handler as POST};