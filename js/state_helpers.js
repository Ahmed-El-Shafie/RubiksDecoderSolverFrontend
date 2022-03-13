export const getBlankPosition = function(stateArray) {
	for (let rowNum = 0; rowNum < stateArray.length; rowNum++) {
		var blankCol = stateArray[rowNum].indexOf(null);
		if (blankCol != -1) {
			return [rowNum, blankCol];
		}
	}
	throw "Cannot find blank square in state";
}

export const getBlankPositionChar = function(stateArrayChar) {
	for (let rowNum = 0; rowNum < stateArrayChar.length; rowNum++) {
		var blankCol = stateArrayChar[rowNum].indexOf('-');
		if (blankCol != -1) {
			return [rowNum, blankCol];
		}
	}
	throw "Cannot find blank square in state";
}

// Necessary for when there are multiple blank spaces due to user deleting squares
export const getBlankRows = function(stateArray, colNum) {
	var blankRows = [];
	for (let rowNum = 0; rowNum < stateArray.length; rowNum++) {
		if (!stateArray[rowNum][colNum]) {
			blankRows.push(rowNum);
		}
	}
	return blankRows;
}