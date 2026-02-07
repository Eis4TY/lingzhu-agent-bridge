import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <img src="/logo.png" alt="Logo" className="h-6 w-6" />
                    <span className="font-bold sm:inline-block">Lingzhu Agent Bridge</span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</Link>
                    <Link href="/sandbox" className="transition-colors hover:text-foreground/80 text-foreground/60">Sandbox</Link>
                    <Link href="/logs" className="transition-colors hover:text-foreground/80 text-foreground/60">Logs</Link>
                </nav>
                <div className="ml-auto flex items-center space-x-4">
                    <ModeToggle />
                </div>
            </div>
        </header>
    )
}
