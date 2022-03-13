import * as elements from './elements.js';
import { parseAndSimulateMoves } from './move_helpers.js';
import { api, updateSolveApiStatus } from './api_pinger.js';
import { interruptDemoRotation } from './demo_rotation_helpers.js';
import { updatePlaybackControls, updateCursorAfterPlay } from './playback_helpers.js';
import { getColNumRotationMiddleOffset } from './math_helpers.js';

export function validColors() {
	for (let i = 0; i < elements.colorButtons.length; i++) {
		var colorButton = elements.colorButtons[i];
		if (colorButton.classList.contains("fa-caret-up") || colorButton.classList.contains("fa-caret-down")) {
			return false;
		}
	};
	return true;
}

export function getSolution(stateArray, playbackInfo, rotationSettings, rows) {
	var stateCharArray = stateArray.map(
		row => row.map(square => square ? square.colorChar : '-')
	);
	return fetch(api + "solve?" +
		`rows=${stateCharArray[0].join("")}&` +
		`rows=${stateCharArray[1].join("")}&` +
		`rows=${stateCharArray[2].join("")}`)
		.then(res => {
			document.getElementById("solveLoadingIcon").remove();
			elements.solveButton.classList.remove("loading");
			for (let button of elements.mainButtons) {
				button.disabled = false;
			}
			return res.json().then(movesJson => {
				if (movesJson.length == 0) {
					elements.solveButton.innerText = "ALREADY SOLVED";
					return false;
				} else {
					interruptDemoRotation(rotationSettings, rows);
					elements.solveButton.innerText = "SOLVE FOR ME";
					playbackInfo.playbackFirst = stateCharArray;
					// There are many possible solved states, so we need to simulate moves to get the last one (for playback "last" button)
					[playbackInfo.playbackMoves, playbackInfo.playbackLast] = parseAndSimulateMoves(stateCharArray, movesJson);
					playbackInfo.currentMoveNum = 0;
					return true;
				}
			});
		})
		.catch(error => {
			console.log(error);
			elements.solveButton.classList.remove("loading");
			for (let button of elements.mainButtons) {
				button.disabled = false;
			}
			updateSolveApiStatus(error.response);
			return false;
		});
}

export function solutionPlaybackMode(scene, canvas, playbackInfo, decoderSettings, rotationSettings, rows) {
	playbackInfo.movePlaying = true; // To prevent mouse rotation during animation
	scene.hoverCursor = "auto";
	canvas.style.cursor = "auto";

	elements.colorSelector.style.display = "none";
	elements.infoButton.disabled = true;
	elements.solveButton.style.display = "none";
	elements.scrambleButton.style.display = "none";
	elements.resetButton.style.display = "none";

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
		value: 16
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
		value: -.5
	});
	pan.setKeys(panFrames);
	camera.animations.push(pan);
	scene.beginAnimation(camera, 0, 7);

	/*
	Calculates how much to rotate decoder by to center the nearest column
	*/
	const colNumRotationMiddleOffset = getColNumRotationMiddleOffset(rotationSettings.viewRotation, decoderSettings.colAngleMultiplier);
	const leftRange = colNumRotationMiddleOffset - Math.floor(colNumRotationMiddleOffset);
	const rightRange = Math.ceil(colNumRotationMiddleOffset) - colNumRotationMiddleOffset;
	const rotationAmount = leftRange < rightRange ? leftRange * decoderSettings.colAngleMultiplier : -rightRange * decoderSettings.colAngleMultiplier;
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
			frame: 7,
			value: rotation - rotationAmount
		});
		rotate.setKeys(rotateFrames);
		row.animations.push(rotate);
		rowAnimation = scene.beginAnimation(row, 0, 7);
	}
	);
	rotationSettings.viewRotation -= rotationAmount;
	rowAnimation.onAnimationEnd = () => {
		playbackInfo.movePlaying = false;
		updateCursorAfterPlay(scene, canvas);
		elements.playbackSettingsMenu.style.display = "block";
		elements.backButton.style.display = "block";
		elements.playbackControls.style.display = "block";
		elements.playbackMeterContainer.style.display = "block";
		elements.infoButton.disabled = false;
		updatePlaybackControls(playbackInfo);
		if (playbackInfo.playbackPauseIndex == 1) {
			elements.playbackPauseMeterContainer.style.display = "block";
		}
	};
}