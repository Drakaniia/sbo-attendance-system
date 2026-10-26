import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@mantine/hooks';

/**
 * Counts a numeric value up (or between values) with an ease-out curve.
 * Reduced motion snaps straight to the target.
 */
export function useAnimatedNumber(target: number, duration = 900) {
	const reduceMotion = useReducedMotion();
	const [display, setDisplay] = useState(() => (reduceMotion ? target : 0));
	const fromRef = useRef(reduceMotion ? target : 0);
	const frameRef = useRef<number | null>(null);

	useEffect(() => {
		if (reduceMotion) {
			setDisplay(target);
			fromRef.current = target;
			return;
		}

		const from = fromRef.current;
		if (from === target) return;

		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min((now - start) / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			setDisplay(Math.round(from + (target - from) * eased));
			if (progress < 1) {
				frameRef.current = requestAnimationFrame(tick);
			} else {
				fromRef.current = target;
			}
		};

		frameRef.current = requestAnimationFrame(tick);
		return () => {
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
			fromRef.current = display;
		};
		// `display` is intentionally excluded — it changes every frame.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, duration, reduceMotion]);

	return display;
}
