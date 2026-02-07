"use client"

import * as React from "react"
import { SystemLog } from "@/protocols/types"


export function TerminalView() {
    const [logs, setLogs] = React.useState<SystemLog[]>([])
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const lastTimestampRef = React.useRef<number>(0)

    const fetchLogs = async () => {
        try {
            const res = await fetch(`/api/logs/system?since=${lastTimestampRef.current}`)
            const newLogs: SystemLog[] = await res.json()

            if (newLogs.length > 0) {
                setLogs(prev => [...prev, ...newLogs])
                lastTimestampRef.current = newLogs[newLogs.length - 1].timestamp
            }
        } catch (e) {
            console.error("Failed to fetch system logs", e)
        }
    }

    React.useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 2000)
        return () => clearInterval(interval)
    }, [])

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    return (
        <div className="rounded-md border bg-black text-green-400 font-mono text-sm p-4 h-[600px] overflow-auto" ref={scrollRef}>
            {logs.length === 0 ? (
                <div className="opacity-50 italic">Waiting for logs...</div>
            ) : (
                logs.map((log, i) => (
                    <div key={`${log.timestamp}-${i}`} className="whitespace-pre-wrap break-all">
                        <span className="opacity-50 mr-2">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={
                            log.level === 'error' ? 'text-red-500' :
                                log.level === 'warn' ? 'text-yellow-500' : ''
                        }>
                            [{log.level.toUpperCase()}] {log.message}
                        </span>
                    </div>
                ))
            )}
        </div>
    )
}
