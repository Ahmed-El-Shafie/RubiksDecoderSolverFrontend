import { moves } from './moves.js';
import { getBlankPosition, getBlankPositionChar } from './state_helpers.js';
import { mod, getColNumRotationMiddleOffset } from './math_helpers.js';

export const animateMove = function(scene, stateArray, rows, move, decoderSettings, frameRate) {
	if (move.type == "slide") {
		var [blankRow, blankCol] = getBlankPosition(stateArray);
		const squareToSlide = stateArray[move.startRow][blankCol];
		updateStateSlide(stateArray, blankCol, blankRow, move.startRow);
		return animateSlide(scene, rows, blankRow, decoderSettings, move.startRow, squareToSlide, (move.startRow - blankRow) * decoderSettings.rowHeight, frameRate);
	} else {
		updateStateRotation(stateArray, move.row, move.direction * move.rotateAmount, decoderSettings.numColumns);
		return animateRotation(scene, rows[move.row], -move.direction * move.rotateAmount * decoderSettings.colAngleMultiplier, decoderSettings.colAngleMultiplier, frameRate);
	}
}

export const animateSlide = function(scene, rows, blankRow, decoderSettings, startRow, squareToSlide, yChange, frameRate = 15) {
	squareToSlide.setParent(rows[blankRow]);
	squareToSlide.position.y = (blankRow - startRow) * decoderSettings.rowHeight;
	squareToSlide.rowNum = blankRow;
	squareToSlide.animations = [];
	const slide = new BABYLON.Animation("slide", "position.y", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
	const keyFrames = [];
	const yPos = squareToSlide.position.y;
	keyFrames.push({
		frame: 0,
		value: yPos
	});
	keyFrames.push({
		frame: 1,
		value: yPos + yChange
	});
	slide.setKeys(keyFrames);
	squareToSlide.animations.push(slide);
	return scene.beginAnimation(squareToSlide, 0, 1);
}

export const animateRotation = function(scene, rowToRotate, rotationAmount, colAngleMultiplier, frameRate = 15) {
	rowToRotate.animations = [];
	const rotate = new BABYLON.Animation("rotation", "rotation.y", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
	const keyFrames = [];
	const currRotation = rowToRotate.rotation.y;
	const frames = Math.ceil(Math.abs(rotationAmount / colAngleMultiplier));
	keyFrames.push({
		frame: 0,
		value: currRotation
	});
	keyFrames.push({
		frame: frames,
		value: currRotation + rotationAmount
	});
	rotate.setKeys(keyFrames);
	rowToRotate.animations.push(rotate);
	return scene.beginAnimation(rowToRotate, 0, frames);
}

export const centerBlankCol = function(scene, stateArray, rows, decoderSettings, viewRotation, frameRate) {
	var blankCol = getBlankPosition(stateArray)[1];
	const colNumRotationMiddleOffset = getColNumRotationMiddleOffset(viewRotation, decoderSettings.colAngleMultiplier);
	const rightRange = mod(blankCol - colNumRotationMiddleOffset, decoderSettings.numColumns);
	const leftRange = decoderSettings.numColumns - rightRange;
	const rotationAmount = leftRange < rightRange ? leftRange * decoderSettings.colAngleMultiplier : -rightRange * decoderSettings.colAngleMultiplier;
	if (Math.abs(rotationAmount) <= .1) {
		return [null, 0];
	}
	const frames = Math.ceil(Math.abs(rotationAmount / decoderSettings.colAngleMultiplier));
	var rowAnimation;
	rows.forEach(row => {
		row.animations = [];
		const rotate = new BABYLON.Animation("rotate", "rotation.y", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
		const rotateFrames = [];
		const rotation = row.rotation.y;
		rotateFrames.push({
			frame: 0,
			value: rotation
		});
		rotateFrames.push({
			frame: frames,
			value: rotation - rotationAmount
		});
		rotate.setKeys(rotateFrames);
		row.animations.push(rotate);
		rowAnimation = scene.beginAnimation(row, 0, frames);
	})
	return [rowAnimation, rotationAmount];
}

export const parseAndSimulateMoves = function(stateArrayChar, movesJson) {
	var stateArrayCharCopy = new Array(stateArrayChar.length);
	for (var i = 0; i < stateArrayChar.length; i++) {
		stateArrayCharCopy[i] = stateArrayChar[i].slice();
	}
	var solutionMoves = [];
	movesJson.forEach(moveJson => parseAndSimulateMove(stateArrayCharCopy, solutionMoves, moveJson));
	return [solutionMoves, stateArrayCharCopy];
}

const parseAndSimulateMove = function(stateArrayChar, solutionMoves, moveJson) {
	if ('rotateAmount' in moveJson) {
		var rotateMove = Object.assign({}, moves[moveJson.moveType]);
		rotateMove["rotateAmount"] = moveJson.rotateAmount;
		solutionMoves.push(rotateMove);
		const rightRotationAmount = rotateMove.direction * rotateMove.rotateAmount;
		const rowArray = stateArrayChar[rotateMove.row];
		stateArrayChar[rotateMove.row] = rowArray.slice(-rightRotationAmount).concat(rowArray.slice(0, -rightRotationAmount));
	} else {
		var slideMove = Object.assign({}, moves[moveJson.moveType])
		solutionMoves.push(slideMove);
		var [blankRow, blankCol] = getBlankPositionChar(stateArrayChar);
		stateArrayChar[blankRow][blankCol] = stateArrayChar[slideMove.startRow][blankCol];
		stateArrayChar[slideMove.startRow][blankCol] = '-';
	}
}

export const updateStateRotation = function(stateArray, rowNum, rightRotationAmount, numColumns) {
	const rowArray = stateArray[rowNum];
	stateArray[rowNum] = rowArray.slice(-rightRotationAmount).concat(rowArray.slice(0, -rightRotationAmount));
	stateArray[rowNum].forEach(square => square && (square.colNum = mod(square.colNum + rightRotationAmount, numColumns)));
}

export const updateStateSlide = function(stateArray, slideCol, toRow, startRow) {
	stateArray[toRow][slideCol] = stateArray[startRow][slideCol];
	stateArray[startRow][slideCol] = null;
}

export const slideSameColumn = function(leftThreshold, rightThreshold, startX, currentX) {
	return startX > rightThreshold && currentX > rightThreshold ||
		leftThreshold < startX && startX < rightThreshold && leftThreshold < currentX && currentX < rightThreshold ||
		startX < leftThreshold && currentX < leftThreshold;
}