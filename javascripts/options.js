// Chrome Proxy helper
// by zhouzhenster@gmail.com
// https://raw.github.com/henices/Chrome-proxy-helper/master/javascripts/options.js
// add support for auto enable on specific website entry

var proxySetting = [];
var proxyInfo = null;
var firstime = true;
var chinaList = ["*.cn"];
function save_settings() {
	chrome.storage.sync.set({
		firstime: firstime,
		proxyInfo: proxyInfo,
		proxySetting: proxySetting,
	});
}
function load_settings(startafter = () => {}) {
	chrome.storage.sync.get(
		{
			proxySetting: [],
			proxyInfo: null,
			firstime: true,
			chinaList: ["*.cn"],
		},
		function (items) {
			proxySetting = items.proxySetting;
			proxyInfo = items.proxyInfo;
			firstime = items.firstime;
			chinaList = items.chinaList;
			startafter();
		}
	);
}
load_settings(() => {
	if (firstime) loadOldInfo();
	else loadProxyData();

	getProxyInfo();
});
function loadProxyData() {
	document.querySelector("#socks-host").value = proxySetting["socks_host"] || "";
	document.querySelector("#socks-port").value = proxySetting["socks_port"] || "";
	document.querySelector("#quic-host").value = proxySetting["quic_host"] || "";
	document.querySelector("#quic-port").value = proxySetting["quic_port"] || "";
	document.querySelector("#http-host").value = proxySetting["http_host"] || "";
	document.querySelector("#http-port").value = proxySetting["http_port"] || "";
	document.querySelector("#https-host").value = proxySetting["https_host"] || "";
	document.querySelector("#https-port").value = proxySetting["https_port"] || "";
	document.querySelector("#pac-type").value = proxySetting["pac_type"] || "file://";
	document.querySelector("#pac-data").value = proxySetting["pac_data"] || "";
	document.querySelector("#bypasslist").value = proxySetting["bypasslist"] || "";
	//part of the white/blacklist as rest of the code is disabled will for now also be disabled.
	//document.querySelector("#rules-mode").value = proxySetting["rules_mode"] || "Whitelist";
	document.querySelector("#proxy-rule").value = proxySetting["proxy_rule"] || "singleProxy";
	document.querySelector("#username").value = proxySetting["auth"]["user"] || "";
	document.querySelector("#password").value = proxySetting["auth"]["pass"] || "";

	try {
		var type = proxySetting["pac_type"].split(":")[0];
		document.querySelector("#pac-script-url").value = proxySetting["pac_script_url"][type] || "";
	} catch (err) {}

	if (proxySetting["socks_type"] == "socks5") {
		document.querySelector("#socks5").setAttribute("checked", "");
		document.querySelector("#socks4").removeAttribute("checked");
	}

	if (proxySetting["socks_type"] == "socks4") {
		document.querySelector("#socks4").setAttribute("checked", "");
		document.querySelector("#socks5").removeAttribute("checked");
	}

	if (proxySetting["internal"] == "china") {
		document.querySelector("#china-list").setAttribute("checked", "");
	}

	if (proxySetting["rules_mode"] == "Whitelist") {
		document.querySelector("#bypasslist").removeAttribute("disabled");
		//part of the white/blacklist as rest of the code is disabled will for now also be disabled.
		//document.querySelector("#proxylist").setAttribute("disabled", "");
		document.querySelector("#china-list").removeAttribute("disabled");
		//part of the white/blacklist as rest of the code is disabled will for now also be disabled.
		//document.querySelector("#blacklist").style.display = "none";
		document.querySelector("#whitelist").style.display = "block";
	} else {
		document.querySelector("#bypasslist").setAttribute("disabled", "");
		//part of the white/blacklist as rest of the code is disabled will for now also be disabled.
		//document.querySelector("#proxylist").removeAttribute("disabled");
		document.querySelector("#china-list").setAttribute("disabled", "");
		//part of the white/blacklist as rest of the code is disabled will for now also be disabled.
		//document.querySelector("#blacklist").style.display = "block";
		document.querySelector("#whitelist").style.display = "none";
	}
	document.querySelector("#btn-save").onclick = () => {
		save();
		document.querySelector("#unsaved-changes").style.display = "none";
	};

	document.querySelector("#btn-cancel").onclick = () => {
		location.reload();
	};

	/*
				document.querySelector('#socks4').addEventListener('change', () => {
					document.querySelector('#socks5').removeAttribute('checked');
				});

				document.querySelector('#socks5').addEventListener('change', () => {
					document.querySelector('#socks4').removeAttribute('checked');
				});
			*/

	//can be used to clear bad proxies but no button exists
	// document.querySelector("#diagnosis").onclick = () => {
	// 	chrome.tabs.create({ url: "chrome://net-internals/#proxy" });
	// };

	document.querySelectorAll("input").forEach((e) =>
		e.addEventListener("change", () => {
			document.querySelector("#unsaved-changes").style.display = "block";
		})
	);

	document.querySelectorAll("textarea").forEach((e) =>
		e.addEventListener("change", () => {
			document.querySelector("#unsaved-changes").style.display = "block";
		})
	);

	document.querySelector("#proxy-rule").addEventListener("change", () => {
		document.querySelector("#unsaved-changes").style.display = "block";
	});

	//part of the white/blacklist as rest of the code is disabled will for now also be disabled.
	// document.querySelector("#rules-mode").addEventListener("change", () => {
	// 	document.querySelector("#unsaved-changes").style.display = "block";
	// });

	document.querySelector("#pac-type").addEventListener("change", () => {
		var type = document.querySelector("#pac-type").value.split(":")[0];
		debugger;
		document.querySelector("#pac-script-url").value = proxySetting["pac_script_url"][type];
		document.querySelector("#unsaved-changes").style.display = "block";
	});

	document.querySelector("#pac-script-url").addEventListener("change", () => {
		document.querySelector("#unsaved-changes").style.display = "block";
	});

	document.querySelector("#pac-file").addEventListener("change", readSingleFile, false);
}

/**
 * load old proxy info
 */
function loadOldInfo() {
	var mode, url, rules, proxyRule;
	var type, host, port;
	var ret, pacType, pacScriptUrl;

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

			document.querySelector("#proxy-rule").value = proxyRule;
		}

		if (mode == "direct" || mode == "system" || mode == "auto_detect") {
			return;
		} else if (mode == "pac_script") {
			// may be need to deal with pac data
			url = config.value.pacScript.url;
			if (url) {
				ret = url.split("://");
				pacType = ret[0];
				pacScriptUrl = ret[1];

				document.querySelector("#pac-type").value = pacType + "://";

				// fix pacScriptUrl on Windows platform
				if (pacType == "file") {
					if (pacScriptUrl.substring(0, 1) != "/") pacScriptUrl = "/" + pacScriptUrl;
				}

				document.querySelector("#pac-script-url").value = pacScriptUrl;
			} else {
				data = config.value.pacScript.data;
				document.querySelector("#pac-data").value = data;
			}
		} else if (mode == "fixed_servers") {
			// we are in manual mode
			type = rules[proxyRule]["scheme"];
			host = rules[proxyRule]["host"];
			port = rules[proxyRule]["port"];
			bypassList = rules.bypassList;

			if (type == "http") {
				document.querySelector("#http-host").value = host;
				document.querySelector("#http-port").value = port;
			} else if (type == "https") {
				document.querySelector("#https-host").value = host;
				document.querySelector("#https-port").value = port;
			} else if (type == "quic") {
				document.querySelector("#quic-host").value = host;
				document.querySelector("#quic-port").value = port;
			} else {
				if (type == "socks5") {
					document.querySelector("#socks5").setAttribute("checked", "");
					document.querySelector("#socks4").removeAttribute("checked");
				} else if (type == "socks4") {
					document.querySelector("#socks5").removeAttribute("checked");
					document.querySelector("#socks4").setAttribute("checked", "");
				}

				document.querySelector("#socks-host").value = host;
				document.querySelector("#socks-port").value = port;
			}

			if (bypassList) document.querySelector("#bypasslist").value = bypassList.join(",");
		}
	});

	firstime = false;
	save_settings();
}

/**
 * get chrome browser proxy settings
 * and display on the options page
 *
 */
function getProxyInfo() {
	var mode, rules, proxyRule;

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

		if (mode == "direct" || mode == "system" || mode == "auto_detect") {
			proxyInfo = mode;
		} else if (mode == "pac_script") {
			var url = config["value"]["pacScript"]["url"];
			if (url) proxyInfo = "pac_url";
			else proxyInfo = "pac_data";
		} else if (mode == "fixed_servers") proxyInfo = rules[proxyRule]["scheme"];
		save_settings();
	});
}

/**
 * get uniq array
 *
 */
function uniqueArray(arr) {
	var hash = {},
		result = [];
	for (var i = 0, l = arr.length; i < l; ++i) {
		if (!hash.hasOwnProperty(arr[i])) {
			hash[arr[i]] = true;
			result.push(arr[i]);
		}
	}
	return result;
}

/**
 * @brief use proxy info to set proxy
 *
 */
function reloadProxy() {
	var type, auto, arrayString;
	var proxy = { type: "", host: "", port: "" };
	var config = {
		mode: "",
		pacScript: {},
		rules: {},
	};

	if (typeof proxyInfo === "undefined" || proxyInfo == "direct" || proxyInfo == "system") {
		return;
	}

	if (proxyInfo == "pac_url") {
		var pacType = proxySetting["pac_type"];
		var proto = pacType.split(":")[0];

		config.mode = "pac_script";
		config["pacScript"]["url"] = pacType + proxySetting["pac_script_url"][proto];
	} else if (proxyInfo == "pac_data") {
		config.mode = "pac_script";
		config["pacScript"]["data"] = proxySetting["pac_data"];
	} else {
		switch (proxyInfo) {
			case "http":
				proxy.type = "http";
				proxy.host = proxySetting["http_host"];
				proxy.port = parseInt(proxySetting["http_port"]);
				break;

			case "https":
				proxy.type = "https";
				proxy.host = proxySetting["https_host"];
				proxy.port = parseInt(proxySetting["https_port"]);
				break;

			case "socks4":
				proxy.type = "socks4";
				proxy.host = proxySetting["socks_host"];
				proxy.port = parseInt(proxySetting["socks_port"]);
				break;

			case "socks5":
				proxy.type = "socks5";
				proxy.host = proxySetting["socks_host"];
				proxy.port = parseInt(proxySetting["socks_port"]);
				break;

			case "quic":
				proxy.type = "quic";
				proxy.host = proxySetting["quic_host"];
				proxy.port = parseInt(proxySetting["quic_port"]);
				break;
		}

		var rule = proxySetting["proxy_rule"];
		if (proxy.type == "http" && rule == "fallbackProxy") rule = "singleProxy";

		var bypasslist = proxySetting["bypasslist"];

		if (proxySetting["internal"] == "china") {
			bypasslist = chinaList.concat(bypasslist.split(","));
		} else {
			bypasslist = bypasslist ? bypasslist.split(",") : ["<local>"];
		}

		config.mode = "fixed_servers";
		config.rules.bypassList = uniqueArray(bypasslist);
		config["rules"][rule] = {
			scheme: proxy.type,
			host: proxy.host,
			port: parseInt(proxy.port),
		};
	}

	chrome.proxy.settings.set(
		{
			value: config,
			scope: "regular",
		},
		function () {}
	);
}

// /**
//  * set system proxy
//  *
//  */
// function sysProxy() {
// 	var config = {
// 		mode: "system",
// 	};
// 	var icon = {
// 		path: "images/off.png",
// 	};

// 	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

// 	chrome.action.setIcon(icon);
// }

/**
 * button id save click handler
 *
 */
function save() {
	proxySetting["http_host"] = document.querySelector("#http-host").value || "";
	proxySetting["http_port"] = document.querySelector("#http-port").value || "";
	proxySetting["https_host"] = document.querySelector("#https-host").value || "";
	proxySetting["https_port"] = document.querySelector("#https-port").value || "";
	proxySetting["quic_host"] = document.querySelector("#quic-host").value || "";
	proxySetting["quic_port"] = document.querySelector("#quic-port").value || "";
	proxySetting["socks_host"] = document.querySelector("#socks-host").value || "";
	proxySetting["socks_port"] = document.querySelector("#socks-port").value || "";
	proxySetting["pac_type"] = document.querySelector("#pac-type").value || "";
	proxySetting["pac_data"] = document.querySelector("#pac-data").value || "";
	proxySetting["bypasslist"] = document.querySelector("#bypasslist").value || "";
	proxySetting["proxy_rule"] = document.querySelector("#proxy-rule").value || "";
	//proxySetting['rules_mode'] = document.querySelector('#rules-mode').value || "";
	proxySetting["auth"]["user"] = document.querySelector("#username").value || "";
	proxySetting["auth"]["pass"] = document.querySelector("#password").value || "";

	if (document.querySelector("#socks5").checked) proxySetting["socks_type"] = "socks5";

	if (document.querySelector("#socks4").checked) proxySetting["socks_type"] = "socks4";

	if (document.querySelector("#use-pass").checked) proxySetting["auth"]["enable"] = "y";
	else proxySetting["auth"]["enable"] = "";

	if (document.querySelector("#china-list").checked) {
		proxySetting["internal"] = "china";
	} else {
		proxySetting["internal"] = "";
	}

	try {
		var pacType = document.querySelector("#pac-type").value.split(":")[0];
		var pacScriptUrl = document.querySelector("#pac-script-url").value || "";

		// fix pacScriptUrl on windows platform
		if (pacType == "file" && pacScriptUrl) {
			if (pacScriptUrl.substring(0, 1) != "/") pacScriptUrl = "/" + pacScriptUrl;
		}

		proxySetting["pac_script_url"][pacType] = pacScriptUrl;
	} catch (err) {}

	save_settings();
	reloadProxy();
	loadProxyData();
}

// /**
//  * set proxy for get pac data
//  *
//  */
// function setPacProxy() {
// 	var proxy = { type: "", host: "", port: "" };

// 	pacProxyHost = document.querySelector("#pac-proxy-host").value.split(":");
// 	pacViaProxy = document.querySelector("#pac-via-proxy").value.split(":");

// 	proxy.type = pacViaProxy[0];
// 	proxy.host = pacProxyHost[0];
// 	proxy.port = parseInt(pacProxyHost[1]);

// 	var config = {
// 		mode: "fixed_servers",
// 		rules: {
// 			singleProxy: {
// 				scheme: proxy.type,
// 				host: proxy.host,
// 				port: proxy.port,
// 			},
// 		},
// 	};

// 	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});
// }

/**
 * get pac script data from url
 */
function getPac() {
	var req = new XMLHttpRequest();
	var url = document.querySelector("#pac-url").value;
	var result = "";

	// async request
	req.open("GET", url, true);
	req.onreadystatechange = processResponse;
	req.send(null);

	// function processPacData(ret) {
	// 	var regx_dbase64 = /decode64\("(.*)"\)/i;
	// 	var regx_find = /FindProxyForURL/i;
	// 	var pacData = "";

	// 	// autoproxy2pac
	// 	if (ret.indexOf("decode64") != -1) {
	// 		match = regx_dbase64.test(ret);
	// 		if (match) {
	// 			var decodePacData = $.base64Decode(RegExp.$1);
	// 			if (regx_find.test(decodePacData)) pacData = decodePacData;
	// 		}
	// 	}
	// 	// plain text
	// 	else {
	// 		if (regx_find.test(ret)) pacData = ret;
	// 	}

	// 	return pacData;
	// }

	function processResponse() {
		if (req.readyState == 4) {
			if (req.status == 200) {
				result = req.responseText;
			}
		}

		return result;
	}
}

function readSingleFile(e) {
	var file = e.target.files[0];
	if (!file) {
		return;
	}
	var reader = new FileReader();
	reader.onload = function (e) {
		var contents = e.target.result;
		document.querySelector("#pac-data").value = contents;
		document.querySelector("#unsaved-changes").style.display = "block";
	};
	reader.readAsText(file);
}

/*
 * make chrome give warning when data edited but not saved.
 */
window.onbeforeunload = function () {
	if (document.querySelector("#unsaved-changes").style.display == "block") {
		return false;
	}
};
