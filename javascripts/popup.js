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
	chrome.storage.sync.set({
		firstime: firstime,
		chinaList: chinaList,
		proxyInfo: proxyInfo,
	});
}
function load_settings(start_after_load = () => {}) {
	chrome.storage.sync.get(
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

	document.querySelector("#pac-data-proxy").addEventListener("click", pacDatatProxy);
	document.querySelector("#pac-url-proxy").addEventListener("click", pacUrlProxy);
	document.querySelector("#socks5-proxy").addEventListener("click", socks5Proxy);
	document.querySelector("#http-proxy").addEventListener("click", httpProxy);
	document.querySelector("#https-proxy").addEventListener("click", httpsProxy);
	document.querySelector("#quic-proxy").addEventListener("click", quicProxy);
	document.querySelector("#sys-proxy").addEventListener("click", sysProxy);
	document.querySelector("#direct-proxy").addEventListener("click", directProxy);
	document.querySelector("#auto-detect").addEventListener("click", autoProxy);
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
});

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

	chrome.proxy.settings.get({ incognito: false }, function (config) {
		mode = config["value"]["mode"];
		rules = config["value"]["rules"];

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

/**
 * set the icon on or off
 *
 */
function iconSet(str) {
	var icon = {
		path: "images/on.png",
	};
	if (str == "off") {
		icon["path"] = "images/off.png";
	}
	chrome.action.setIcon(icon);
}

function proxySelected(str) {
	document.querySelectorAll("li").forEach((e) => e.classList.remove("selected"));
	document.querySelector("#" + str).classList.add("selected");
}

/**
 * set pac script proxy
 *
 */
function pacDatatProxy() {
	var config = {
		mode: "pac_script",
		pacScript: {},
	};

	config["pacScript"]["data"] = pacData;
	proxyInfo = "pac_data";
	save_settings();

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	proxySelected("pac-data-proxy");
}

/**
 * set pac url proxy
 *
 */
function pacUrlProxy() {
	var config = {
		mode: "pac_script",
		pacScript: {},
	};

	config["pacScript"]["url"] = proxySetting["pac_type"] + pacScriptUrl[pacUrlType];
	proxyInfo = "pac_url";
	save_settings();

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	proxySelected("pac-url-proxy");
}

/**
 * set socks proxy (socks4 or socks5)
 *
 */
function socks5Proxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: bypasslist,
		},
	};

	if (!socksHost) return;

	config["rules"][proxyRule] = {
		scheme: socksType,
		host: socksHost,
		port: parseInt(socksPort),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	proxySelected("socks5-proxy");

	if (socksType == "socks5") proxyInfo = "socks5";
	else proxyInfo = "socks4";
	save_settings();
}

/**
 * set http proxy
 *
 */
function httpProxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: bypasslist,
		},
	};

	if (!httpHost) return;

	if (proxyRule == "fallbackProxy") proxyRule = "singleProxy";

	config["rules"][proxyRule] = {
		scheme: "http",
		host: httpHost,
		port: parseInt(httpPort),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	proxySelected("http-proxy");
	proxyInfo = "http";
	save_settings();
}

/**
 * set https proxy
 *
 */
function httpsProxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: bypasslist,
		},
	};

	if (!httpsHost) return;

	config["rules"][proxyRule] = {
		scheme: "https",
		host: httpsHost,
		port: parseInt(httpsPort),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	proxySelected("https-proxy");
	proxyInfo = "https";
	save_settings();
}

function quicProxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: bypasslist,
		},
	};

	if (!quicHost) return;

	config["rules"][proxyRule] = {
		scheme: "quic",
		host: quicHost,
		port: parseInt(quicPort),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	proxySelected("quic-proxy");
	proxyInfo = "quic";
	save_settings();
}

/**
 * set direct proxy
 *
 */
function directProxy() {
	var config = {
		mode: "direct",
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("off");
	proxySelected("direct-proxy");
	proxyInfo = "direct";
	save_settings();
}

/**
 * set system proxy
 *
 */
function sysProxy() {
	var config = {
		mode: "system",
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("off");
	proxySelected("sys-proxy");
	proxyInfo = "system";
	save_settings();
}

/**
 * set auto detect proxy
 *
 */
function autoProxy() {
	var config = {
		mode: "auto_detect",
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	proxySelected("auto-detect");
	proxyInfo = "auto_detect";
	save_settings();
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
	color_proxy_item();
	add_li_title();
});
