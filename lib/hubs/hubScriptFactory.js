'use strict';

const cachedFileReader = require('./cachedFileReader')
const path = require('path');

const templateHubFilePath = path.resolve(__dirname, 'templateHub.js')
const readHubTemplate = cachedFileReader.create(templateHubFilePath)

module.exports = {
    create
};


function create(hubs) {
    return readHubTemplate()
        .then((hubTemplate) => createHubsProxyScript(hubs, hubTemplate))
}

function createHubsProxyScript(hubs, hubTemplate) {
    const hubsProxyScripts = hubs.reduce((src, hub) => src + createHubProxyScriptPt(hub), '');
    return hubTemplate
        .toString()
        .replace('{{PROXY_SECTION}}', hubsProxyScripts)
        .toString()
}

function createHubProxyScriptPt({name, functions}) {
    return `proxies["${name}"] = this.createHubProxy("${name}");
				    proxies["${name}"].client = \{ \};
				    proxies["${name}"].server = \{
                        ${Object.getOwnPropertyNames(functions).map((fnName) => createHubProxyFunctionScriptPt(name, fnName))}
                    \};`
}

function createHubProxyFunctionScriptPt(hubName, fnName) {
    return `${fnName}: function () \{
            return proxies["${hubName}"].invoke.apply(
                    proxies["${hubName}"], $.merge(["${fnName}"], $.makeArray(arguments))
            );
        }`
}