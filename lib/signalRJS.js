'use strict'

const util = require('util')
const events = require('events')
const uuid = require('node-uuid')
const WSServer = require('ws').Server
const url = require('url')
const Router = require('express').Router
const HubService = require('./hubs')
const bodyParser = require('body-parser')
const EVENT_CONSTANTS = require('./common/eventConstants')
const ConnectionManager = require('./connections/connectionManager')
const signalrRequestParser = require('./web-services/middleware/signalrRequestParser')
const getTransport = require('./transports')
const defaultServerProperties = require('./defaultServerProperties.json')

const SIGNAL_R_WEB_METHODS = [
    'poll',
    'send',
    'user',
    'ping',
    'start',
    'abort',
    'connect',
    'negotiate',
    'reconnect',
    'hubs'
]

function isValidSignalRWebMethod(name) {
    return SIGNAL_R_WEB_METHODS.indexOf(name) > -1
}

function SignalRJS(serverProperties = {}) {
    if (!(this instanceof SignalRJS)) {
        return new SignalRJS(serverProperties)
    }

    this._serverProperties = Object.assign({}, defaultServerProperties, serverProperties)
    this._connectionManager = new ConnectionManager()
    this._hubService = new HubService()
    this.heartBeat(serverProperties.HeartBeatInterval)
}

util.inherits(SignalRJS, events.EventEmitter)

SignalRJS.prototype = util._extend(SignalRJS.prototype, {
    start(req, res) {
        res.send({Response: 'started'})
        this.emit(EVENT_CONSTANTS.connected)
    },

    connect(req, res) {
        const {user, token, transportType} = req.signalrjs
        getTransport(transportType).connect(res)
        this._connectionManager.put(user, token, transportType, res)
    },

    reconnect(req, res) {
        const {token, transportType} = req.signalrjs
        const connection = this._connectionManager.getByToken(token)

        if (!connection) {
            this._connectionManager.put(null, token, transportType, res)
        } else {
            this._connectionManager.updateConnection(token, res)
        }

        getTransport(transportType).send(res, [])
    },

    createNewConnectionProperties() {
        return Object.assign({}, this._serverProperties, {
            ConnectionId: uuid.v4(),
            ConnectionToken: uuid.v4(),
        })
    },

    negotiate(req, res) {
        const connectionProperties = this.createNewConnectionProperties()
        res.send(connectionProperties)
    },

    heartBeat(heartBeatInterval) {
        setInterval(() => {
            this._connectionManager
                .map(({connection, type}) => ({connection, transport: getTransport(type)}))
                .filter(({transport}) => transport.sendHeartBeat)
                .forEach(({connection, transport}) => {
                    transport.sendHeartBeat(connection)
                })
        }, heartBeatInterval)
    },

    poll(req, res) {
        const {token} = req.signalrjs
        this._connectionManager.updateConnection(token, res)
        setTimeout(() => {
            const c = this._connectionManager.getByToken(token)
            if (c) {
                getTransport(c.type)
                    .send(c.connection, [])
            }
        }, 30000)
    },

    ping(req, res) {
        res.send({Response: 'pong'})
    },

    abort(req, res) {
        const {token} = req.signalrjs
        this._connectionManager.delByToken(token)
        res.send({Response: 'aborted'})
    },

    hub(hubName, hubObject) {
        this._hubService.add(hubName, hubObject)
        return this
    },

    hubs(req, res, next) {
        this._hubService.getClientScript()
            .then((clientHubScript) => {
                res.setHeader('Content-Type', 'application/javascript')
                res.send(clientHubScript)
            })
            .catch(next)
    },

    user(req, res) {
        const {user, token} = req.signalrjs
        this._connectionManager.setUserToken(user, token)
        res.send({})
    },

    send(req, res) {
        const msg = req.body && req.body.data
        const token = req.signalrjs.token
        const c = this._connectionManager.getByToken(token)        
        const transport = getTransport(c.type)
        const caller = {
            send: transport.send.bind(null, c.connection)
        }
        this._hubService.parseMessage(caller, msg, (msg, toUser) => {
            res.send()
            if (toUser) {
                return this.sendToUser(toUser, msg)
            }
            this.broadcast(msg)
        })
    },

    broadcast(msg) {
        this._connectionManager.forEach(({connection, type}) => {
            getTransport(type).send(connection, msg)
        })
    },

    sendToUser(user, msg) {
        const c = this._connectionManager.getByUser(user)
        if (c && c.connection) {
            getTransport(c.type)
                .send(c.connection, msg)
        }
    },

    createListener() {
        return Router()
            .use(bodyParser.urlencoded({extended: false}))
            .use(signalrRequestParser())
            .use(this._serverProperties.Url + '/:method', (req, res, next) => {
                this._handleRequest(req, res, next)
            })
    },

    createWsListener(server) {

        const wss = new WSServer({server})

        wss.shouldHandle = (req) => url.parse(req.url).pathname.startsWith(this._serverProperties.Url)

        wss.on('connection', (webSocket) => {

            const {pathname, query: {connectionToken, transport}} = url.parse(webSocket.upgradeReq.url, true)

            const req = {
                signalrjs: {
                    user: null,
                    token: connectionToken,
                    transportType: transport
                }
            }

            if (pathname.startsWith(this._serverProperties.Url + '/reconnect')) {
                this.reconnect(req, webSocket)
            } else {
                this.connect(req, webSocket)
            }

            webSocket.on('close', () => {
                this._connectionManager.delByToken(connectionToken)
            })

            webSocket.on('message', (data) => {
                this.send({body: {data}, signalrjs: req.signalrjs}, webSocket)
            })
        })
    },

    _handleRequest(req, res, next) {
        const {method} = req.params

        if (isValidSignalRWebMethod(method)) {
            this[method](req, res)
        } else {
            next()
        }
    }
})

module.exports = SignalRJS
