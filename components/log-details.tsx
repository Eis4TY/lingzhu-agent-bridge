"use client"

import { RequestLog } from "@/protocols/types"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface LogDetailsProps {
    log: RequestLog | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LogDetails({ log, open, onOpenChange }: LogDetailsProps) {
    if (!log) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center space-x-2">
                        <DialogTitle>Request Details</DialogTitle>
                        <Badge variant={
                            log.status === 'success' ? 'default' :
                                log.status === 'error' ? 'destructive' : 'secondary'
                        }>
                            {log.status}
                        </Badge>
                    </div>
                    <DialogDescription>
                        ID: {log.id} • Agent: {log.agentId} • {new Date(log.timestamp).toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {log.error_message && (
                        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                            Error: {log.error_message}
                        </div>
                    )}

                    <div>
                        <h4 className="mb-2 text-sm font-medium">Request Body</h4>
                        <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-xs">
                            {JSON.stringify(log.full_request, null, 2)}
                        </pre>
                    </div>

                    {/* We can add response here later if we capture it in logging */}
                </div>
            </DialogContent>
        </Dialog>
    )
}
