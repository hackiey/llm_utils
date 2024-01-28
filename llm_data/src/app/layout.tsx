
import './styles/globals.css'
import "./styles/markdown.scss";
import "./styles/highlight.scss";
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Provider from "@/app/components/client-provider";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'LLM Data',
    description: 'LLM Data Management',
}

export default async function RootLayout({ children, }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    return (
        <Provider session={session}>
            <html lang="en">
                <body>{children}</body>
            </html>
        </Provider>
        
    )
}
