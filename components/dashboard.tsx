"use client"

import * as React from "react"
import { ProtocolBinding } from "@/services/binding"
import { BindingForm } from "@/components/binding-form"
import { SettingsDialog } from "@/components/settings-dialog"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Settings, Activity, Copy, Check } from "lucide-react"

export function Dashboard() {
    const [bindings, setBindings] = React.useState<ProtocolBinding[]>([])
    const [isNewOpen, setIsNewOpen] = React.useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
    const [editingBinding, setEditingBinding] = React.useState<ProtocolBinding | null>(null)
    const [healthStatus, setHealthStatus] = React.useState<Record<string, { status: 'unknown' | 'loading' | 'connected' | 'error', message?: string }>>({});
    const [copiedId, setCopiedId] = React.useState<string | null>(null)

    const fetchBindings = async () => {
        try {
            const res = await fetch("/api/bindings")
            const data = await res.json()
            setBindings(data)
        } catch (e) {
            console.error("Failed to fetch bindings", e)
        }
    }

    React.useEffect(() => {
        fetchBindings()
    }, [])

    const checkHealth = async (id: string) => {
        setHealthStatus(prev => ({ ...prev, [id]: { status: 'loading' } }));
        try {
            const res = await fetch(`/api/bindings/${id}/health`);
            const data = await res.json();
            setHealthStatus(prev => ({ ...prev, [id]: { status: data.status, message: data.message } }));
        } catch (e) {
            setHealthStatus(prev => ({ ...prev, [id]: { status: 'error', message: 'Check failed' } }));
        }
    };

    const handleCreate = async (data: Partial<ProtocolBinding>) => {
        try {
            await fetch("/api/bindings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            fetchBindings()
            setIsNewOpen(false)
        } catch (e) {
            console.error("Failed to create binding", e)
        }
    }

    const handleUpdate = async (id: string, data: Partial<ProtocolBinding>) => {
        try {
            await fetch(`/api/bindings/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            fetchBindings()
            setEditingBinding(null)
        } catch (e) {
            console.error("Failed to update binding", e)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/bindings/${id}`, {
                method: "DELETE",
            })
            fetchBindings()
        } catch (e) {
            console.error("Failed to delete binding", e)
        }
    }

    const toggleEnable = async (binding: ProtocolBinding) => {
        await handleUpdate(binding.id, { enabled: !binding.enabled })
    }

    const copyToClipboard = (id: string) => {
        const url = `${window.location.origin}/api/bridge/${id}`

        // Try using the Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    setCopiedId(id)
                    setTimeout(() => setCopiedId(null), 2000)
                })
                .catch(err => {
                    console.error('Failed to copy: ', err)
                })
        } else {
            // Fallback for non-secure contexts (e.g., HTTP on LAN)
            const textArea = document.createElement("textarea")
            textArea.value = url

            // Avoid scrolling to bottom
            textArea.style.top = "0"
            textArea.style.left = "0"
            textArea.style.position = "fixed"

            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()

            try {
                const successful = document.execCommand('copy')
                if (successful) {
                    setCopiedId(id)
                    setTimeout(() => setCopiedId(null), 2000)
                } else {
                    console.error('Fallback: Copy command was unsuccessful')
                }
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err)
            }

            document.body.removeChild(textArea)
        }
    }

    return (
        <div className="container py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">Manage your agent bridges and monitor their status.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Global Settings">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <SettingsDialog onClose={() => setIsSettingsOpen(false)} />
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> New Binding</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Binding</DialogTitle>
                                <DialogDescription>
                                    Connect a new AI Agent via Lingzhu Protocol.
                                </DialogDescription>
                            </DialogHeader>
                            <BindingForm
                                onSubmit={handleCreate}
                                onCancel={() => setIsNewOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bindings.map((binding) => (
                    <Card key={binding.id} className={!binding.enabled ? "opacity-60" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                    <span className="truncate max-w-[150px]">{binding.name}</span>
                                    <Badge variant={binding.enabled ? "default" : "secondary"}>
                                        {binding.targetProtocol}
                                    </Badge>
                                    {/* Health Status Indicator */}
                                    {healthStatus[binding.id]?.status === 'loading' && (
                                        <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" title="Checking..." />
                                    )}
                                    {healthStatus[binding.id]?.status === 'connected' && (
                                        <span className="h-2 w-2 rounded-full bg-green-500" title="Connected" />
                                    )}
                                    {healthStatus[binding.id]?.status === 'error' && (
                                        <span className="h-2 w-2 rounded-full bg-red-500" title={healthStatus[binding.id]?.message || "Error"} />
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate text-xs text-muted-foreground mt-2">
                                {binding.targetUrl}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                ID: {binding.id.slice(0, 8)}...
                            </p>
                        </CardContent>
                        <CardFooter className="justify-between">
                            <div className="flex items-center space-x-2">
                                <Switch checked={binding.enabled} onCheckedChange={() => toggleEnable(binding)} />
                                <span className="text-xs text-muted-foreground">{binding.enabled ? 'Active' : 'Disabled'}</span>
                            </div>
                            <div className="space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => checkHealth(binding.id)}
                                    title="Check Connection"
                                >
                                    <Activity className={`h-4 w-4 ${healthStatus[binding.id]?.status === 'loading' ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(binding.id)}
                                    title="Copy Bridge URL"
                                >
                                    {copiedId === binding.id ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                                <Dialog open={editingBinding?.id === binding.id} onOpenChange={(open) => !open && setEditingBinding(null)}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setEditingBinding(binding)}>
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Edit Binding</DialogTitle>
                                        </DialogHeader>
                                        <BindingForm
                                            initialData={binding}
                                            onSubmit={(data) => handleUpdate(binding.id, data)}
                                            onCancel={() => setEditingBinding(null)}
                                        />
                                    </DialogContent>
                                </Dialog>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the binding
                                                &quot;{binding.name}&quot; from your configuration.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(binding.id)}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardFooter>
                    </Card >
                ))
                }

                {
                    bindings.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            No bindings found. Create one to get started.
                        </div>
                    )
                }
            </div >
        </div >
    )
}
