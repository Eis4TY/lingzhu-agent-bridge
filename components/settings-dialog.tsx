"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { BridgeSettings } from "@/services/settings"

interface SettingsDialogProps {
    onClose: () => void
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
    const [apiKey, setApiKey] = React.useState("")
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        fetch("/api/settings")
            .then((res) => res.json())
            .then((data: BridgeSettings) => {
                setApiKey(data.apiKey || "")
                setLoading(false)
            })
            .catch((e) => {
                console.error("Failed to load settings", e)
                setLoading(false)
            })
    }, [])

    const handleSave = async () => {
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey }),
            })
            onClose()
        } catch (e) {
            console.error("Failed to save settings", e)
        }
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>Global Settings</DialogTitle>
                <DialogDescription>
                    Configure global settings for the Lingzhu Agent Bridge.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="apiKey">Bridge API Key</Label>
                    <Input
                        id="apiKey"
                        placeholder="e.g. sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={loading}
                    />
                    <p className="text-sm text-muted-foreground">
                        If set, all external calls to the bridge must include this key in the Authorization header: <code>Authorization: Bearer YOUR_KEY</code>.
                        Leave empty to disable authentication.
                    </p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
            </DialogFooter>
        </>
    )
}
