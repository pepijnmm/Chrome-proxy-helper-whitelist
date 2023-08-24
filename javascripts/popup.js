// Chrome Proxy helper
// popup.js
// https://raw.github.com/henices/Chrome-proxy-helper/master/javascripts/popup.js

/**
 * @fileoverview
 *
 * @author: zhouzhenster@gmail.com
 */
var chinaList = ["*.cn"];
var firstime = false;
var proxySetting = [];
var proxyInfo = null;
function save_settings() {
	chrome.storage.local.set({
		firstime: firstime,
		chinaList: chinaList,
		proxyInfo: proxyInfo,
	});
}
function load_settings(start_after_load = () => {}) {
	chrome.storage.local.get(
		{
			proxySetting: [],
			proxyInfo: null,
			firstime: false,
			chinaList: ["*.cn"],
		},
		function (items) {
			proxySetting = items.proxySetting;
			proxyInfo = items.proxyInfo;
			firstime = items.firstime;
			chinaList = items.chinaList;
			start_after_load();
		}
	);
}
var proxyRule = null;
var bypasslist = null;
var socksHost = null;
var socksPort = null;
var socksType = null;
var httpHost = null;
var httpPort = null;
var httpsHost = null;
var httpsPort = null;
var pacData = null;
var pacUrlType = null;
var pacScriptUrl = null;
var quicHost = null;
var quicPort = null;

/**
 * set help message for popup page
 *
 */
function add_li_title() {
	var _http, _https, _socks, _pac, _quic;

	if (httpHost && httpPort) {
		_http = "http://" + httpHost + ":" + httpPort;
		document.querySelector("#http-proxy").setAttribute("title", _http);
	}

	if (pacData) {
		document.querySelector("#pac-data-proxy").setAttribute("title", "pac data");
	}

	if (pacUrlType) {
		if (pacScriptUrl[pacUrlType]) {
			_pac = proxySetting["pac_type"] + pacScriptUrl[pacUrlType];
			document.querySelector("#pac-url-proxy").setAttribute("title", _pac);
		}
	}

	if (httpsHost && httpsPort) {
		_https = "https://" + httpsHost + ":" + httpsPort;
		document.querySelector("#https-proxy").setAttribute("title", _https);
	}

	if (socksHost && socksPort) {
		_socks = socksType + "://" + socksHost + ":" + socksPort;
		document.querySelector("#socks5-proxy").setAttribute("title", _socks);
	}

	if (quicHost && quicPort) {
		_quic = "quic://" + quicHost + ":" + quicPort;
	}
}

/**
 * set popup page item blue color
 *
 */
function color_proxy_item() {
	var mode, rules, proxyRule, scheme;

	chrome.runtime.sendMessage({ command: "get-proxy-status" }, function (config) {
		if ((config["value"]["mode"] == "pac_script" && config.value.pacScript.data.includes("function shouldNotProxy")) == false) {
			mode = config["value"]["mode"];
			rules = config["value"]["rules"];
		}

		if (rules) {
			if (rules.hasOwnProperty("singleProxy")) {
				proxyRule = "singleProxy";
			} else if (rules.hasOwnProperty("proxyForHttp")) {
				proxyRule = "proxyForHttp";
			} else if (rules.hasOwnProperty("proxyForHttps")) {
				proxyRule = "proxyForHttps";
			} else if (rules.hasOwnProperty("proxyForFtp")) {
				proxyRule = "proxyForFtp";
			} else if (rules.hasOwnProperty("fallbackProxy")) {
				proxyRule = "fallbackProxy";
			}
		}

		if (mode == "system") {
			document.querySelector("#sys-proxy").classList.add("selected");
		} else if (mode == "direct") {
			document.querySelector("#direct-proxy").classList.add("selected");
		} else if (mode == "pac_script") {
			if (proxyInfo == "pac_url") document.querySelector("#pac-url-proxy").classList.add("selected");
			else document.querySelector("#pac-data-proxy").classList.add("selected");
		} else if (mode == "auto_detect") {
			document.querySelector("#auto-detect").classList.add("selected");
		} else {
			scheme = rules[proxyRule]["scheme"];

			if (scheme == "http") {
				document.querySelector("#http-proxy").classList.add("selected");
			} else if (scheme == "https") {
				document.querySelector("#https-proxy").classList.add("selected");
			} else if (scheme == "socks5") {
				document.querySelector("#socks5-proxy").classList.add("selected");
			} else if (scheme == "socks4") {
				document.querySelector("#socks5-proxy").classList.add("selected");
			} else if (scheme == "quic") {
				document.querySelector("#quic-proxy").classList.add("selected");
			}
		}
	});
}

function proxySelected(str) {
	document.querySelectorAll("li").forEach((e) => e.classList.remove("selected"));
	document.querySelector("#" + str).classList.add("selected");
}

/**
 * open option page
 */

function openOptionPage() {
	if (chrome.runtime.openOptionsPage) {
		// New way to open options pages, if supported (Chrome 42+).
		chrome.runtime.openOptionsPage();
	} else {
		// Reasonable fallback.
		window.open(chrome.runtime.getURL("options.html"));
	}
}

chrome.proxy.onProxyError.addListener(function (details) {
	alert(details.error);
});

document.addEventListener("DOMContentLoaded", function () {
	load_settings(() => {
		//execute after data has loaded.
		proxyRule = proxySetting["proxy_rule"];
		bypasslist = proxySetting["bypasslist"];
		socksHost = proxySetting["socks_host"];
		socksPort = proxySetting["socks_port"];
		socksType = proxySetting["socks_type"];
		httpHost = proxySetting["http_host"];
		httpPort = proxySetting["http_port"];
		httpsHost = proxySetting["https_host"];
		httpsPort = proxySetting["https_port"];
		pacData = proxySetting["pac_data"];
		pacUrlType = proxySetting["pac_type"].split(":")[0];
		pacScriptUrl = proxySetting["pac_script_url"];
		quicHost = proxySetting["quic_host"];
		quicPort = proxySetting["quic_port"];

		if (proxySetting["internal"] == "china") {
			bypasslist = chinaList.concat(bypasslist.split(","));
		} else bypasslist = bypasslist ? bypasslist.split(",") : ["<local>"];

		document.querySelector("#pac-data-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "pacDatatProxy" }));
		document.querySelector("#pac-url-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "pacUrlProxy" }));
		document.querySelector("#socks5-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "socks5Proxy" }));
		document.querySelector("#http-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "httpProxy" }));
		document.querySelector("#https-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "httpsProxy" }));
		document.querySelector("#quic-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "quicProxy" }));
		document.querySelector("#sys-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "sysProxy" }));
		document.querySelector("#direct-proxy").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "directProxy" }));
		document.querySelector("#auto-detect").addEventListener("click", () => chrome.runtime.sendMessage({ command: "start-proxy", data: "autoProxy" }));
		document.querySelector("#option-page").addEventListener("click", openOptionPage);

		document.querySelectorAll("[data-i18n-content]").forEach((e) => {
			var message = chrome.i18n.getMessage(e.getAttribute("data-i18n-content"));
			if (message) e.innerHTML = message;
		});

		if (!httpHost) {
			document.querySelector("#http-proxy").style.display = "none";
		}

		if (!socksHost) {
			document.querySelector("#socks5-proxy").style.display = "none";
		}

		if (!httpsHost) {
			document.querySelector("#https-proxy").style.display = "none";
		}

		if (!pacData) {
			document.querySelector("#pac-data-proxy").style.display = "none";
		}

		if (!pacScriptUrl[pacUrlType]) {
			document.querySelector("#pac-url-proxy").style.display = "none";
		}

		if (!quicHost) {
			document.querySelector("#quic-proxy").style.display = "none";
		}

		color_proxy_item();
		add_li_title();
	});
});

/*
 * here commands can come in.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	commands(message.command, message.data);
});
/*
 * reseives all comands for the background and sends them to the right way.
 */
function commands(command, data = null) {
	switch (command) {
		case "proxy-selected":
			proxySelected(data);
			break;
		case "alert":
			alert(data);
			break;
	}
}
