import { solveButton } from './elements.js';

export const api = "http://localhost:8080/";

export function pingApi() {
	if (solveButton.innerText == "OUT OF ORDER") {
		solveButton.innerText = "";
		var solveLoadingIcon = document.createElement('span');
		solveLoadingIcon.id = 'solveLoadingIcon';
		solveButton.appendChild(solveLoadingIcon);
	}
	return fetch(api + "ping")
		.then(response => response)
		.catch(error => error.response);
}

export function updateSolveApiStatus(response) {
	var solveLoadingIcon = document.getElementById("solveLoadingIcon");
	if (solveLoadingIcon) {
		solveLoadingIcon.remove();
	}
	if (response) {
		if (solveButton.classList.contains("error")) {
			solveButton.disabled = false;
			solveButton.classList.remove("error");
			solveButton.innerText = "SOLVE FOR ME";
		}
	} else {
		solveButton.disabled = true;
		solveButton.classList.add("error");
		solveButton.innerText = "OUT OF ORDER";
	}
}