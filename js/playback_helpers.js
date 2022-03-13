import * as elements from './elements.js';
import { getMoveDescription, getOppositeMove } from './moves.js';
import { animateMove, centerBlankCol } from './move_helpers.js';

export function updatePlaybackControls(playbackInfo) {
	elements.playbackSpeedLeftArrow.disabled = false;
	elements.playbackSpeedRightArrow.disabled = false;
	elements.playbackModeLeftArrow.disabled = false;
	elements.playbackModeRightArrow.disabled = false;
	elements.backButton.disabled = false;
	elements.infoButton.disabled = false;
	elements.playButton.disabled = false;
	elements.firstButton.disabled = false;
	elements.previousButton.disabled = false;
	elements.nextButton.disabled = false;
	elements.lastButton.disabled = false;
	if (playbackInfo.movePlaying || elements.playButton.classList.contains("fa-pause")) {
		elements.playbackSpeedLeftArrow.disabled = true;
		elements.playbackSpeedRightArrow.disabled = true;
		elements.playbackModeLeftArrow.disabled = true;
		elements.playbackModeRightArrow.disabled = true;
		elements.backButton.disabled = true;
		elements.infoButton.disabled = true;
		elements.firstButton.disabled = true;
		elements.previousButton.disabled = true;
		elements.nextButton.disabled = true;
		elements.lastButton.disabled = true;
		if (!elements.playButton.classList.contains("fa-pause")) {
			elements.playButton.disabled = true;
		}
	} else if (playbackInfo.currentMoveNum == 0) {
		elements.firstButton.disabled = true;
		elements.previousButton.disabled = true;
	} else if (playbackInfo.currentMoveNum == playbackInfo.playbackMoves.length) {
		elements.nextButton.disabled = true;
		elements.lastButton.disabled = true;
		elements.playButton.disabled = true;
	}
}

export function updatePauseMeterDisplay(playbackInfo) {
	if (playbackInfo.playbackPauseSettings[playbackInfo.playbackPauseIndex] == "OFF") {
		elements.playbackPauseMeterContainer.style.display = "none";
	} else {
		elements.playbackPauseMeterContainer.style.display = "block";
	}
}

export const playMove = function(scene, stateArray, rows, playbackInfo, decoderSettings, rotationSettings, afterMoveAnimationHandler, reverse = false) {
	playbackInfo.movePlaying = true;
	elements.moveDescriptionContainer.style.display = "block";
	elements.moveDescription.style.background = "steelblue";
	var moveIndex;
	var move;
	var increment;
	if (reverse) {
		increment = -1;
		moveIndex = playbackInfo.currentMoveNum - 1;
		move = getOppositeMove(playbackInfo.playbackMoves[moveIndex]);
	} else {
		increment = 1;
		moveIndex = playbackInfo.currentMoveNum;
		move = playbackInfo.playbackMoves[moveIndex];
	}
	elements.moveDescription.innerText = (moveIndex + 1) + ". " + getMoveDescription(move);
	const playbackSpeedFPS = playbackInfo.playbackSpeedSettings[playbackInfo.playbackSpeedIndex][1];
	if (move.type == "slide") {
		var [rowAnimation, rotationAmount] = centerBlankCol(scene, stateArray, rows, decoderSettings, rotationSettings.viewRotation, playbackSpeedFPS);
		if (rowAnimation) {
			rotationSettings.viewRotation -= rotationAmount;
			var playbackMeterTime = rowAnimation.toFrame / playbackSpeedFPS;
			var playbackProgress = (playbackInfo.currentMoveNum + increment - increment / (rowAnimation.toFrame + 1)) / playbackInfo.playbackMoves.length * 100;
			elements.playbackMeter.style.transition = `width ${playbackMeterTime}s linear`;
			elements.playbackMeter.style.width = `${playbackProgress}%`;
			rowAnimation.onAnimationEnd = () => applyPlaybackMove(scene, stateArray, rows, move, playbackInfo, decoderSettings, playbackSpeedFPS, afterMoveAnimationHandler, increment);
		} else {
			applyPlaybackMove(scene, stateArray, rows, move, playbackInfo, decoderSettings, playbackSpeedFPS, afterMoveAnimationHandler, increment);
		}
	} else {
		applyPlaybackMove(scene, stateArray, rows, move, playbackInfo, decoderSettings, playbackSpeedFPS, afterMoveAnimationHandler, increment);
	}
}

const applyPlaybackMove = function(scene, stateArray, rows, move, playbackInfo, decoderSettings, playbackSpeedFPS, afterMoveAnimationHandler, increment) {
	var moveAnimation = animateMove(scene, stateArray, rows, move, decoderSettings, playbackSpeedFPS);
	moveAnimation.onAnimationEnd = afterMoveAnimationHandler;
	var playbackMeterTime = moveAnimation.toFrame / playbackSpeedFPS;
	var playbackProgress = (playbackInfo.currentMoveNum + increment) / playbackInfo.playbackMoves.length * 100;
	elements.playbackMeter.style.transition = `width ${playbackMeterTime}s linear`;
	elements.playbackMeter.style.width = `${playbackProgress}%`;
}

export function afterPlayAnimationMoveHandler(onPointerUp, startDemoRotation, scene, stateArray, rows, playbackInfo, decoderSettings, rotationSettings) {
	const afterPlayAnimationHandler = () => {
		playbackInfo.movePlaying = false;
		playbackInfo.currentMoveNum++;
		if (!elements.playButton.classList.contains("fa-pause")) {
			updateCursorAfterPlay(scene, canvas);
			updatePlaybackControls(playbackInfo);
			rotationSettings.demoRotationTimeout = setTimeout(startDemoRotation, 10000, scene, rotationSettings, rows);
			return;
		}
		const playbackPauseSetting = playbackInfo.playbackPauseSettings[playbackInfo.playbackPauseIndex];
		const playbackPauseTime = playbackInfo.playbackSpeedSettings[playbackInfo.playbackSpeedIndex][2];
		var pauseToApply = 0;
		if (playbackPauseSetting == "ON") {
			pauseToApply = playbackPauseTime;
			animatePauseMeter(playbackPauseTime);
		}
		if (playbackInfo.currentMoveNum < playbackInfo.playbackMoves.length) {
			playbackInfo.moveQueue = setTimeout(() => {
				if (playbackPauseSetting == "ON") {
					onPointerUp();
				}
				playMove(scene, stateArray, rows, playbackInfo, decoderSettings, rotationSettings, afterPlayAnimationHandler);
			}, pauseToApply);
		} else {
			playbackInfo.moveQueue = setTimeout(() => {
				solvedDisplay();
				updatePlaybackControls(playbackInfo);
			}, pauseToApply);
		}
	}
	return afterPlayAnimationHandler;
}

function animatePauseMeter(playbackPauseTime) {
	elements.playbackPauseMeter.style.transition = `width ${playbackPauseTime}ms linear`;
	elements.playbackPauseMeter.style.width = "100%";
	elements.playbackPauseMeter.ontransitionend = () => {
		elements.playbackPauseMeter.style.transition = "none";
		elements.playbackPauseMeter.style.width = "0%";
	};
}

function solvedDisplay() {
	elements.playButton.classList.remove("fa-pause")
	elements.moveDescription.style.background = "#03C03C";
	elements.moveDescription.innerText = "SOLVED";
	var solvedJingle = document.getElementById("solvedJingle");
	solvedJingle.volume = .3;
	solvedJingle.play();
}

export function updateCursorAfterPlay(scene, canvas) {
	const pick = scene.pick(scene.pointerX, scene.pointerY);
	const meshOver = pick.pickedMesh;
	if (meshOver) {
		scene.hoverCursor = "pointer";
		canvas.style.cursor = "pointer";
	}
}