import { cssCharColors, charColors } from './colors.js';
import { mod, getColNumRotation, getColNumRotationMiddleOffset } from './math_helpers.js';

export function updateColorButton(colorButton, numValue) {
	colorButton.setAttribute("numUsed", numValue);
	const correctNum = correctColorNum(colorButton);
	if (numValue == correctNum) {
		colorButton.classList.remove("fa-caret-up", "fa-caret-down");
	} else if (numValue < correctNum) {
		colorButton.classList.add("fa-caret-up");
	} else {
		colorButton.classList.add("fa-caret-down");
	}
}

export function correctColorNum(colorButton) {
	if (colorButton.id == "blankSquare") {
		return 1;
	} else if (colorButton.id == "whiteSquare") {
		return 2;
	} else {
		return 3;
	}
}

export function getClickCoordinates(pickedPoint, viewRotation, decoderSettings) {
	const colNumRotation = getColNumRotation(viewRotation, decoderSettings.colAngleMultiplier);
	const leftRange = colNumRotation - Math.floor(colNumRotation);
	const leftThreshold = -Math.sin(leftRange * decoderSettings.colAngleMultiplier) * decoderSettings.rowRadius;
	const rightRange = Math.ceil(colNumRotation) - colNumRotation;
	const rightThreshold = Math.sin(rightRange * decoderSettings.colAngleMultiplier) * decoderSettings.rowRadius;
	const upThreshold = decoderSettings.rowHeight / 2;
	const downThreshold = -upThreshold;
	const pickedX = pickedPoint.x;
	const pickedY = pickedPoint.y;
	var colNum;
	if (pickedX < leftThreshold) {
		colNum = mod(Math.floor(colNumRotation) - 1, decoderSettings.numColumns);
	} else if (pickedX < rightThreshold) {
		colNum = Math.floor(colNumRotation);
	} else {
		colNum = mod(Math.floor(colNumRotation) + 1, decoderSettings.numColumns);
	}
	var rowNum;
	if (pickedY < downThreshold) {
		rowNum = 2;
	} else if (pickedY < upThreshold) {
		rowNum = 1;
	} else {
		rowNum = 0;
	}
	return [rowNum, colNum];
}

/*
Gets the viewing angle of the squares in a specific column.
*/
export function getSquareAngle(squareCol, viewRotation, decoderSettings) {
	const colNumRotation = getColNumRotation(viewRotation, decoderSettings.colAngleMultiplier);
	const colNum = Math.floor(colNumRotation);
	const colNumRotationMiddleOffset = getColNumRotationMiddleOffset(viewRotation, decoderSettings.colAngleMultiplier);
	const centerSquareAngle = (Math.round(colNumRotationMiddleOffset) - colNumRotationMiddleOffset) * decoderSettings.colAngleMultiplier;
	if (squareCol == mod(colNum - 1, decoderSettings.numColumns)) {
		return mod(centerSquareAngle - decoderSettings.colAngleMultiplier, 2 * Math.PI);
	} else if (squareCol == colNum) {
		return mod(centerSquareAngle, 2 * Math.PI);
	} else {
		return mod(centerSquareAngle + decoderSettings.colAngleMultiplier, 2 * Math.PI);
	}
}

export function applyColor(square, selectedColor, stateArray) {
	var buttonColor = selectedColor.style.backgroundColor;
	if (selectedColor.id == "blankSquare") {
		stateArray[square.rowNum][square.colNum] = null;
		square.dispose();
	} else {
		var colorChar = cssCharColors[buttonColor];
		var audio = document.getElementById("colorApply");
		audio.volume = .5;
		audio.play();
		square.colorChar = colorChar;
		var [r, g, b] = charColors[colorChar];
		square.material.diffuseColor = new BABYLON.Color3(r, g, b);
	}
}

export function createColorCursor(selectedColor) {
	const colorCursor = document.createElement("div");
	colorCursor.className = "colorCursor";
	document.body.appendChild(colorCursor);
	colorCursor.style.backgroundColor = selectedColor.style.backgroundColor;
	colorCursor.style.opacity = 0;
	return colorCursor;
}