// All distances are CSS pixels; velocity is pixels per millisecond.
export const GESTURE = Object.freeze({
	intent: 8,
	distance: 0.28,
	flickVelocity: 0.45,
	flickDistance: 10,
	projectionMs: 160,
	velocityWindowMs: 90,
	maxTurn: 0.92,
});

export const clampTurn = function (turn) {
	return Math.max(-GESTURE.maxTurn, Math.min(GESTURE.maxTurn, turn));
};

export const releaseStep = function (distance, velocity, pixelsPerStep) {
	const projected = distance + velocity * GESTURE.projectionMs;
	const deliberate = Math.abs(distance) >= pixelsPerStep * GESTURE.distance;
	const flick = Math.abs(distance) >= GESTURE.flickDistance && Math.abs(velocity) >= GESTURE.flickVelocity;
	if (!deliberate && !flick) return 0;
	// A recent reversal can cancel a long drag or choose the opposite neighbor.
	if (Math.abs(projected) < pixelsPerStep * GESTURE.distance) return 0;
	return Math.sign(projected);
};

export const releaseVelocity = function (samples, now) {
	const recent = samples.filter(function (sample) { return now - sample.time <= GESTURE.velocityWindowMs; });
	const first = recent[0];
	const last = recent.at(-1);
	if (!first || !last || last.time - first.time < 8) return 0;
	return (last.position - first.position) / (last.time - first.time);
};
