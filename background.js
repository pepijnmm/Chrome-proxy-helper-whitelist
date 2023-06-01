var chinaList = [];
var firstimebg = true;
var proxySetting = {};

function saveSettings() {
	if (proxySetting.auto_enable_last_enabled instanceof Date) proxySetting.auto_enable_last_enabled = proxySetting.auto_enable_last_enabled.toString();
	chrome.storage.local.set({
		firstimebg: firstimebg,
		chinaList: chinaList,
		proxySetting: proxySetting,
	});
	if (proxySetting.auto_enable_last_enabled) proxySetting.auto_enable_last_enabled = new Date(proxySetting.auto_enable_last_enabled);
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
		},
		function (items) {
			proxySetting = items.proxySetting;
			if (proxySetting.auto_enable_last_enabled) proxySetting.auto_enable_last_enabled = new Date(proxySetting.auto_enable_last_enabled);
			firstimebg = items.firstimebg;
			chinaList = items.chinaList;
			startafter();
		}
	);
}

function setProxyIcon() {
	var icon = {
		path: "images/off.png",
	};

	chrome.proxy.settings.get({ incognito: false }, function (config) {
		if (config["value"]["mode"] == "system") {
			chrome.action.setIcon(icon);
		} else if (config["value"]["mode"] == "direct") {
			chrome.action.setIcon(icon);
		} else {
			icon["path"] = "images/on.png";
			chrome.action.setIcon(icon);
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
	loadSettings();
	if (proxySetting) {
		var auth = proxySetting["auth"];
		var username = auth["user"];
		var password = auth["pass"];
	}

	if (proxySetting["auth"]["user"] == "" && proxySetting["auth"]["pass"] == "") return {};

	return { authCredentials: { username: username, password: password } };
}

chrome.webRequest.onAuthRequired.addListener(callbackFn, { urls: ["<all_urls>"] }, [
	"blocking",
	"responseHeaders",
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
			},
			firstimebg: true,
			chinaList: ["*.cn"],
		})
	);
}

chrome.proxy.onProxyError.addListener(function (details) {
	console.log("fatal: ", details.fatal);
	console.log("error: ", details.error);
	console.log("details: ", details.details);
});

//loads the settings and then sets the rest of the data(this is not a function just calling one)
loadSettings(() => {
	setProxyIcon();
	loadSettings();
	if (firstimebg) {
		//save the settings for the first time.
		firstimebg = false;
		saveSettings();
	}
});
/*
 * check if user goes to url which needs vpn to be enabled.
 * regex will be used. see https://www.regexpal.com/ as example.
 * code from https://github.com/igrigorik/videospeed/pull/790/files
 */
var regStrip = /^[\r\t\f\v ]+|[\r\t\f\v ]+$/gm;
var regEndsWithFlags = /\/(?!.*(.).*\1)[gimsuy]*$/;
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url && proxySetting.auto_enable_list != "") {
		const checkDate = new Date();
		const timeDifference = convertToHours(proxySetting.auto_enable_timer);
		checkDate.setHours(checkDate.getHours() + timeDifference);
		if (proxySetting.auto_enable_timer == null || proxySetting.auto_enable_last_enabled == null || checkDate < proxySetting.auto_enable_last_enabled) {
			isInList = false;
			proxySetting.auto_enable_list.split("\n").forEach((match) => {
				match = match.replace(regStrip, "");
				if (match.length == 0) {
					return;
				}

				if (match.startsWith("/")) {
					try {
						var regexp = new RegExp(match);
						var parts = match.split("/");

						if (regEndsWithFlags.test(match)) {
							var flags = parts.pop();
							var regex = parts.slice(1).join("/");
						} else {
							var flags = "";
							var regex = match;
						}

						var regexp = new RegExp(regex, flags);
					} catch (err) {
						return;
					}
				} else {
					var regexp = new RegExp(escapeStringRegExp(match));
				}
				if (regexp.test(changeInfo.url)) {
					isInList = true;
					return;
				}
			});
			if (isInList) {
				loadSettings();
				proxySetting.auto_enable_last_enabled = new Date();
				saveSettings();
				//TODO: enable vpn here.
				console.log("i get enabled.");
			}
		}
	}
});

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
 * replace escape parts
 */
function escapeStringRegExp(str) {
	matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
	return str.replace(matchOperatorsRe, "\\$&");
}
