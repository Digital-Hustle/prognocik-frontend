import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { PageError } from "@/widgets/PageError";

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		// В лог — только тип ошибки и стек компонентов, без данных выписки и ответов API
		if (__IS_DEV__) console.error(error.name, info.componentStack);
	}

	render() {
		return this.state.hasError ? <PageError /> : this.props.children;
	}
}
