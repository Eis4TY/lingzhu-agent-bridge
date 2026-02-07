"use client"

import * as React from "react"
import { RequestLog } from "@/protocols/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Eye } from "lucide-react"
import { LogDetails } from "./log-details"

export function LogsTable() {
    const [logs, setLogs] = React.useState<RequestLog[]>([])
    const [loading, setLoading] = React.useState(false)
    const [selectedLog, setSelectedLog] = React.useState<RequestLog | null>(null)

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/logs?limit=10000")
            const data = await res.json()
            setLogs(data)
        } catch (e) {
            console.error("Failed to fetch logs", e)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 5000) // Auto refresh every 5s
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Showing last {logs.length} requests
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[180px]">Time</TableHead>
                            <TableHead className="w-[150px]">Agent</TableHead>
                            <TableHead>Summary</TableHead>
                            <TableHead className="text-right">Latency</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No logs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <Badge className={
                                            log.status === 'success' ? 'bg-green-500 hover:bg-green-600' :
                                                log.status === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
                                        }>
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                                    <TableCell className="font-mono text-xs">{log.agentId.slice(0, 8)}</TableCell>
                                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                        {log.request_summary}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <LogDetails
                log={selectedLog}
                open={!!selectedLog}
                onOpenChange={(open) => !open && setSelectedLog(null)}
            />
        </div>
    )
}
