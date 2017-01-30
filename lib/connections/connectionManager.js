'use strict';
var UserTokens = require('./userTokens');

module.exports = function(){
	var userTokens = new UserTokens();
	return {
		_connections : {},
		_userTokens : userTokens,
		put : function(user, token , type, connection){
			this._userTokens.put(user, token);
			this._connections[token] = {
				type : type,
				connection : connection
			};
		},
		updateConnection : function(token, newConnection){
			if(!token)
				return;
			var connection = this._connections[token];
			if(!connection)
				return;
			connection.connection = newConnection;
			this._connections[token] = connection;
		},
		getByToken : function(token){
			if(token)
				return this._connections[token];
		},
		getByUser : function(user){
			var token = this._userTokens.getByUser(user);
			if(token)
				return this._connections[token];
		},
		forEach : function(cb){
			for(var token in this._connections){
				cb(this._connections[token]);
			}
		},
        map : function(cb){
            return Object.getOwnPropertyNames(this._connections)
                .map((token, i) => cb(this._connections[token], i))
        },
		setUserToken : function(user, token){
			if(!user || !token)
				return;
			if(this._connections[token])
				return this._userTokens.put(user,token);
		},
		delByToken : function(token){
			this._userTokens.delByToken(token);
			if(this._connections[token])
				delete this._connections[token];
		}
	};
};