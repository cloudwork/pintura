/**
 * Module for interacting with a WebWorker through JSON-RPC. 
 * You can make a module accessible through JSON-RPC as easily as:
 * some-module.js:
 * require("./json-rpc-worker").server(exports);
 *
 * And to create this worker and fire it off:
 * var Worker = require("worker"),
 *     client = require("./json-rpc-worker").client;
 * var workerInterface = client(new Worker("some-module"));
 * workerInterface.call("foo", [1, 3]).then(function(result){
 * 	... do something with the result ...
 * });
 * 
 */
var addListener = require("./listen").addListener;
// Takes an entity store, that follows the API from:
// http://www.w3.org/TR/WebSimpleDB/
// Messages are communicated between workers using the JSGI 0.3 object structure
// serialized in JSON format. 
exports.server = function(store){
	if (global.onmessage) // dedicated worker
		addListener(global, "onmessage", handleMessage);
	else // shared worker
		addListener(global, "onconnect", function (e) { e.port.onmessage = handleMessage; });
	
	function handleMessage(event){
		var data = JSON.parse(event.data);
		if("id" in data && "method" in data && "params" in data){
			var response = {
				id: data.id,
				error: null, 
				result: null
			};
			try{
				response.result = rpcObject[data.method].apply(rpcObject, data.params);
			}catch(e){
				error = e.message;
			}
			postMessage(JSON.stringify(response));
		}
	}
};

var nextId = 1;
exports.client = function(worker){
	if(worker.port){
		worker = worker.port;
	}
	var requestsWaiting = {};
	addListener(worker, "onmessage", function(event){
		var data = JSON.parse(event.data);
		if(requestsWaiting[data.id]){
			if(data.error === null){
				requestsWaiting[data.id].fulfill(data.result);
			}
			else{
				requestsWaiting[data.id].error(data.error);
			}
			delete requestsWaiting[data.id];
		}
	});
	return {
		call: function(method, params){
			var id = nextId++;
			
			worker.postMessage(JSON.stringify({
				id: id,
				method: method,
				params: params
			}));
			promise = new Promise();
			requestsWaiting[id] = promise;
			return promise;
		}
	};
};