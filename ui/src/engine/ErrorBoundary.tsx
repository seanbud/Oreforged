import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(50, 0, 0, 0.9)', color: '#fff',
                    padding: '20px', overflow: 'auto', zIndex: 99999,
                    fontFamily: 'monospace', whiteSpace: 'pre-wrap'
                }}>
                    <h1 style={{ color: '#ff4444' }}>CRASH DETECTED</h1>
                    <h2 style={{ color: '#ffaaaa' }}>{this.state.error?.name}: {this.state.error?.message}</h2>
                    <br />
                    <div style={{ backgroundColor: '#000', padding: '10px', border: '1px solid #555' }}>
                        {this.state.errorInfo?.componentStack || "No stack trace available"}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px', padding: '10px 20px', fontSize: '20px',
                            cursor: 'pointer', backgroundColor: '#fff', color: '#000'
                        }}
                    >
                        RELOAD APPLICATION
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
