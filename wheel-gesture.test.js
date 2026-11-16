import { describe, expect, test } from 'bun:test';
import { clampTurn, releaseStep, releaseVelocity } from './wheel-gesture.js';

describe('wheel release intent', function () {
	test('a short slow drag returns; a deliberate drag chooses exactly one neighbor', function () {
		expect(releaseStep(24, 0, 160)).toBe(0);
		expect(releaseStep(60, 0, 160)).toBe(1);
		expect(releaseStep(-60, 0, 160)).toBe(-1);
		expect(releaseStep(900, 3, 160)).toBe(1);
		expect(clampTurn(6)).toBe(0.92);
	});
	test('a short flick commits, but pointer jitter does not', function () {
		expect(releaseStep(18, 0.8, 160)).toBe(1);
		expect(releaseStep(-18, -0.8, 160)).toBe(-1);
		expect(releaseStep(4, 1, 160)).toBe(0);
	});
	test('recent motion can reverse or cancel the initial drag', function () {
		expect(releaseStep(65, -0.9, 160)).toBe(-1);
		expect(releaseStep(65, -0.3, 160)).toBe(0);
		expect(releaseStep(-65, 0.9, 160)).toBe(1);
	});
	test('velocity expires when held; old motion cannot cause a release flick', function () {
		const samples = [{ position: 0, time: 0 }, { position: 30, time: 40 }, { position: 30, time: 300 }];
		expect(releaseVelocity(samples, 300)).toBe(0);
		expect(releaseVelocity([{ position: 0, time: 20 }, { position: -35, time: 70 }], 70)).toBe(-0.7);
	});
});
