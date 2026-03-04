import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown runtime error' };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#d2d2d2] flex items-center justify-center p-6">
          <div className="max-w-xl w-full border border-[#333] bg-[#151515] rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 text-[#ff6b6b] mb-4">
              <AlertTriangle size={22} />
              <h1 className="text-lg font-semibold">Something went wrong</h1>
            </div>
            <p className="text-sm text-[#a3a3a3] mb-4">
              The application hit an unexpected runtime error. You can reload to recover.
            </p>
            <pre className="text-xs bg-black/30 border border-[#2a2a2a] rounded-md p-3 overflow-auto text-[#fca5a5] mb-4">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              className="bg-[#00ffcc] hover:bg-[#00d6ad] text-black font-bold px-4 py-2 rounded-md"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
