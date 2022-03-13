function playHoverSound() {
	var audio = document.getElementById("hoverSound");
	audio.play();
}
function playClickSound() {
	var audio = document.getElementById("clickSound");
	audio.play();
}
function buttonHover(button) {
	if (!button.disabled) {
		playHoverSound();
	}
}
function buttonClick(button) {
	if (!button.disabled) {
		playClickSound();
	}
}