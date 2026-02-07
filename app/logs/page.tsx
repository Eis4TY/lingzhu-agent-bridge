"use client"

import { useState } from "react"
import { LogsTable } from "@/components/logs-table"
import { TerminalView } from "@/components/terminal-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export default function LogsPage() {
    const [terminalKey, setTerminalKey] = useState(0);

    async function clearLogs() {
        if (!confirm('Are you sure you want to clear all logs?')) return
        await fetch('/api/logs/clear', { method: 'DELETE' })
        setTerminalKey(prev => prev + 1);
    }

    return (
        <div className="container py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Logs</h2>
                    <p className="text-muted-foreground">Monitor and trace system activities.</p>
                </div>
                <Button variant="destructive" onClick={clearLogs}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Logs
                </Button>
            </div>

            <Tabs defaultValue="requests" className="w-full">
                <TabsList>
                    <TabsTrigger value="requests">Request Logs</TabsTrigger>
                    <TabsTrigger value="terminal">Terminal Output</TabsTrigger>
                </TabsList>
                <TabsContent value="requests" className="space-y-4">
                    <LogsTable key={terminalKey} />
                </TabsContent>
                <TabsContent value="terminal">
                    <TerminalView key={terminalKey} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
