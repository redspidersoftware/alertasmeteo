import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
                    <h1 className="text-3xl font-bold mb-4 text-red-500">Algo salió mal</h1>
                    <p className="mb-4 text-slate-300">Se ha producido un error inesperado en la aplicación.</p>
                    <pre className="bg-black/30 p-4 rounded text-xs font-mono text-red-200 mb-6 max-w-2xl overflow-auto border border-red-500/20">
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <button
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
