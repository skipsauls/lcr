window.wave.Dataset = function() {
	window.wave.Base.call();

	this.getVersions = function(handler) {
		var opts = {
	    	method: 'GET',
	    	path: this._def.versionsUrl
		};
		var self = this;
	    force.request(opts,
		    function(res) {
		    	res = processResponse(res);
				self._def.versions = res.versions;		    	
		    	if (typeof handler === "function") {
		    		handler(res.versions, null);
		    	}
		    },
		    function(err) {
		   		err = processError(err);
		    	if (typeof handler === "function") {
		    		handler(null, err);
		    	}
		    }
	    );
	}

	this.getVersion = function(id, handler) {
		var version = null;			
		for (var i = 0; i < this._def.versions.length; i++) {
			if (this._def.versions[i].id === id) {
				version = this._def.versions[i];
				break;
			}
		}
		if (this._def.versions[i].data) {

			handler(this._def.versions[i].data, null);
			return;
		}

		var opts = {
	    	method: 'GET',
	    	path: version.url
		};
		var self = this;
	    force.request(opts,
		    function(res) {
		    	res = processResponse(res);
		    	self._def.versions[i].data = res;
		    	if (typeof handler === "function") {
		    		handler(res, null);
		    	}
		    },
		    function(err) {
		   		err = processError(err);
		    	if (typeof handler === "function") {
		    		handler(null, err);
		    	}
		    }
	    );
	}

	this.getDimensions = function(handler) {
		// Need to be able to set the version on the object!!!!!!
		if (this._def.versions) {
			var version = null;
			this.getVersion(this._def.versions[0].id, function(res, err) {
				version = res;
				if (version.xmdMain) {
					handler(version.xmdMain.dimensions, null);
				} else {
					handler(null, 'No dimensions found');
				}
			});
		}
	}

	this.getMeasures = function(handler) {
		// Need to be able to set the version on the object!!!!!!
		if (this._def.versions) {
			var version = null;
			this.getVersion(this._def.versions[0].id, function(res, err) {
				version = res;
				if (version.xmdMain) {
					handler(version.xmdMain.measures, null);
				} else {
					handler(null, 'No measures found');
				}
			});
		}
	}

	this.getDates = function(handler) {
		// Need to be able to set the version on the object!!!!!!
		if (this._def.versions) {
			var version = null;
			this.getVersion(this._def.versions[0].id, function(res, err) {
				version = res;
				if (version.xmdMain) {
					handler(version.xmdMain.dates, null);
				} else {
					handler(null, 'No dates found');
				}
			});
		}
	}		
}

window.wave.Dataset.prototype = Object.create(window.wave.Base.prototype);
window.wave.Dataset.prototype.constructor = window.wave.Dataset;
window.wave.Dataset.prototype.defaultImage = "/analytics/wave/web/proto/images/thumbs/thumb-edgemart.png";
