'use strict'

const {webSockets, longPolling, serverSentEvents} = require('./transportTypes')

module.exports = getTransport

const transportTypeMap = {
    [webSockets]: require('./wsTransport'),
    [longPolling]: require('./longPollingTransport'),
    [serverSentEvents]: require('./sseTransport'),
}

function getTransport(type) {
    const transport = transportTypeMap[type]

    if(!transport) {
        throw new Error(`Invalid transport type ${type}`)
    }

    return transport
}

