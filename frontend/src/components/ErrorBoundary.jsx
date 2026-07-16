import React from "react";
import logger from "../utils/logger";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    logger.error("Error Boundary triggered", {
      message: error.message,
      stack: error.stack,
    });
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("ErrorBoundary caught exception", {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      message: error.message,
    });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#07080F] px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-[#E8734A]/10 border border-[#E8734A]/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl text-[#E8734A] font-bold">!</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-white/50 mb-4">
              We're sorry for the inconvenience. Please refresh the page to try again.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="text-left text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-xl p-4 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                logger.info("User refreshing page after error");
                window.location.reload();
              }}
              className="bg-[#E8734A] hover:bg-[#D4633D] text-white font-semibold px-8 py-3 rounded-full transition-all duration-300"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

