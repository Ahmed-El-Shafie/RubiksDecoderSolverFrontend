export function startDemoRotation(scene, rotationSettings, rows) {
	if (rotationSettings.initialRowRotationAnimations.length != 0) {
		return;
	}
	rotationSettings.initialRowRotation = rows[2].rotation.y;
	rotationSettings.initialRowRotationAnimations = rows.map(row => {
		row.animations = [];
		const frameRate = 1;
		const rotateAnimation = new BABYLON.Animation("rotate", "rotation.y", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
		const rotateFrames = [];
		const rotation = row.rotation.y;
		rotateFrames.push({
			frame: 0,
			value: rotation
		});
		rotateFrames.push({
			frame: 24,
			value: rotation - 2 * Math.PI
		});
		rotateAnimation.setKeys(rotateFrames);
		row.animations.push(rotateAnimation);
		return scene.beginAnimation(row, 0, 24, true);
	}
	);
}

export function interruptDemoRotation(rotationSettings, rows) {
	clearTimeout(rotationSettings.demoRotationTimeout);
	rotationSettings.demoRotationTimeout = null;
	if (rotationSettings.initialRowRotationAnimations.length == 0) {
		return;
	}
	rotationSettings.initialRowRotationAnimations.forEach(rowRotation => {
		rowRotation.stop();
	});
	rotationSettings.initialRowRotationAnimations = [];
	rotationSettings.viewRotation += rows[2].rotation.y - rotationSettings.initialRowRotation;
}