"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
    this.setState({ errorInfo })

    // Log error to your analytics service here
    if (typeof window !== "undefined") {
      // Store error in localStorage for debugging
      try {
        const errors = JSON.parse(localStorage.getItem("build_errors") || "[]")
        errors.push(`${error.name}: ${error.message}`)
        localStorage.setItem("build_errors", JSON.stringify(errors.slice(-10))) // Keep last 10 errors
      } catch (e) {
        console.error("Failed to store error:", e)
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <div className="bg-black/30 backdrop-blur-sm border border-red-500/30 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-white/80 mb-6">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <div className="bg-black/50 p-3 rounded mb-4 overflow-auto max-h-32">
                <p className="text-red-300 text-sm font-mono">{this.state.error.toString()}</p>
              </div>
            )}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null })
                  window.location.reload()
                }}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
