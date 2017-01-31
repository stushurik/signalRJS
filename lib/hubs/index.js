'use strict';

const hubFactory = require('./hubFactory');
const hubScriptFactory = require('./hubScriptFactory');

class HubService {
    constructor() {
        this._hubs = []
    }

    add(hubName, hubFunctions) {
        const hub = hubFactory(hubName, hubFunctions)
        this._hubs.push(hub)
    }

    getClientScript() {
        return hubScriptFactory.create(this._hubs);
    }

    parseMessage(data, cb) {
        this._hubs.forEach(function (hub) {
            hub.createClientResponse(data, (err, clientResponse, to) => {
                if (err || !clientResponse) {
                    return;
                }
                cb(clientResponse, to);
            });
        });
    }
}

module.exports = HubService

