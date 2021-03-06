var findBestFacet = require("./facet").findBestFacet,
	Facet = require("./facet").Facet,
	AccessError = require("./errors").AccessError;
	
exports.FacetResolver = function(env){
	var resolver = {
		getEntityStore: function(storeName){
			var store = env.transaction.getEntityStore(storeName);
			var bestFacet = findBestFacet(store, env.allowedFacets);
			if(!bestFacet){
				throw new AccessError("No facet available to access " + storeName);
			}
			return bestFacet.forStore(store, resolver);
			/*var localeStore = Locale.facetFor(store, resolver, env.headers["accept-language"]);
			facetedStore = SchemaFacet.facetFor(store, resolver, env.headers.accept);
			return facetedStore;*/
			return require("./security").FullAccess(store, resolver);
		},
		createEntityStore: function(){
			return env.transaction.createEntityStore.apply(transaction, arguments);
		},
		env: env
	};
	return resolver;
};