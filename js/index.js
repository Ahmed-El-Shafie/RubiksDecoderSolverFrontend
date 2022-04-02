import { charSquares, darkColors } from './colors.js';
import { getMoveDescription } from './moves.js';
import { createScene, renderDecoderState, createSquare } from './sceneCreator.js';
import { animateRotation, animateSlide, updateStateRotation, updateStateSlide, slideSameColumn } from './move_helpers.js';
import { getBlankRows } from './state_helpers.js';
import * as elements from './elements.js';
import { pingApi, updateSolveApiStatus } from './api_pinger.js';
import { updateColorButton, correctColorNum, getClickCoordinates, getSquareAngle, applyColor, createColorCursor } from './color_selector_helpers.js';
import { updatePlaybackControls, updatePauseMeterDisplay, afterPlayAnimationMoveHandler, playMove, updateCursorAfterPlay } from './playback_helpers.js';
import { startDemoRotation, interruptDemoRotation } from './demo_rotation_helpers.js';
import { validColors, getSolution, solutionPlaybackMode } from './solution_helpers.js';
import { mod, getColNumRotation } from './math_helpers.js';

if (window.location.hostname != "localhost" && window.location.protocol != "https") {
	window.location.replace(`https:${window.location.href.substring(window.location.protocol.length)}`);
}

pingApi().then(response => updateSolveApiStatus(response));
var pinger = setInterval(() => {
	pingApi().then(response => updateSolveApiStatus(response))
}, 10000);

const decoderSettings = {
	startStateCharArray: [['-', 'b', 'r', 'g', 'y', 'o'], ['w', 'b', 'r', 'g', 'y', 'o'], ['w', 'b', 'r', 'g', 'y', 'o']],
	rowHeight: 1.75,
	numRows: 3,
	numColumns: 6,
	rowRadius: 1.9
}
decoderSettings.rowDiameter = decoderSettings.rowRadius * 2;
decoderSettings.colAngleMultiplier = 2 * Math.PI / decoderSettings.numColumns;

const playbackInfo = {
	playbackMoves: null,
	playbackFirst: null,
	playbackLast: null,
	currentMoveNum: null,
	moveQueue: null,
	movePlaying: false,
	playbackSpeedSettings: [
		["SLOW", 1.5, 1500],
		["NORMAL", 2.25, 1000],
		["FAST", 3.8, 500]
	],
	playbackSpeedIndex: 1,
	playbackPauseSettings: ["OFF", "ON"],
	playbackPauseIndex: 0
}

var selectedColor = null;
var solvingMode = false;
var moveDescriptionDisplay = null;
var infoPageIndex = 0;
var numInfoPages = elements.infoModals.length;

function rowMeshHoverHandler(ev) {
	if (startX) {
		scene.hoverCursor = "move";
	} else if (playbackInfo.movePlaying) {
		scene.hoverCursor = "auto";
	} else {
		scene.hoverCursor = "pointer";
	}
}

function squareMeshHoverHandler(ev) {
	if (!solvingMode) {
		var [darkr, darkg, darkb] = darkColors[ev.meshUnderPointer.colorChar];
		const colorMat = ev.meshUnderPointer.material;
		colorMat.diffuseColor = new BABYLON.Color3(darkr, darkg, darkb);
	}
	if (startX) {
		scene.hoverCursor = "move";
	} else if (playbackInfo.movePlaying) {
		scene.hoverCursor = "auto";
	} else {
		scene.hoverCursor = "pointer";
	}
}

const canvas = document.getElementById("canvas");
const engine = new BABYLON.Engine(canvas, true);
var [scene, stateArray] = createScene(engine, decoderSettings, squareMeshHoverHandler, rowMeshHoverHandler);

var rows = scene.meshes.slice(0, decoderSettings.numRows);
const rotationSettings = {
	viewRotation: 0,
	initialRowRotation: null,
	initialRowRotationAnimations: [],
	demoRotationTimeout: null
}
startDemoRotation(scene, rotationSettings, rows);

elements.infoButton.addEventListener('click', () => {
	if (elements.infoModalContainer.style.opacity == 0) {
		elements.infoModalContainer.style.zIndex = "1";
		elements.infoModalContainer.style.opacity = "1";
		elements.solveButton.style.display = "none";
		elements.scrambleButton.style.display = "none";
		elements.resetButton.style.display = "none";
		elements.colorSelector.style.display = "none";
		elements.playbackControls.style.display = "none";
		elements.backButton.style.display = "none";
		elements.playbackSettingsMenu.style.display = "none";
		moveDescriptionDisplay = elements.moveDescriptionContainer.style.display;
		elements.moveDescriptionContainer.style.display = "none";
		elements.playbackMeterContainer.style.display = "none";
		elements.playbackPauseMeterContainer.style.display = "none";
		rows.forEach(row => row.setEnabled(false));
		elements.infoButton.innerText = "MAIN";
		elements.infoModals[infoPageIndex].style.display = "none";
		infoPageIndex = 0;
		elements.infoModals[infoPageIndex].style.display = "block";
		elements.infoPageNumber.innerText = `${1}/${numInfoPages}`;
		elements.infoPageLeftArrow.disabled = true;
		elements.infoPageRightArrow.disabled = false;
	} else {
		elements.infoModalContainer.style.zIndex = "-1";
		elements.infoModalContainer.style.opacity = "0";
		if (solvingMode) {
			elements.playbackControls.style.display = "block";
			elements.backButton.style.display = "block";
			elements.playbackSettingsMenu.style.display = "block";
			elements.playbackMeterContainer.style.display = "block";
			updatePauseMeterDisplay(playbackInfo);
			elements.moveDescriptionContainer.style.display = moveDescriptionDisplay;
		} else {
			elements.solveButton.style.display = "block";
			elements.scrambleButton.style.display = "block";
			elements.resetButton.style.display = "block";
			elements.colorSelector.style.display = "block";
		}
		rows.forEach(row => row.setEnabled(true));
		elements.infoButton.innerText = "INFO";
	}
});

elements.infoPageLeftArrow.addEventListener('click', () => {
	elements.infoModals[infoPageIndex].style.display = "none";
	infoPageIndex--;
	if (infoPageIndex == 0) {
		elements.infoPageLeftArrow.disabled = true;
	}
	if (infoPageIndex < numInfoPages - 1) {
		elements.infoPageRightArrow.disabled = false;
	}
	elements.infoPageNumber.innerText = `${infoPageIndex + 1}/${numInfoPages}`;
	elements.infoModals[infoPageIndex].style.display = "block";
});

elements.infoPageRightArrow.addEventListener('click', () => {
	elements.infoModals[infoPageIndex].style.display = "none";
	infoPageIndex++;
	if (infoPageIndex == numInfoPages - 1) {
		elements.infoPageRightArrow.disabled = true;
	}
	if (infoPageIndex > 0) {
		elements.infoPageLeftArrow.disabled = false;
	}
	elements.infoPageNumber.innerText = `${infoPageIndex + 1}/${numInfoPages}`;
	elements.infoModals[infoPageIndex].style.display = "block";
});

elements.solveButton.addEventListener('click', () => {
	clearInterval(pinger);
	solvingMode = true;
	if (selectedColor) {
		selectedColor.classList.remove("active");
		selectedColor = null;
		document.body.removeChild(colorCursor);
	}
	for (let button of elements.mainButtons) {
		button.disabled = true;
	}
	elements.solveButton.innerText = "";
	elements.solveButton.classList.add("loading");
	var solveLoadingIcon = document.createElement('span');
	solveLoadingIcon.id = 'solveLoadingIcon';
	elements.solveButton.appendChild(solveLoadingIcon);
	getSolution(stateArray, playbackInfo, rotationSettings, rows).then(showSolution => {
		if (showSolution) {
			onPointerUp();
			solutionPlaybackMode(scene, canvas, playbackInfo, decoderSettings, rotationSettings, rows);
		} else {
			solvingMode = false;
			pinger = setInterval(() => {
				pingApi().then(response => updateSolveApiStatus(response))
			}, 10000);
		}
	})
});

elements.scrambleButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	if (!elements.solveButton.classList.contains("error")) {
		elements.solveButton.disabled = false;
		elements.solveButton.innerText = "SOLVE FOR ME";
	}
	var startStateCharArrayCopy = decoderSettings.startStateCharArray.reduce((acc, row) => acc.concat(row), []); // Not using arr.flat() because it doesn't work in IE
	startStateCharArrayCopy.sort(() => 0.5 - Math.random());
	var newStateCharArray = [];
	for (let i = 0; i < decoderSettings.numRows; i++) {
		newStateCharArray.push(startStateCharArrayCopy.slice(i * decoderSettings.numColumns, (i + 1) * decoderSettings.numColumns));
	}
	stateArray = renderDecoderState(scene, decoderSettings, newStateCharArray, rows, squareMeshHoverHandler, rotationSettings.viewRotation);
	for (let i = 0; i < elements.colorButtons.length; i++) {
		updateColorButton(elements.colorButtons[i], correctColorNum(elements.colorButtons[i]));
	};
	startDemoRotation(scene, rotationSettings, rows);
});

elements.resetButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	if (!elements.solveButton.classList.contains("error")) {
		elements.solveButton.disabled = false;
		elements.solveButton.innerText = "SOLVE FOR ME";
	}
	stateArray = renderDecoderState(scene, decoderSettings, decoderSettings.startStateCharArray, rows, squareMeshHoverHandler, rotationSettings.viewRotation);
	for (let i = 0; i < elements.colorButtons.length; i++) {
		updateColorButton(elements.colorButtons[i], correctColorNum(elements.colorButtons[i]));
	};
	startDemoRotation(scene, rotationSettings, rows);
});

elements.backButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	elements.playbackSettingsMenu.style.display = "none";
	elements.playbackMeterContainer.style.display = "none";
	elements.playbackPauseMeterContainer.style.display = "none";
	elements.playbackMeter.style.width = 0;
	elements.moveDescriptionContainer.style.display = "none";
	elements.backButton.style.display = "none";
	elements.playbackControls.style.display = "none";
	elements.infoButton.disabled = true;
	playbackInfo.movePlaying = true;

	var camera = scene.cameras[0];
	camera.beta = 1.35;

	const frameRate = 15;
	const zoom = new BABYLON.Animation("zoom", "radius", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
	const keyFrames = [];
	const distance = camera.radius;
	keyFrames.push({
		frame: 0,
		value: distance
	});
	keyFrames.push({
		frame: 7,
		value: 20
	});
	zoom.setKeys(keyFrames);
	camera.animations.push(zoom);

	const pan = new BABYLON.Animation("zoom", "target.y", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
	const panFrames = [];
	const position = camera.target.y;
	panFrames.push({
		frame: 0,
		value: position
	});
	panFrames.push({
		frame: 7,
		value: -1
	});
	pan.setKeys(panFrames);
	camera.animations.push(pan);
	var panAnimation = scene.beginAnimation(camera, 0, 7);
	panAnimation.onAnimationEnd = () => {
		playbackInfo.movePlaying = false;
		updateCursorAfterPlay(scene, canvas);
		for (let button of [elements.solveButton, elements.scrambleButton, elements.resetButton]) {
			button.style.display = "block";
		}
		elements.colorSelector.style.display = "block";
		elements.infoButton.disabled = false;
		solvingMode = false;
		pinger = setInterval(() => {
			pingApi().then(response => updateSolveApiStatus(response))
		}, 10000);
	};
})
elements.playbackSpeedLeftArrow.addEventListener('click', () => {
	playbackInfo.playbackSpeedIndex = mod(playbackInfo.playbackSpeedIndex - 1, playbackInfo.playbackSpeedSettings.length);
	elements.playbackSpeedSetting.innerText = "SPEED: " + playbackInfo.playbackSpeedSettings[playbackInfo.playbackSpeedIndex][0];
})
elements.playbackSpeedRightArrow.addEventListener('click', () => {
	playbackInfo.playbackSpeedIndex = mod(playbackInfo.playbackSpeedIndex + 1, playbackInfo.playbackSpeedSettings.length);
	elements.playbackSpeedSetting.innerText = "SPEED: " + playbackInfo.playbackSpeedSettings[playbackInfo.playbackSpeedIndex][0];
})
elements.playbackModeLeftArrow.addEventListener('click', () => {
	playbackInfo.playbackPauseIndex = mod(playbackInfo.playbackPauseIndex - 1, playbackInfo.playbackPauseSettings.length);
	elements.playbackModeSetting.innerText = "PAUSES: " + playbackInfo.playbackPauseSettings[playbackInfo.playbackPauseIndex];
	updatePauseMeterDisplay(playbackInfo);
})
elements.playbackModeRightArrow.addEventListener('click', () => {
	playbackInfo.playbackPauseIndex = mod(playbackInfo.playbackPauseIndex + 1, playbackInfo.playbackPauseSettings.length);
	elements.playbackModeSetting.innerText = "PAUSES: " + playbackInfo.playbackPauseSettings[playbackInfo.playbackPauseIndex];
	updatePauseMeterDisplay(playbackInfo);
})
elements.firstButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	stateArray = renderDecoderState(scene, decoderSettings, playbackInfo.playbackFirst, rows, squareMeshHoverHandler, rotationSettings.viewRotation);
	playbackInfo.currentMoveNum = 0;
	elements.moveDescriptionContainer.style.display = "none";
	elements.playbackMeter.style.transition = "width .2s";
	elements.playbackMeter.style.width = 0;
	updatePlaybackControls(playbackInfo);
	startDemoRotation(scene, rotationSettings, rows);
});
elements.previousButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	playbackInfo.movePlaying = true;
	scene.hoverCursor = "auto";
	updatePlaybackControls(playbackInfo);
	var afterMoveAnimationHandler = () => {
		playbackInfo.movePlaying = false;
		playbackInfo.currentMoveNum--;
		updateCursorAfterPlay(scene, canvas);
		updatePlaybackControls(playbackInfo);
		rotationSettings.demoRotationTimeout = setTimeout(startDemoRotation, 10000, scene, rotationSettings, rows);
	};
	playMove(scene, stateArray, rows, playbackInfo, decoderSettings, rotationSettings, afterMoveAnimationHandler, true);
});

elements.playButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	if (elements.playButton.classList.contains("fa-pause")) {
		elements.playButton.classList.remove("fa-pause");
		clearTimeout(playbackInfo.moveQueue);
		elements.playbackPauseMeter.style.transition = "none";
		elements.playbackPauseMeter.style.width = "0%";
		updatePlaybackControls(playbackInfo);
	} else {
		elements.playButton.classList.add("fa-pause");
		updatePlaybackControls(playbackInfo);
		const afterPlayAnimationHandler = afterPlayAnimationMoveHandler(onPointerUp, startDemoRotation, scene, stateArray, rows, playbackInfo, decoderSettings, rotationSettings);
		playbackInfo.moveQueue = setTimeout(playMove(scene, stateArray, rows, playbackInfo, decoderSettings, rotationSettings, afterPlayAnimationHandler, 0));
	}
});
elements.nextButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	playbackInfo.movePlaying = true;
	scene.hoverCursor = "auto";
	updatePlaybackControls(playbackInfo);
	var afterMoveAnimationHandler = () => {
		playbackInfo.movePlaying = false;
		playbackInfo.currentMoveNum++;
		updateCursorAfterPlay(scene, canvas);
		updatePlaybackControls(playbackInfo);
		rotationSettings.demoRotationTimeout = setTimeout(startDemoRotation, 10000, scene, rotationSettings, rows);
	};
	playMove(scene, stateArray, rows, playbackInfo, decoderSettings, rotationSettings, afterMoveAnimationHandler);
});
elements.lastButton.addEventListener('click', () => {
	interruptDemoRotation(rotationSettings, rows);
	stateArray = renderDecoderState(scene, decoderSettings, playbackInfo.playbackLast, rows, squareMeshHoverHandler, rotationSettings.viewRotation);
	playbackInfo.currentMoveNum = playbackInfo.playbackMoves.length;
	elements.moveDescriptionContainer.style.display = "block";
	elements.moveDescription.style.display = "inline-block";
	elements.moveDescription.style.background = "steelblue";
	elements.moveDescription.innerText = playbackInfo.currentMoveNum + ". " + getMoveDescription(playbackInfo.playbackMoves[playbackInfo.currentMoveNum - 1]);
	elements.playbackMeter.style.transition = `width .2s`;
	elements.playbackMeter.style.width = `100%`;
	updatePlaybackControls(playbackInfo);
	startDemoRotation(scene, rotationSettings, rows);
});

for (let i = 0; i < elements.colorButtons.length; i++) {
	var colorButton = elements.colorButtons[i];
	colorButton.addEventListener('click', (evt) => {
		var colorSelectAudio = document.getElementById("colorSelect");
		colorSelectAudio.volume = .5;
		if (selectedColor) {
			selectedColor.classList.remove("active");
			document.body.removeChild(colorCursor);
		}
		if (evt.target == selectedColor) {
			selectedColor = null;
			colorCursor = null;
		} else {
			colorSelectAudio.play();
			evt.target.classList.add("active");
			selectedColor = evt.target;
			colorCursor = createColorCursor(selectedColor);
		}
	});
};

var startX;
var startY;
var pickedMesh;
var colorCursor;
var currentAnimation;

var onPointerDown = function(evt) {
	if (evt.button !== 0 || playbackInfo.movePlaying) {
		return;
	}
	interruptDemoRotation(rotationSettings, rows);
	const pick = scene.pick(evt.clientX, evt.clientY);
	const meshToPick = pick.pickedMesh;
	if (solvingMode || !meshToPick) { // No slides, individual row rotation, nor color select. Only whole decoder rotation.
		startX = evt.clientX;
		startY = evt.clientY;
		if (!playbackInfo.movePlaying) {
			scene.hoverCursor = "move";
			canvas.classList.add("dragCursor");
		}
		return;
	}
	if (!selectedColor) { // No color select and no whole decoder rotation. Only individual row rotation and slide.
		const pickedPoint = pick.pickedPoint;
		startX = pickedPoint.x;
		startY = pickedPoint.y;
		pickedMesh = meshToPick;
		scene.hoverCursor = "move";
		canvas.classList.add("dragCursor");
		return;
	}
	/*
	Rest is color selection
	*/
	if (meshToPick.name == "square") {
		var clickedSquareButtonId = charSquares[meshToPick.colorChar];
		applyColor(meshToPick, selectedColor, stateArray);
		var clickedSquareButton = document.getElementById(clickedSquareButtonId);
		updateColorButton(clickedSquareButton, Number(clickedSquareButton.getAttribute("numUsed")) - 1);
		updateColorButton(selectedColor, Number(selectedColor.getAttribute("numUsed")) + 1);
	} else if (selectedColor.id != "blankSquare") {
		var [rowClicked, colClicked] = getClickCoordinates(pick.pickedPoint, rotationSettings.viewRotation, decoderSettings);
		if (stateArray[rowClicked][colClicked]) {
			return;
		}
		const squareAngle = getSquareAngle(colClicked, rotationSettings.viewRotation, decoderSettings);
		var square = createSquare(scene, decoderSettings.rowRadius, decoderSettings.rowHeight - .2, new BABYLON.Color3.White, squareAngle, rows[rowClicked].position.y, squareMeshHoverHandler);
		square.setParent(rows[rowClicked]);
		square["rowNum"] = rowClicked;
		square["colNum"] = colClicked;
		applyColor(square, selectedColor, stateArray);
		stateArray[rowClicked][colClicked] = square;
		var blankSquare = document.getElementById("blankSquare");
		updateColorButton(blankSquare, Number(blankSquare.getAttribute("numUsed")) - 1);
		updateColorButton(selectedColor, Number(selectedColor.getAttribute("numUsed")) + 1);
	}
	if (validColors()) {
		elements.solveButton.disabled = false;
		elements.solveButton.innerText = "SOLVE FOR ME";
	} else {
		elements.solveButton.disabled = true;
		elements.solveButton.innerText = "INVALID COLORS";
	}
}

var onPointerUp = function() {
	const pick = scene.pick(scene.pointerX, scene.pointerY);
	const meshOver = pick.pickedMesh;
	canvas.classList.remove("dragCursor");
	if (meshOver && !playbackInfo.movePlaying) {
		scene.hoverCursor = "pointer";
		canvas.style.cursor = "pointer";
	} else {
		scene.hoverCursor = "auto";
		canvas.style.cursor = "auto";
	}
	startX = null;
	startY = null;
	pickedMesh = null;
	if (!elements.playButton.classList.contains("fa-pause") && !playbackInfo.movePlaying && !rotationSettings.demoRotationTimeout) {
		rotationSettings.demoRotationTimeout = setTimeout(startDemoRotation, 10000, scene, rotationSettings, rows);
	}
}

var onPointerMove = function(evt) {
	if (colorCursor) {
		colorCursor.style.opacity = 0.5;
		colorCursor.style.left = `${evt.clientX - 30}px`;
		colorCursor.style.top = `${evt.clientY - 30}px`;
	}
	if (!startX) {
		return;
	}
	if (!pickedMesh) { // Whole decoder rotation
		var currentX = evt.clientX;
		var currentY = evt.clientY;
		var diffX = currentX - startX;
		rows.forEach(row => row.rotation.y -= diffX / 100);
		rotationSettings.viewRotation -= diffX / 100;
		startX = currentX;
		startY = currentY;
		return;
	}
	var pickedPoint = scene.pick(evt.clientX, evt.clientY).pickedPoint;
	if (!pickedPoint) { // Mouse out of bounds after initiating slide or row rotation
		return;
	}
	var currentX = pickedPoint.x;
	var currentY = pickedPoint.y;
	var rowToRotate;
	var squareToSlide;
	if (pickedMesh.name == "square") {
		rowToRotate = pickedMesh.parent;
		squareToSlide = pickedMesh;
	} else {
		rowToRotate = pickedMesh;
	}
	/*
	Gathers thresholds for mouse drags. When one of these thresholds is passed by the mouse, an action (rotation or slide) may occur.
	*/
	const colNumRotation = getColNumRotation(rotationSettings.viewRotation, decoderSettings.colAngleMultiplier);
	const leftRange = colNumRotation - Math.floor(colNumRotation);
	const leftThreshold = -Math.sin(leftRange * decoderSettings.colAngleMultiplier) * decoderSettings.rowRadius;
	const rightRange = Math.ceil(colNumRotation) - colNumRotation;
	const rightThreshold = Math.sin(rightRange * decoderSettings.colAngleMultiplier) * decoderSettings.rowRadius;
	const upThreshold = decoderSettings.rowHeight / 2;
	const downThreshold = -upThreshold;
	const startColumn = (startX <= leftThreshold) - (startX >= rightThreshold); // -1, 0, or 1
	const currentColumn = (currentX <= leftThreshold) - (currentX >= rightThreshold); // -1, 0, or 1
	const startRow = 1 - (startY >= upThreshold) + (startY <= downThreshold);
	const currentRow = 1 - (currentY >= upThreshold) + (currentY <= downThreshold);
	const rotation = currentColumn - startColumn;
	if (currentY <= rowToRotate.position.y + decoderSettings.rowHeight / 2 &&
		currentY >= rowToRotate.position.y - decoderSettings.rowHeight / 2 &&
		currentColumn != startColumn) {
		if (currentAnimation) {
			currentAnimation.goToFrame(currentAnimation.toFrame);
		}
		if (!elements.solveButton.classList.contains("error") && elements.solveButton.innerText != "INVALID COLORS") {
			elements.solveButton.innerText = "SOLVE FOR ME";
		}
		updateStateRotation(stateArray, rowToRotate.rowNum, -rotation, decoderSettings.numColumns);
		currentAnimation = animateRotation(scene, rowToRotate, rotation * decoderSettings.colAngleMultiplier, decoderSettings.colAngleMultiplier);
		currentAnimation.onAnimationEnd = () => currentAnimation = null;
		startX = currentX;
		startY = currentY;
	}
	if (squareToSlide &&
		slideSameColumn(leftThreshold, rightThreshold, startX, currentX) &&
		squareToSlide.rowNum == startRow &&
		Math.abs(currentRow - startRow) == 1 &&
		getBlankRows(stateArray, squareToSlide.colNum).includes(currentRow)) {
		if (currentAnimation) {
			currentAnimation.goToFrame(currentAnimation.toFrame);
		}
		if (!elements.solveButton.classList.contains("error") && elements.solveButton.innerText != "INVALID COLORS") {
			elements.solveButton.innerText = "SOLVE FOR ME";
		}
		updateStateSlide(stateArray, squareToSlide.colNum, currentRow, startRow);
		const moveAmount = (startRow - currentRow) * decoderSettings.rowHeight;
		currentAnimation = animateSlide(scene, rows, currentRow, decoderSettings, startRow, squareToSlide, moveAmount);
		currentAnimation.onAnimationEnd = () => currentAnimation = null;
		startX = currentX;
		startY = currentY;
	}
}

canvas.addEventListener("pointerdown", onPointerDown, false);
canvas.addEventListener("pointerup", onPointerUp, false);
canvas.addEventListener("pointermove", onPointerMove, false);
canvas.addEventListener("pointerout", () => {
	if (colorCursor) {
		colorCursor.style.opacity = 0;
	}
	onPointerUp();
}, false);

engine.runRenderLoop(function() {
	scene.render();
});

window.addEventListener("resize", function() {
	engine.resize();
});