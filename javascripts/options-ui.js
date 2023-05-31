document.addEventListener("DOMContentLoaded", function () {
	document.querySelectorAll(".menu a").forEach((e) => {
		e.onclick = (ev) => {
			ev.preventDefault();
			var selected = "selected";

			document.querySelectorAll(".mainview > *").forEach((e) => e.classList.remove(selected));
			document.querySelectorAll(".menu li").forEach((e) => e.classList.remove(selected));

			ev.currentTarget.parentElement.classList.add(selected);
			var currentView = document.querySelector(ev.currentTarget.getAttribute("href"));
			currentView.classList.add(selected);
			document.scrollTop = 0;
		};
	});
});

document.addEventListener(
	"DOMContentLoaded",
	() => {
		document.querySelectorAll("[data-i18n-content]").forEach((e) => {
			var message = chrome.i18n.getMessage(e.getAttribute("data-i18n-content"));
			if (message) e.innerHTML = message;
		});
	},
	false
);
