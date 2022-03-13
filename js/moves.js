export const moves = {
	TR: { type: "rotate", moveString: "Top row, rotate right", opposite: "TL", row: 0, direction: 1 },
	TL: { type: "rotate", moveString: "Top row, rotate left", opposite: "TR", row: 0, direction: -1 },
	BR: { type: "rotate", moveString: "Bottom row, rotate right", opposite: "BL", row: 2, direction: 1 },
	BL: { type: "rotate", moveString: "Bottom row, rotate left", opposite: "BR", row: 2, direction: -1 },
	TD: { type: "slide", moveString: "Top row, slide down", opposite: "MU", startRow: 0 },
	MU: { type: "slide", moveString: "Middle row, slide up", opposite: "TD", startRow: 1 },
	MD: { type: "slide", moveString: "Middle row, slide down", opposite: "BU", startRow: 1 },
	BU: { type: "slide", moveString: "Bottom row, slide up", opposite: "MD", startRow: 2 },
}

export const getMoveDescription = function(move) {
	var description = move.moveString;
	if (move.type == "rotate") {
		description += " by " + move.rotateAmount;
	}
	return description;
}

export const getOppositeMove = function(move) {
	if (move.type == "slide") {
		move = Object.assign({}, moves[move.opposite]);
	} else {
		const rotateAmount = move.rotateAmount;
		move = Object.assign({}, moves[move.opposite]);
		move["rotateAmount"] = rotateAmount;
	}
	return move;
}