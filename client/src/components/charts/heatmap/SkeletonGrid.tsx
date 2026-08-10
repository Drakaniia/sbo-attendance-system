import { CELL_SIZE } from './color';

export function SkeletonGrid({ rows }: { rows: number }) {
	return (
		<div className="space-y-[3px]">
			{Array.from({ length: rows }, (_, r) => (
				<div
					key={r}
					className="flex items-center gap-[3px]"
				>
					{rows > 1 && (
						<div className="w-10 shrink-0 flex justify-end pr-2">
							<div
								className="bg-white/[0.03] rounded-sm animate-pulse"
								style={{
									width: 20,
									height: 8,
								}}
							/>
						</div>
					)}
					{Array.from({ length: 24 }, (_, c) => (
						<div
							key={c}
							className="rounded-[2px] bg-white/[0.03] animate-pulse"
							style={{
								width: CELL_SIZE,
								height: CELL_SIZE,
								animationDelay: `${(r * 24 + c) * 15}ms`,
							}}
						/>
					))}
				</div>
			))}
		</div>
	);
}
