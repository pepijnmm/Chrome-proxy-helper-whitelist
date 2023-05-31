var chinaList = ["*.cn"];
var firstimebg = true;
var proxySetting = {};

function save_settings() {
	chrome.storage.sync.set({
		firstimebg: firstimebg,
		chinaList: chinaList,
		proxySetting: proxySetting,
	});
}
function load_settings(startafter = () => {}) {
	chrome.storage.sync.get(
		{
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
			},
			firstimebg: true,
			chinaList: ["*.cn"],
		},
		function (items) {
			proxySetting = items.proxySetting;
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
	var proxySetting = null;
	chrome.storage.sync.get(
		{
			proxySetting: null,
		},
		function (items) {
			proxySetting = items.proxySetting;
		}
	);

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

function getBypass() {
	var req = new XMLHttpRequest();
	var url = "https://raw.github.com/henices/Chrome-proxy-helper/master/data/cn.bypasslist";
	req.open("GET", url, true);
	req.onreadystatechange = processResponse;
	req.send(null);

	function processResponse() {
		// var chinaList = [];
		// chrome.storage.sync.get(
		// 	{
		// 		chinaList: [],
		// 	},
		// 	function (items) {
		// 		chinaList = items.chinaList;
		// 	}
		// );
		if (req.readyState == 4 && req.status == 200) {
			chinaList = req.responseText.split(",");
		}
		save_settings();
	}
}

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason == "install") {
		save_settings();
		gotoPage("options.html");
	}
	/*
    else if(details.reason == "update") {
        gotoPage('CHANGELOG');
    }
*/
});

chrome.commands.onCommand.addListener(function (command) {
	if (command == "open-option") gotoPage("options.html");
});

// sync extension settings from google cloud
//chrome.storage.sync.get('proxySetting', function(val) {
//    if (typeof val.proxySetting !== "undefined")
//        localStorage.proxySetting = val.proxySetting;
//});

chrome.proxy.onProxyError.addListener(function (details) {
	console.log("fatal: ", details.fatal);
	console.log("error: ", details.error);
	console.log("details: ", details.details);
});

load_settings(() => {
	setProxyIcon();
	if (firstimebg) {
		firstimebg = false;
		save_settings();
	}
});
// sync bypass list from github.com
//getBypass();
//setInterval(function() { getBypass(); }, interval);
//var interval = 1000 * 60 * 60;
