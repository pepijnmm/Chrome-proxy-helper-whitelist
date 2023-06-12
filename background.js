var chinaList = [];
var firstimebg = true;
var proxySetting = {};
var lastOption = "system";
var proxyInfo = null;
var isProxyOn = false;

function saveSettings() {
	if (proxySetting.auto_enable_last_enabled instanceof Date) proxySetting.auto_enable_last_enabled = proxySetting.auto_enable_last_enabled.toString();
	chrome.storage.local.set({
		firstimebg: firstimebg,
		chinaList: chinaList,
		proxySetting: proxySetting,
		lastOption: lastOption,
		proxyInfo: proxyInfo,
	});
	if (proxySetting.auto_enable_last_enabled) proxySetting.auto_enable_last_enabled = new Date(proxySetting.auto_enable_last_enabled);
	//chrome.runtime.sendMessage({ command: "load-settings" });
}
/*
 * storage.local is used as sync will be syncronised with the cloud. which isn't good for important information like this.
 */
function loadSettings(startafter = () => {}) {
	chrome.storage.local.get(
		{
			proxySetting: getResetSettings().proxySetting,
			firstimebg: getResetSettings().firstimebg,
			chinaList: getResetSettings().chinaList,
			lastOption: getResetSettings().lastOption,
			proxyInfo: getResetSettings().proxyInfo,
		},
		function (items) {
			proxySetting = items.proxySetting;
			if (proxySetting.auto_enable_last_enabled) {
				proxySetting.auto_enable_last_enabled = new Date(proxySetting.auto_enable_last_enabled);
			}
			firstimebg = items.firstimebg;
			lastOption = items.lastOption;
			chinaList = items.chinaList;
			proxyInfo = items.proxyInfo;
			setProxyIcon(); //to set the correct icon and enable the block settings.
			startafter();
		}
	);
}

function setProxyIcon() {
	chrome.proxy.settings.get({ incognito: false }, function (config) {
		if (config["value"]["mode"] == "system" || config["value"]["mode"] == "direct") {
			iconSet("off");
		} else {
			iconSet("on");
		}
	});
}

function gotoPage(url) {
	var fulurl = chrome.runtime.getURL(url);
	chrome.tabs.getAllInWindow(undefined, function (tabs) {
		for (var i in tabs) {
			tab = tabs[i];
			if (tab.url == fulurl) {
				chrome.tabs.update(tab.id, { selected: true });
				return;
			}
		}
		chrome.tabs.getSelected(null, function (tab) {
			chrome.tabs.create({ url: url, index: tab.index + 1 });
		});
	});
}

function callbackFn(details) {
	if (proxySetting) {
		var auth = proxySetting["auth"];
		var username = auth["user"];
		var password = auth["pass"];
	}

	//bypasslist should be used but ip range to regex is not a easy switch.
	//It's possible a bypasslist url comes here
	//Because of that, a router admin panel for example won't give you it's login page.
	var regStrip = /^(http|https):\/\/192\.168\./gm;
	if (regStrip.test(details.url)) {
		return {};
	}
	if (proxySetting["auth"]["user"] == "" && proxySetting["auth"]["pass"] == "") return {};

	return { authCredentials: { username: username, password: password } };
}

chrome.webRequest.onAuthRequired.addListener(callbackFn, { urls: ["<all_urls>"] }, [
	"blocking",
	// Modern Chrome needs 'extraHeaders' to see and change this header,
	// so the following code evaluates to 'extraHeaders' only in modern Chrome.
	chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS,
]);

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason == "install") {
		saveSettings();
		gotoPage("options.html");
	}
	/*
    else if(details.reason == "update") {
        gotoPage('CHANGELOG');
    }
*/
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	commands(message.command, message.data);
});
chrome.commands.onCommand.addListener((command) => {
	commands(command);
});

/*
 * reseives all comands for the background and sends them to the right way.
 */
function commands(command, data = null) {
	switch (command) {
		case "open-option":
			gotoPage("options.html");
			break;
		case "load-settings":
			loadSettings();
			break;
		case "reset-settings":
			proxySetting = getResetSettings().proxySetting;
			firstimebg = false;
			chinaList = getResetSettings().chinaList;
			saveSettings();
			break;
		case "start-proxy":
			if (data != "system" && data != "sysProxy") {
				//system is the default. it should not have that as default option
				lastOption = data;
			}
			startProxy(data);
			break;
	}
}

function getResetSettings() {
	return JSON.parse(
		JSON.stringify({
			proxySetting: {
				pac_script_url: { http: "", https: "", file: "" },
				pac_type: "file://",
				http_host: "",
				http_port: "",
				https_host: "",
				https_port: "",
				socks_host: "",
				socks_port: "",
				socks_type: "socks5",
				bypasslist: "<local>,192.168.0.0/16,172.16.0.0/12,169.254.0.0/16,10.0.0.0/8",
				proxy_rule: "singleProxy",
				internal: "",
				auth: { enable: "", user: "", pass: "" },
				rules_mode: "Whitelist",
				auto_enable_list: "",
				auto_enable_timer: null,
				auto_enable_last_enabled: null,
				auto_enable_block_sites: false,
			},
			firstimebg: true,
			chinaList: ["*.cn"],
			lastOption: "system",
			proxyInfo: null,
		})
	);
}

chrome.proxy.onProxyError.addListener(function (details) {
	console.log("fatal: ", details.fatal);
	console.log("error: ", details.error);
	console.log("details: ", details.details);
});

//loads the settings and then sets the rest of the data
function load() {
	loadSettings(() => {
		setProxyIcon();
		if (firstimebg) {
			//save the settings for the first time.
			firstimebg = false;
			saveSettings();
		}
	});
}
load();
/*
 * check if user goes to url which needs vpn to be enabled.
 * regex will be used. see https://www.regexpal.com/ as example.
 * code from https://github.com/igrigorik/videospeed/pull/790/files
 * chrome.tabs.onUpdated.addListener is not used anymore as it won't get notified if a site is blocked.
 */
chrome.webRequest.onBeforeRequest.addListener(
	(details) => {
		if (isProxyOn == false) {
			if (details.url && proxySetting.auto_enable_list != "" && proxySetting.auto_enable_list != null) {
				const checkDate = new Date();
				const timeDifference = convertToHours(proxySetting.auto_enable_timer);
				checkDate.setHours(checkDate.getHours() - timeDifference);
				if (proxySetting.auto_enable_timer == null || proxySetting.auto_enable_timer == "" || proxySetting.auto_enable_last_enabled == null || proxySetting.auto_enable_last_enabled < checkDate) {
					if (checkUrlInList(proxySetting.auto_enable_list, details.url)) {
						proxySetting.auto_enable_last_enabled = new Date();
						saveSettings();
						commands("start-proxy", lastOption);

						//make sure the page doesn't load before vpn starts by disconnecting site.
						//chrome.tabs.discard(tabId);
					}
				}
			}
		}
	},
	{ urls: ["<all_urls>"] },
	[]
);
/*
 * day/month/year converter
 * convert 1d to 24, 1d1w to 192 etc.
 */
function convertToHours(timeString) {
	const timeValues = {
		h: 1, // Number of hours in a hour
		d: 24, // Number of hours in a day
		w: 168, // Number of hours in a week (7 days)
		m: 720, // Number of hours in a month (30 days)
	};

	const regex = /(\d+)([hdwmy])/g;
	let totalHours = 0;
	let match;

	while ((match = regex.exec(timeString)) !== null) {
		const value = parseInt(match[1]);
		const unit = match[2];

		if (timeValues.hasOwnProperty(unit)) {
			const hours = value * timeValues[unit];
			totalHours += hours;
		}
	}

	return totalHours;
}

/*
 * check if current url is in given list. only regex support
 */
function checkUrlInList(list, url) {
	let isInList = false;
	list.split("\n").forEach((match) => {
		regexp = clearnRegex(match).regex;
		if (regexp.test(url)) {
			isInList = true;
			return;
		}
	});
	return isInList;
}
var regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
var regEndsWithFlags = /\/(?!.*(.).*\1)[gimsuy]*$/;
function clearnRegex(regexstring) {
	let regexp = null;
	let regex = null;
	regexstring = regexstring.replace(regStrip, "");
	if (regexstring.length == 0) {
		return;
	}

	if (regexstring.startsWith("/")) {
		try {
			regexp = new RegExp(regexstring);
			var parts = regexstring.split("/");

			if (regEndsWithFlags.test(regexstring)) {
				var flags = parts.pop();
				regex = parts.slice(1).join("/");
			} else {
				var flags = "";
				regex = regexstring;
			}

			regexp = new RegExp(regex, flags);
		} catch (err) {
			return;
		}
	} else {
		regexp = new RegExp(escapeStringRegExp(regexstring));
	}
	return { string: regex, regex: regexp };
}
/*
 * replace escape parts
 */
function escapeStringRegExp(str) {
	matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
	return str.replace(matchOperatorsRe, "\\$&");
}

/**
 * Here starts the proxy starting settings, popup starts a vpn and then it goes here.
 */
/**
 * set pac script proxy
 *
 */
function pacDatatProxy() {
	var config = {
		mode: "pac_script",
		pacScript: {},
	};

	config["pacScript"]["data"] = proxySetting["pac_data"];
	proxyInfo = "pac_data";
	saveSettings();

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "pac-data-proxy" });
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

	config["pacScript"]["url"] = proxySetting["pac_type"] + proxySetting["pac_script_url"][proxySetting["pac_type"].split(":")[0]];
	proxyInfo = "pac_url";
	saveSettings();

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "pac-url-proxy" });
}

/**
 * set socks proxy (socks4 or socks5)
 *
 */
function socks5Proxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: proxySetting["bypasslist"].split(","),
		},
	};

	if (!proxySetting["socks_host"]) return;

	config["rules"][proxySetting["proxy_rule"]] = {
		scheme: proxySetting["socks_type"],
		host: proxySetting["socks_host"],
		port: parseInt(proxySetting["socks_port"]),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "socks5-proxy" });

	if (proxySetting["socks_type"] == "socks5") proxyInfo = "socks5";
	else proxyInfo = "socks4";
	saveSettings();
}

/**
 * set http proxy
 *
 */
function httpProxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: proxySetting["bypasslist"].split(","),
		},
	};

	if (!proxySetting["http_host"]) return;

	if (proxySetting["proxy_rule"] == "fallbackProxy") proxySetting["proxy_rule"] = "singleProxy";

	config["rules"][proxySetting["proxy_rule"]] = {
		scheme: "http",
		host: proxySetting["http_host"],
		port: parseInt(proxySetting["http_port"]),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "http-proxy" });
	proxyInfo = "http";
	saveSettings();
}

/**
 * set https proxy
 *
 */
function httpsProxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: proxySetting["bypasslist"].split(","),
		},
	};

	if (!proxySetting["https_host"]) return;

	config["rules"][proxySetting["proxy_rule"]] = {
		scheme: "https",
		host: proxySetting["https_host"],
		port: parseInt(proxySetting["https_port"]),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "https-proxy" });
	proxyInfo = "https";
	saveSettings();
}

function quicProxy() {
	var config = {
		mode: "fixed_servers",
		rules: {
			bypassList: proxySetting["bypasslist"].split(","),
		},
	};

	if (!proxySetting["quic_host"]) return;

	config["rules"][proxySetting["proxy_rule"]] = {
		scheme: "quic",
		host: proxySetting["quic_host"],
		port: parseInt(proxySetting["quic_port"]),
	};

	chrome.proxy.settings.set({ value: config, scope: "regular" }, function () {});

	iconSet("on");
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "quic-proxy" });
	proxyInfo = "quic";
	saveSettings();
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
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "direct-proxy" });
	proxyInfo = "direct";
	saveSettings();
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
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "sys-proxy" });
	proxyInfo = "system";
	saveSettings();
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
	chrome.runtime.sendMessage({ command: "proxy-selected", data: "auto-detect" });
	proxyInfo = "auto_detect";
	saveSettings();
}

/**
 * set the icon on or off
 *
 */
function iconSet(str) {
	var icon = {
		path: "",
	};
	chrome.declarativeNetRequest.updateDynamicRules({
		removeRuleIds: Array.from({ length: 20 }, (_, i) => i + 1),
	});
	if (str == "on") {
		icon["path"] = "images/on.png";
		isProxyOn = true;
	} else if (str == "off") {
		icon["path"] = "images/off.png";
		isProxyOn = false;
		if (proxySetting["auto_enable_block_sites"] == true) {
			let count = 1;
			let blockedurls = proxySetting.auto_enable_list.split("\n").map((e) => {
				return {
					id: count++,
					priority: 1,
					action: { type: "block" },
					condition: {
						regexFilter: clearnRegex(e).string,
						// learned from https://github.com/uku/Unblock-Youku/blob/master/src/modules/_header.mjs
						// Perhaps it is a bug in Chrome's declarativeNetRequest API:
						//     Although resourceTypes is an optional parameter, without setting it,
						//     the rule will not be applied at all.

						resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"],
					},
				};
			});
			chrome.declarativeNetRequest.updateDynamicRules({
				addRules: blockedurls,
			});
		}
	}
	chrome.action.setIcon(icon);
}
//choose depending on the data which proxy should be started
function startProxy(data) {
	switch (data) {
		case "pacDatatProxy":
			pacDatatProxy();
			break;
		case "pacUrlProxy":
			pacUrlProxy();
			break;
		case "socks5Proxy":
			socks5Proxy();
			break;
		case "httpProxy":
			httpProxy();
			break;
		case "httpsProxy":
			httpsProxy();
			break;
		case "quicProxy":
			quicProxy();
			break;
		case "directProxy":
			directProxy();
			break;
		case "autoProxy":
			autoProxy();
			break;
		case "sysProxy":
		case "system":
			sysProxy();
			break;
	}
}
