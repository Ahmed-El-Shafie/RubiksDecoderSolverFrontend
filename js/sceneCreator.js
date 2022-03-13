import { charColors } from './colors.js';

export const createScene = function(engine, decoderSettings, squareMeshHoverHandler, rowMeshHoverHandler) {
	const scene = new BABYLON.Scene(engine);
	scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

	const topFaceColors = [new BABYLON.Color3.Black(), new BABYLON.Color3.Black(), new BABYLON.Color3.White()];
	const topRow = createRow(0, decoderSettings, topFaceColors, decoderSettings.rowHeight, scene);
	const midFaceColors = [new BABYLON.Color3.Black(), new BABYLON.Color3.Black(), new BABYLON.Color3.Black()];
	const midRow = createRow(1, decoderSettings, midFaceColors, 0, scene);
	const botFaceColors = [new BABYLON.Color3.White(), new BABYLON.Color3.Black(), new BABYLON.Color3.Black()];
	const botRow = createRow(2, decoderSettings, botFaceColors, -decoderSettings.rowHeight, scene);
	const rows = [topRow, midRow, botRow];
	rows.forEach(row => {
		row.actionManager = new BABYLON.ActionManager(scene);
		row.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, rowMeshHoverHandler));
	});

	var startStateArray = renderDecoderState(scene, decoderSettings, decoderSettings.startStateCharArray, rows, squareMeshHoverHandler);

	const frontLight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 0, -2));
	frontLight.specular = new BABYLON.Color3(0, 0, 0);
	const upLight = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 2, 0));
	upLight.specular = new BABYLON.Color3(0, 0, 0);

	const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 20, new BABYLON.Vector3(0, 0, 0));
	camera.setTarget(new BABYLON.Vector3(0, -1, 0));
	camera.beta = 1.35;

	return [scene, startStateArray];
};

export const renderDecoderState = function(scene, decoderSettings, stateCharArray, rows, squareMeshHoverHandler, viewRotation = 0) {
	var squares = scene.meshes.slice(rows.length);
	squares.forEach(square => square.dispose());
	var stateArray = [];
	for (let rowNum = 0; rowNum < stateCharArray.length; rowNum++) {
		var rowArray = [];
		for (let colNum = 0; colNum < stateCharArray[0].length; colNum++) {
			var colorChar = stateCharArray[rowNum][colNum];
			var square = null;
			if (colorChar != '-') {
				var [r, g, b] = charColors[colorChar];
				square = createSquare(scene, decoderSettings.rowRadius, decoderSettings.rowHeight - .2, new BABYLON.Color3(r, g, b), colNum * decoderSettings.colAngleMultiplier - viewRotation, rows[rowNum].position.y, squareMeshHoverHandler);
				square.setParent(rows[rowNum]);
				square["rowNum"] = rowNum;
				square["colNum"] = colNum;
				square["colorChar"] = colorChar;
			}
			rowArray.push(square);
		}
		stateArray.push(rowArray);
	}
	return stateArray;
}

const createRow = function(rowNum, decoderSettings, faceColors, yPos, scene) {
	const row = BABYLON.MeshBuilder.CreateCylinder("row", { faceColors: faceColors, height: decoderSettings.rowHeight, diameter: decoderSettings.rowDiameter, tessellation: 35 }, scene);
	row.position.y = yPos;
	row.enableEdgesRendering();
	row.edgesWidth = 8;
	row.edgesColor = new BABYLON.Color4(0, 0, 0);
	row["rowNum"] = rowNum;
	return row;
}

export const createSquare = function(scene, rowRadius, sideLength, color, angle, yPos, squareMeshHoverHandler) {
	var xR = 0.2; // bevel radius x direction
	var yR = 0.2; // bevel radius y direction
	var depth = .01;
	var radius = sideLength / 2;

	var n = 20; //increments around circle
	var a; //angle

	//Array of paths to construct extrusion
	var squareShape = [];

	squareShape.push(new BABYLON.Vector3(radius, radius - yR, 0));

	for (var i = 0; i < n; i++) {
		a = i * Math.PI / (2 * n);
		squareShape.push(new BABYLON.Vector3(radius - xR * (1 - Math.cos(a)), radius - yR * (1 - Math.sin(a)), 0))
	}

	squareShape.push(new BABYLON.Vector3(radius - xR, radius, 0));
	squareShape.push(new BABYLON.Vector3(-radius + xR, radius, 0));

	for (var i = 0; i < n; i++) {
		a = Math.PI / 2 + i * Math.PI / (2 * n);
		squareShape.push(new BABYLON.Vector3(-radius + xR * (1 + Math.cos(a)), radius - yR * (1 - Math.sin(a)), 0))
	}

	squareShape.push(new BABYLON.Vector3(-radius, radius - yR, 0));
	squareShape.push(new BABYLON.Vector3(-radius, -radius + yR, 0));

	for (var i = 0; i < n; i++) {
		a = Math.PI + i * Math.PI / (2 * n);
		squareShape.push(new BABYLON.Vector3(-radius + xR * (1 + Math.cos(a)), -radius + yR * (1 + Math.sin(a)), 0))
	}

	squareShape.push(new BABYLON.Vector3(-radius + xR, -radius, 0));
	squareShape.push(new BABYLON.Vector3(radius - xR, -radius, 0));

	for (var i = 0; i < n; i++) {
		a = 3 * Math.PI / 2 + i * Math.PI / (2 * n);
		squareShape.push(new BABYLON.Vector3(radius - xR * (1 - Math.cos(a)), -radius + yR * (1 + Math.sin(a)), 0))
	}

	squareShape.push(new BABYLON.Vector3(radius, -radius + yR, 0));
	squareShape.push(squareShape[0]);

	var path = [
		new BABYLON.Vector3(0, 0, -depth / 2),
		new BABYLON.Vector3(0, 0, depth / 2)
	];

	var square = BABYLON.MeshBuilder.ExtrudeShape("square", { shape: squareShape, path: path, cap: BABYLON.Mesh.CAP_ALL }, scene);
	square.convertToFlatShadedMesh();
	const colorMat = new BABYLON.StandardMaterial("colorMat", scene);
	colorMat.diffuseColor = color;
	square.material = colorMat;
	square.position.x = Math.sin(angle) * rowRadius;
	square.position.y = yPos;
	square.position.z = -Math.cos(angle) * rowRadius;
	square.rotation.y = -angle;

	square.actionManager = new BABYLON.ActionManager(scene);
	square.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, squareMeshHoverHandler));
	square.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, (ev) => {
		var [r, g, b] = charColors[ev.meshUnderPointer.colorChar];
		const colorMat = ev.meshUnderPointer.material;
		colorMat.diffuseColor = new BABYLON.Color3(r, g, b);
	}));

	return square;
}