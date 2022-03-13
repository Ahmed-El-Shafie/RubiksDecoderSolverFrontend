export const mod = (a, n) => ((a % n) + n) % n;

/*
Gets the column number facing the front. A decimal number from 0 to numColumns where 0 is the leftmost part of the first square.
*/
export function getColNumRotation(viewRotation, colAngleMultiplier) {
	return mod(viewRotation + colAngleMultiplier / 2, 2 * Math.PI) / colAngleMultiplier;
}

/*
Gets the column number facing the front. A decimal number from 0 to numColumns where 0 is the centre of the first square.
*/
export function getColNumRotationMiddleOffset(viewRotation, colAngleMultiplier) {
	return mod(viewRotation, 2 * Math.PI) / colAngleMultiplier;
}