/**
 * This middleware module provides authentication
 */
var AccessError = require("../security").AccessError,
	Response = require("../jsgi/response").Response;
	
exports.Authentication = function(security, nextApp){
	security.userStore; // make sure it is initialized
	return function(request){
		// TODO: needs Basic (and maybe other) authentication
		var user;
		if(request.headers.authorization){
			var userPass = request.headers.authorization.split(":", 2);
			user = security.authenticate(userPass[0], userPass[1]);
		}
		else if(!request.crossSiteForgeable || request.method == "GET"){
			// it is safe to do GETs since they have no side-effect, however the JSON
			// serializer must ensure that they don't serialize hijackable content
			var cookieId, cookie = request.headers.cookie;
			cookieId = cookie && cookie.match(/pintura-auth=([^;]+)/);
			cookieId = cookieId && cookieId[1];
			if(cookieId){
				security.authStore.startTransaction();
				var auth = security.authStore.get(cookieId);
				security.authStore.commitTransaction();
				user = auth && auth.user; 
			}
		}
		request.security = security;
		request.authenticatedUser = user;
		var response = nextApp(request);
		if(user && !response.headers.username){
			response.headers.username = security.getUsername(user);
		}
		return response;
	};	
};

exports.setAuthCookie = function(authId, username, expires){
	var response = new Response();
	if(!authId){
		expires = new Date(1).toGMTString();
	}
	response.headers = {
		"set-cookie": "pintura-auth=" + authId + ";path=/" + (expires ? ";expires=" + expires : ""),
		username: username
	};
	response.status = 200;
	return response;
};