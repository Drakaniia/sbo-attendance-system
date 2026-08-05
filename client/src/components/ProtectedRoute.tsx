import { type PropsWithChildren } from 'react';

// DISABLED: auth bypassed - ProtectedRoute always renders children
export default function ProtectedRoute({ children }: PropsWithChildren) {
	return children;
}
