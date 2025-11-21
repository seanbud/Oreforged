import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Define the C++ binding interface
declare global {
    interface Window {
        logFromUI: (seq: string, req: string) => void;
    }
}

// Override console.log to forward to C++
const originalLog = console.log;
console.log = (...args) => {
    originalLog(...args);
    // Convert args to string
    const msg = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    if (window.logFromUI) {
        window.logFromUI("0", msg);
    }
};

// Also forward errors
const originalError = console.error;
console.error = (...args) => {
    originalError(...args);
    const msg = "[ERROR] " + args.map(arg => {
        if (arg instanceof Error) {
            return arg.message + '\n' + arg.stack;
        }
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');

    if (window.logFromUI) {
        window.logFromUI("0", msg);
    }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
