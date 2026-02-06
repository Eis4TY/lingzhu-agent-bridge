"use client"

import * as React from "react"
import { ProtocolBinding } from "@/services/binding"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // Need to make sure this exists or use Input
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Need to install select or use native
import { Play, Copy, Check } from "lucide-react"

// Simple Select fallback if shadcn select not installed, but let's assume we can use native for speed or try standard
// We'll use native select for simplicity unless we install Select component
// Actually let's use the BindingForm's native select approach to be safe with installed components
// But requested "Rich" UI. Let's use standard textarea for JSON.

export function Sandbox() {
    const [bindings, setBindings] = React.useState<ProtocolBinding[]>([])
    const [selectedBindingId, setSelectedBindingId] = React.useState<string>("")
    const [inputJson, setInputJson] = React.useState<string>(JSON.stringify({
        message_id: "1021",
        agent_id: "40b8cc2b2f7843feb8cfe17b8921b877",
        message: [
            { role: "user", type: "text", text: "2026年1月16日黄金价格" }
        ]
    }, null, 2))

    const [result, setResult] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(false)
    const [copiedCurl, setCopiedCurl] = React.useState(false)

    React.useEffect(() => {
        fetch("/api/bindings").then(res => res.json()).then(setBindings)
    }, [])

    const handleTest = async () => {
        if (!selectedBindingId) return alert("Please select a binding")
        setLoading(true)
        setResult({ trace: [], rawResponseChunks: [], transformedResponse: null, transformedRequest: null, error: null })
        try {
            // Validate JSON
            let requestParsed;
            try {
                requestParsed = JSON.parse(inputJson);
            } catch (e) {
                alert("Invalid JSON");
                setLoading(false);
                return;
            }

            const response = await fetch("/api/sandbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bindingId: selectedBindingId,
                    request: requestParsed,
                    execute: true
                })
            })

            if (!response.body) throw new Error("No response body");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // Helper to process a line
            const processLine = (line: string) => {
                if (!line.trim()) return;
                // SSE format: event: name\ndata: value\n\n
                // But we are reading chunks, so we need to buffer.
                // Actually parsing raw SSE is tricky with simple splits if data contains newlines.
                // Let's assume standard event-stream format handling or use a library, 
                // but for this simple implementation, we can try to parse "event:" and "data:" prefixes.
            };

            // Simplified SSE Parser
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n\n');
                // Keep the last partial chunk in buffer
                buffer = lines.pop() || '';

                for (const block of lines) {
                    const eventMatch = block.match(/^event: (.*)$/m);
                    const dataMatch = block.match(/^data: ([\s\S]*)$/m); // Match rest of lines as data? No, usually data is one line or multiline with data: prefix. 
                    // Let's assume simple implementation where data is single line JSON for now as per my server implementation.

                    if (eventMatch && dataMatch) {
                        const event = eventMatch[1].trim();
                        const dataStr = dataMatch[1].trim();
                        let data;
                        try {
                            data = JSON.parse(dataStr);
                        } catch {
                            data = dataStr;
                        }

                        setResult((prev: any) => {
                            const next = { ...(prev || { trace: [] }) };
                            if (event === 'trace') {
                                next.trace = [...(next.trace || []), data];
                            } else if (event === 'transformed_request') {
                                next.transformedRequest = data;
                            } else if (event === 'raw_response_chunk') {
                                // Append chunk to list
                                next.rawResponseChunks = [...(next.rawResponseChunks || []), data];
                            } else if (event === 'transformed_response_chunk') {
                                next.transformedResponse = data;
                            } else if (event === 'error') {
                                next.error = data;
                            }
                            return next;
                        });
                    }
                }
            }
        } catch (e) {
            console.error(e)
            setResult((prev: any) => ({ ...prev, error: String(e) }));
        } finally {
            setLoading(false)
        }
    }

    const handleCopyCurl = async () => {
        if (!selectedBindingId) return
        const url = `${window.location.origin}/api/bridge/${selectedBindingId}`
        const escapedJson = inputJson.replace(/'/g, "'\\''")
        const curlCommand = `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${escapedJson}'`

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(curlCommand)
                setCopiedCurl(true)
                setTimeout(() => setCopiedCurl(false), 2000)
            } else {
                throw new Error("Clipboard API not available")
            }
        } catch (e) {
            console.error("Clipboard copy failed", e)
            alert("Clipboard access failed. The cURL command has been logged to the browser console.")
            console.log(curlCommand)
        }
    }

    return (
        <div className="container py-8 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Protocol Sandbox</h2>
                    <p className="text-muted-foreground">Test and debug your protocol transformations.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="w-64">
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                            value={selectedBindingId}
                            onChange={(e) => setSelectedBindingId(e.target.value)}
                        >
                            <option value="" disabled>Select Binding...</option>
                            {bindings.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.targetProtocol})</option>
                            ))}
                        </select>
                    </div>
                    <Button onClick={handleTest} disabled={loading || !selectedBindingId}>
                        <Play className="mr-2 h-4 w-4" />
                        {loading ? "Testing..." : "Test Transformation"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Input Column */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="py-3 px-4 border-b bg-muted/50 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Input (Lingzhu Protocol)</CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleCopyCurl}
                            disabled={!selectedBindingId}
                            title="Copy cURL Command"
                        >
                            {copiedCurl ? (
                                <Check className="h-3 w-3 text-green-500" />
                            ) : (
                                <Copy className="h-3 w-3" />
                            )}
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        <textarea
                            className="w-full h-full p-4 font-mono text-sm resize-none bg-transparent focus:outline-none"
                            value={inputJson}
                            onChange={(e) => setInputJson(e.target.value)}
                        />
                    </CardContent>
                </Card>

                {/* Transformed Column */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="py-3 px-4 border-b bg-muted/50">
                        <CardTitle className="text-sm font-medium">Transformed Request (Target)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-auto bg-muted/20">
                        {result?.transformedRequest ? (
                            <pre className="p-4 font-mono text-xs text-green-600">
                                {JSON.stringify(result.transformedRequest, null, 2)}
                            </pre>
                        ) : (
                            <div className="p-4 text-sm text-muted-foreground">Waiting for test...</div>
                        )}
                    </CardContent>
                </Card>

                {/* Output/Trace Column */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="py-3 px-4 border-b bg-muted/50">
                        <CardTitle className="text-sm font-medium">Response & Trace</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 overflow-auto space-y-4">
                        {result ? (
                            <>
                                <div>
                                    <Label className="text-xs font-bold text-muted-foreground">TRACE</Label>
                                    <div className="mt-1 space-y-1">
                                        {result.trace?.map((t: string, i: number) => (
                                            <div key={i} className="text-xs font-mono">{t}</div>
                                        ))}
                                    </div>
                                </div>

                                {/* Raw Response Chunks List */}
                                {(result.rawResponseChunks && result.rawResponseChunks.length > 0) && (
                                    <div>
                                        <Label className="text-xs font-bold text-muted-foreground">RAW RESPONSE (STREAM)</Label>
                                        <div className="mt-1 space-y-2">
                                            {result.rawResponseChunks.map((chunk: any, i: number) => (
                                                <details key={i} className="group text-xs open:bg-muted/10">
                                                    <summary className="cursor-pointer font-mono bg-muted p-1 rounded hover:bg-muted/80 select-none">
                                                        Chunk {chunk.index} <span className="text-[10px] text-muted-foreground ml-2">({chunk.data.length} chars)</span>
                                                    </summary>
                                                    <div className="mt-1 p-2 bg-muted/30 rounded overflow-auto border-l-2 border-muted">
                                                        <pre className="whitespace-pre-wrap break-all">
                                                            {(() => {
                                                                try {
                                                                    // Try pretty print if it looks like JSON or just dump text
                                                                    return chunk.data.startsWith('{') || chunk.data.startsWith('[')
                                                                        ? JSON.stringify(JSON.parse(chunk.data), null, 2)
                                                                        : chunk.data;
                                                                } catch {
                                                                    return chunk.data;
                                                                }
                                                            })()}
                                                        </pre>
                                                        <div className="mt-2 border-t pt-2">
                                                            <div className="text-[10px] font-bold text-muted-foreground mb-1">TRANSFORMED (PREVIEW)</div>
                                                            <pre className="text-[10px] text-blue-600">
                                                                {chunk.transformed === undefined ? 'undefined' : JSON.stringify(chunk.transformed, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.transformedResponse && (
                                    <div>
                                        <Label className="text-xs font-bold text-muted-foreground">TRANSFORMED RESPONSE</Label>
                                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto text-blue-600">
                                            {JSON.stringify(result.transformedResponse, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {result.error && (
                                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                                        Error: {result.error}
                                        {result.details && <div className="text-xs mt-1 opacity-70">{result.details}</div>}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">No results yet.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
