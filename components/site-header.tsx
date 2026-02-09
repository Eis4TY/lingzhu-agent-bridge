"use client";

import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Github, BookOpen, User, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function SiteHeader() {
    const { user, logout } = useAuth();

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
                    <Link
                        href="https://rokid.mintlify.app"
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-foreground/80 text-foreground/60 hidden sm:flex items-center gap-1 text-sm font-medium"
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden sm:inline-block">Docs</span>
                    </Link>
                    <Link
                        href="https://github.com/Eis4TY/lingzhu-agent-bridge"
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-foreground/80 text-foreground/60 hidden sm:flex items-center gap-1 text-sm font-medium"
                    >
                        <Github className="h-4 w-4" />
                        <span className="hidden sm:inline-block">GitHub</span>
                    </Link>
                    <ModeToggle />

                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <User className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/settings">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => logout()}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button variant="default" size="sm" asChild>
                            <Link href="/login">Login</Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}
