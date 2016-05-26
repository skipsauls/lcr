// Not a great workaround for using on Node.js!!!!!
var window = typeof window === "undefined" ? {} : window;

window.wave = (function () {
	
    "use strict";

    // Note that we should restrict min version to 36.0 for SDK
    var apiVersion = 'v37.0';
    var minApiVersion = 'v36.0';

    var _user = null; // Cached user object

	var singularNameMap = {
        'dashboards': 'dashboard',
        'datasets': 'dataset',
        'lenses': 'lens'
    };

	var pluralNameMap = {
        'dashboard': 'dashboards',
        'dataset': 'datasets',
        'lens': 'lenses'
    };

    /**
     * Passthrough for force.init + additional TBD
     */
	function init(params) {
		if (params && params.apiVersion) {
			try {
				var version = parseFloat(params.apiVersion.replace('v', ''));
				if (version < parseFloat(minApiVersion.replace('v', ''))) {
					params.apiVersion = minApiVersion;
					throw 'Setting API version to ' + minApiVersion + ', the minimum supported API version for Wave Analytics';
				} else {
				}
			} catch (e) {
				console.error('Exception: ', e);
			}
		}

		var oauth = localStorage.getItem('forceOAuth');
		if (oauth) {
			try {
				force.oauth = JSON.parse(oauth)
				force.tokenStore.forceOAuth = oauth;

				initUser(function(res, err) {
					if (err) {
						console.warn('initUser error; ', err);
						wave.logout();
					} else {
						_user = res;
					}
				})

			} catch (e) {
				force.oauth = {};
				force.tokenStore.forceOAuth = {};
			}
		}

		force.init(params);
	}

    /**
     * Wrapper for force.login
     */
	function login(handler) {
		var oauth = localStorage.getItem('forceOAuth');
		var needsAuth = true;
		if (oauth) {
			try {
				force.oauth = JSON.parse(oauth)
				force.tokenStore.forceOAuth = oauth;
				needsAuth = false;
		    	if (typeof handler === "function") {

					initUser(function(res, err) {
						if (err) {
							console.warn('initUser error; ', err);
						} else {
							_user = res;
				    		handler({message: 'Already authenticated'}, null);
						}
					});

		    	}
			} catch (e) {

			}
		}

		if (needsAuth === true) {
			force.login(
				function(res) {
					localStorage.setItem('forceOAuth', force.tokenStore.forceOAuth);
		    		if (typeof handler === "function") {
						initUser(function(res, err) {
							if (err) {
								console.warn('initUser error; ', err);
							} else {
								_user = res;
				  				handler(res, null);
							}
						});
		    		}
				},
				function(err) {
		    		if (typeof handler === "function") {
		  				handler(null, err);
		    		}
				}
			);
			
		}
/*
			initUser(function(res, err) {
				if (err) {
					console.warn('initUser error; ', err);
				} else {
					_user = res;
				}
			})
*/
	}

	function logout(handler) {
		force.discardToken();
		force.oauth = {};
		force.tokenStore.forceOAuth = {};
		localStorage.removeItem('forceOAuth');
    	if (typeof handler === "function") {
  			handler(null, null);
    	}
	}

	/**
	 * Wrapper for force.isAuthenticated
	 */

	function isAuthenticated() {
		return force.isAuthenticated();
	}

	function ready() {

	}

	function processResponse(res) {
		return res;
	}

	function processError(err) {
		if (typeof err === "string") {
			return err;
		} else {
			var errObj = typeof err === 'object' ? err : JSON.parse(err);
			var e = null;
			if (errObj instanceof Array) {
				e = errObj[0].message;
			} else {
				e = errObj.message;
			}
			return e;
		}
	}

	function initUser(handler) {
		force.request(
			{ path:'/services/data/' + apiVersion + '/sobjects/User/' + force.getUserId() }, 
			function(res) {
				if (typeof handler === 'function') {
					handler(res, null);
				}
			},
			function(err) {
				if (typeof handler === 'function') {
					handler(null, err);
				}
			}
		);
	}

	function getUser(handler) {
		if (_user) {
			handler(_user, null);
		} else {
			initUser(handler);
		}
	}

	function mergeOpts(defOpts, userOpts) {
		var opts = {};
		for (var key in defOpts) {
			opts[key] = defOpts[key];
		}
		for (var key in userOpts) {
			opts[key] = userOpts[key];
		}
		return opts;
	}

	function createAsset(type, userOpts, handler) {
		console.warn('wave.createAsset: ', type, userOpts);
		var opts = mergeOpts({
	    	method: 'POST',
	    	path: '/services/data/' + apiVersion + '/wave/' + type,
	    	contentType: 'application/json'
		}, userOpts);

	    force.request(opts,
		    function(res) {
		    	res = processResponse(res);
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

	function createApp(userOpts, handler) {
		// NOT SUPPORTED?
		console.error('NOT SUPPORTED');
		return;
		config = config ? config : {};
		var template = mergeOpts(wave.App.template, config);
		var userOpts = {data: template};
		createAsset('apps', userOpts, handler);
	}

	function createDashboard(config, handler) {
		config = config ? config : {};
		var template = mergeOpts(wave.Dashboard.template, config);
		var userOpts = {data: template};
		createAsset('dashboards', userOpts, function(res, err) {
			if (err) {
				handler(null, err);
			} else {
				var dashboard = new wave.Dashboard();
				dashboard.init(res, function() {
					handler(dashboard, null);
			  	});
			}
		});
	}
	
	function createLens(userOpts, handler) {
		// NOT SUPPORTED?
		console.error('NOT SUPPORTED');
		return;
		config = config ? config : {};
		var template = mergeOpts(wave.Lens.template, config);
		var userOpts = {data: template};
		createAsset('lenses', userOpts, handler);
	}
	
	function createDataset(userOpts, handler) {
		// NOT SUPPORTED?
		console.error('NOT SUPPORTED');
		return;
		config = config ? config : {};
		var template = mergeOpts(wave.Dataset.template, config);
		var userOpts = {data: template};
		createAsset('datasets', userOpts, handler);
	}

	function removeAsset(type, userOpts, handler) {
		console.warn('wave.removeAsset: ', type, userOpts);
		var stype = singularNameMap[type];
		var id = userOpts.id || userOpts[stype + 'Id'];
		var opts = mergeOpts({
	    	method: 'DELETE',
	    	path: '/services/data/' + apiVersion + '/wave/' + type + '/' + id
		}, userOpts);

	    force.request(opts,
		    function(res) {
		    	res = processResponse(res);
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

	function removeApp(userOpts, handler) {
		removeAsset('apps', userOpts, handler);
	}

	function removeDashboard(userOpts, handler) {
		removeAsset('dashboards', userOpts, handler);
	}

	function removeLens(userOpts, handler) {
		removeAsset('lenses', userOpts, handler);
	}

	function removeDataset(userOpts, handler) {
		removeAsset('datasets', userOpts, handler);
	}

 	
	function getAssets(type, userOpts, handler) {
		var opts = mergeOpts({
	    	method: 'GET',
	    	path: '/services/data/' + apiVersion + '/wave/' + type
		}, userOpts);
	    force.request(opts,
		    function(res) {
		    	res = processResponse(res[type]);
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

	var _dummies = [
		{
			id: '123456789000',
			name: 'test',
			label: 'Test'
		},
		{
			id: '123456789001',
			name: 'test2',
			label: 'Test 2'
		}
	];

	function getDummies(userOpts, handler) {
		var dummies = [];
		var dummy = null;

		var odummies = _dummies;

		for (var i = 0; i < odummies.length; i++) {
			dummy = new wave.Dummy();
			dummy.init(odummies[i]);
			dummies.push(dummy);
		}

		handler(dummies, null);
	}

	function getPrivateAppTemplate() {
		return {
		  "applicationStatus": "private",
		  "assetSharingUrl": "",
		  "createdBy": {
		    "id": force.getUserId(),
		    "name": _user.Name,
		    "profilePhotoUrl": _user.SmallPhotoUrl
		  },			
	      "icon": {
	        "id": force.getUserId(),
	        "name": "my-app.png",
	        "url": "/analytics/wave/web/proto/images/my-app.png"
	      },
	      "id": force.getUserId(),
	      "label": "My Private App",
	      "name": "My_Private_App",
	      "permissions": {
	        "manage": true,
	        "modify": true,
	        "view": true
	      },
	      "shares": [],
	      "type": "folder",
	      "url": "/services/data/v36.0/wave/folders/" + force.getUserId()
	    };
	}

	function getApps(userOpts, handler) {
		getAssets('folders', userOpts, function(res, err) {

			var apps = [];
			var app = null;

	    	// Add the private app
			var privateAppTemplate = getPrivateAppTemplate();
			app = new wave.App();
			app.init(privateAppTemplate);
			apps.push(app);

			var oapps = res;

			for (var i = 0; i < oapps.length; i++) {
				app = new wave.App();
				app.init(oapps[i]);
				apps.push(app);
			}

			handler(apps, err);
		});
	}

	function getDashboards(userOpts, handler) {
		getAssets('dashboards', userOpts, function(res, err) {
			var dashboards = [];
			var dashboard = null;

			var odashboards = res;

			for (var i = 0; i < odashboards.length; i++) {
				dashboard = new wave.Dashboard();
				dashboard.init(odashboards[i]);
				dashboards.push(dashboard);
			}

			handler(dashboards, err);

		});
	}

	function getLenses(userOpts, handler) {
		//getAssets('lenses', userOpts, handler);
		getAssets('lenses', userOpts, function(res, err) {
			var lenses = [];
			var lens = null;

			var olenses = res;

			for (var i = 0; i < olenses.length; i++) {
				lens = new wave.Lens();
				lens.init(olenses[i]);
				lenses.push(lens);
			}

			handler(lenses, err);

		});
	}

	function getDatasets(userOpts, handler) {
		//getAssets('datasets', userOpts, handler);
		getAssets('datasets', userOpts, function(res, err) {
			var datasets = [];
			var dataset = null;

			var odatasets = res;

			for (var i = 0; i < odatasets.length; i++) {
				dataset = new wave.Dashboard();
				dataset.init(odatasets[i]);
				datasets.push(dataset);
			}

			handler(datasets, err);

		});
	}

	function getAsset(type, userOpts, handler) {
		var stype = singularNameMap[type];
		var id = userOpts.id || userOpts[stype + 'Id'];
		var opts = mergeOpts({
	    	method: 'GET',
	    	path: '/services/data/' + apiVersion + '/wave/' + type + '/' + id
		}, userOpts);
	    force.request(opts,
		    function(res) {
		    	res = processResponse(res);
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

	function getDummy(userOpts, handler) {
		if (typeof handler == "function") {
			if (err) { 
				handler(res, err);
			} else {
				var dummy = new wave.Dummy();
				dummy.init(res, function() {
			       	handler(dummy, null);
		       });
			}
	    }
	}

	function getApp(userOpts, handler) {
		if (userOpts.id === force.getUserId()) {
			var privateAppTemplate = getPrivateAppTemplate();
			if (typeof handler == "function") {
				var app = new wave.App();
				app.init(privateAppTemplate, function() {
			       	handler(app, null);
			    });
			}
		} else {
 			getAsset('folders', userOpts, function(res, err) {
				if (typeof handler == "function") {
					if (err) { 
						handler(res, err);
					} else {
						var app = new wave.App();
						app.init(res, function() {
					       	handler(app, null);
				       });
					}
			    }
 			});
 		}
	}

	function getDashboard(userOpts, handler) {
 		getAsset('dashboards', userOpts, function(res, err) {
			if (typeof handler == "function") {
				if (err) { 
					handler(res, err);
				} else {
					var dashboard = new wave.Dashboard();
					dashboard.init(res, function() {
				       	handler(dashboard, null);
			       });
				}
		    }
		});
	}

	function getLens(userOpts, handler) {
 		getAsset('lenses', userOpts, function(res, err) {
			if (typeof handler == "function") {
				if (err) { 
					handler(res, err);
				} else {
					var lens = new wave.Lens();
					lens.init(res, function() {
				       	handler(lens, null);
			       });
				}
		    }
		});
	}

	function getDataset(userOpts, handler) {
		//getAsset('datasets', userOpts, handler);
 		getAsset('datasets', userOpts, function(res, err) {
			if (typeof handler == "function") {
				if (err) { 
					handler(res, err);
				} else {
					var dataset = new wave.Dataset();
					dataset.init(res, function() {
				       	handler(dataset, null);
			       });
				}
		    }
		});
	}

	function updateAsset(asset, fields, handler) {
		console.warn('updateAsset: ', asset, fields, handler);
		var url = asset.url;
		var opts = {
	    	method: 'PATCH',
	    	path: asset.url,
	    	contentType: 'application/json'
		};
		console.warn('url: ', url);
		console.warn('opts: ', opts);
		var data = {};
		if (fields instanceof Array) {
			for (var i = 0; i < fields.length; i++) {
				data[fields[i]] = asset[fields[i]];
			}
		} else {
			data[fields] = asset[fields];
		}
		console.warn('data: ', data);
		opts.data = data;
		console.warn('opts: ', opts);
	    force.request(opts,
		    function(res) {
		    	res = processResponse(res);
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

	function getImages(item, handler) {
		var imageData = [];
        if (item.files && item.files.length > 0) {
        	var count = 0;
            for (var j = 0; j < item.files.length; j++) {
	            (function(file) {
                    if (file.fileName === "assetPreviewThumb" && file.contentType === "image/png") {
				        var self = this;
        				var xhr = new XMLHttpRequest();
				        xhr.onreadystatechange = function () {
				            if (xhr.readyState === 4) {
				                if (xhr.status > 199 && xhr.status < 300) {
				                	//console.warn('xhr.response: ', xhr.response);
		                            var blob = new Blob([xhr.response], {type: 'image/png'});
		                            var reader = new FileReader();
		                            reader.id = item.id;
		                            reader.onload = function(e) {
		                                var returnedURL = e.target.result;
		                                //console.warn('returnedURL: ', returnedURL);
		                                var returnedBase64 = returnedURL.replace(/^[^,]+,/, '');
		                                imageData.push("data:image/png;base64," + returnedBase64);
		                                count++;
		                                if (count >= item.files.length && handler instanceof Function) {
		                                    handler(imageData);
		                                }
		                            };
		                            reader.readAsDataURL(blob); //Convert the blob from clipboard to base64


				                } else {
				                    console.error(xhr.responseText);
				                }
				            }
				        };

				        xhr.open('GET', force.oauth.instance_url + file.url, true);
				        xhr.responseType = 'arraybuffer';
				        xhr.setRequestHeader("Authorization", "Bearer " + force.oauth.access_token);
				        xhr.send(undefined);
                    }
		 		})(item.files[j]);         
                        
            }
        } else if (item.icon) {
        	imageData.push(force.oauth.instance_url + item.icon.url);
        	handler(imageData);
        } else {
            if (handler instanceof Function) {
                handler(null);
            }
        }
	}


    // The public API
    return {
        init: init,
        login: login,
        logout: logout,
        isAuthenticated: isAuthenticated,
        getUser: getUser,

        createAsset: createAsset,
        createApp: createApp,
        createDashboard: createDashboard,
        createLens: createLens,
        createDataset: createDataset,        

        removeAsset: removeAsset,
        removeApp: removeApp,
        removeDashboard: removeDashboard,
        removeLens: removeLens,
        removeDataset: removeDataset,        

        getAssets: getAssets,
        getAsset: getAsset,
        updateAsset: updateAsset,
        getImages: getImages,

        getApps: getApps,
        getApp: getApp,
        getDashboards: getDashboards,
        getDashboard: getDashboard,
        getLenses: getLenses,
        getLens: getLens,
        getDatasets: getDatasets,
        getDataset: getDataset,



    /*
        init: init,
        login: login,
        getUserId: getUserId,
        isAuthenticated: isAuthenticated,
        request: request,
        query: query,
        create: create,
        update: update,
        del: del,
        upsert: upsert,
        retrieve: retrieve,
        apexrest: apexrest,
        chatter: chatter,
        discardToken: discardToken,
        oauthCallback: oauthCallback,
        getPickListValues: getPickListValues,
        getAttachment: getAttachment
	*/        
    };

}());

window.wave.Base = function () {
}

window.wave.Base.prototype._def = {};

window.wave.Base.prototype.defaultImage = "/analytics/wave/web/proto/images/thumbs/thumb-dashboard.png";

window.wave.Base.prototype.init = function(def, handler) {
	this._def = def;
	this._typeMap = {
		'folder': 'app'
 	};

 	this.template = {

 	};

 	this.getDef = function(handler) {
		if (typeof handler === "function") {
			handler(this._def, null);
		} else {
			return this._def;
		}
 	}

 	this.getId = function() {
 		return this._def.id;
 	}

	this.getApp = function(handler) {
		if (this._def && this._def.folder) {
			getApp(
				{
					id: this._def.folder.id
				},
				handler
			);
		} else {
			if (typeof handler === "function") {
				handler(null, "No app found, perhaps you are calling this from an App?");
			} else {
				"No app found, perhaps you are calling this from an App?";
			}
		}
	}		

	if (typeof handler === 'function') {
		handler(this);
	}
}

window.wave.Base.prototype.getType = function() {
	return this._typeMap[this._def.type] || this._def.type;
}

window.wave.Base.prototype.getName = function() {
	return this._def.name;
}

window.wave.Base.prototype.getLabel = function() {
	return this._def.label;
}

window.wave.Base.prototype.setLabel = function(label) {
	this._def.label = label;
	wave.updateAsset(this._def, 'label', function(res, err) {
		console.warn('updateAsset returned: ', res, err);
	});
}

window.wave.Base.prototype.getFolderId = function() {
	return this._def.folder.id;
}

window.wave.Base.prototype.setFolderId = function(id) {
	this._def.folder.id = id;
	wave.updateAsset(this._def, 'folder', function(res, err) {
		console.warn('updateAsset returned: ', res, err);
	});
}

window.wave.Base.prototype.getPreview = function(handler) {
	if (this._def.imageData) {
		if (typeof handler === 'function') {
			handler(this._def.imageData.length ? this._def.imageData[0] : this._def.imageData, null)
		}
	} else {
		//return force.oauth.instance_url + this.defaultImage;

		var self = this;
		var t1 = window.performance.now();
		wave.getImages(this._def, function(imageData) {
			var t2 = window.performance.now();
			console.log('getImages timing: ' + (imageData !== null ? imageData.length : 0) + ' images in ' + ((t2 - t1) / 1000).toFixed(4) + ' seconds');
			self._def.imageData = imageData;
			if (typeof handler === 'function') {
				var img = self._def.imageData ? (self._def.imageData.length ? self._def.imageData[0] : self._def.imageData, force.oauth.instance_url + self.defaultImage) : null;
				handler(self._def.imageData || force.oauth.instance_url + self.defaultImage);
			}
		});
	}

	return;

	if (this._def.imageData) {
		return this._def.imageData.length ? this._def.imageData[0] : this._def.imageData;
	} else {
		return force.oauth.instance_url + this.defaultImage;
	}
}


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

window.wave.Lens = function() {
	wave.Base.call();
	var vtypes = {
		calheatmap: 'Calendar heat map',
		comparisontable: 'Comparison table',
		heatmap: 'Heat map',
		hbar: 'Horizontal bar',
		hbarhdot: 'Horizontal dot plot',
		matrix: 'Matrix',
		parallelcoords: 'Parallel coordinates',
		pie: 'Donut',
		pivottable: 'Pivot table',
		scatter: 'Scatter plot',
		stackhbar: 'Stacked horizontal bar',
		stackvbar: 'Stacked vertical bar',
		time: 'Time line',
		valuestable: 'Values table',
		vbar: 'Vertical bar',
		vdot: 'Vertical dot plot',			
	};
	this.getVisualizationTypes = function() { return vtypes; }
	this.getVisualizationType = function() {
		return this._def ? {name: this._def.visualizationType, label: vtypes[this._def.visualizationType]} : null;
	}
}		
window.wave.Lens.prototype = Object.create(window.wave.Base.prototype);
window.wave.Lens.prototype.constructor = window.wave.Lens;
window.wave.Lens.prototype.defaultImage = "/analytics/wave/web/proto/images/thumbs/thumb-chart-hbar.png";
window.wave.Lens.prototype.setVisualizationType = function(vtype) {
	this._def.visualizationType = vtype;
	updateAsset(this._def, 'visualizationType', function(res, err) {
		console.warn('updateAsset returned: ', res, err);
	});
}
window.wave.Widget = function() {
	var _name;
	var _def;

	this.callbacks = {};

	var self = this;

	this.listener = function(evt) {
        try {
        	var data = evt.data.data;
	        var uid = data.uid;
	        var callback = self.callbacks[uid];
	        if (typeof callback === 'function') {
	        	if (data.err) {
	        		callback(null, data.err);
	        	} else {
		        	callback(data.result, null);
				}
	        }
        } catch (e) {}
	}

	this.init = function(name, def) {
		this._name = name;
		this._def = def;

		window.addEventListener('message', this.listener, false);
	}

	this.sendMessage = function(config, callback) {
		var uid = Date.now();
		this.callbacks[uid] = callback;
		config.uid = uid;
		var waveFrame = document.getElementsByClassName("wave-embedded-frame")[0];
		var win = waveFrame.contentWindow;
		win.postMessage(config, "*");
	}

	this.getView = function() {
		var waveFrame = document.getElementsByClassName("wave-embedded-frame")[0];
		var frame = waveFrame.contentDocument.getElementById("explore");
		var view = frame.contentWindow.edgeChrome.tabManager.getSelectedView();
		return view;
	}

	this.getReactComponent = function() {
		var view = this.getView();
		var rc = view.getReactComponent();	
		return rc;
	}

	this.getName = function() {
		return this._name;
	}

	this.getChartType = function() {
		return this._def.parameters.visualizationType ;
	}

	this.getChartTypes = function(handler) {

		// Testing
		var config = {
			type: 'function_call',
			name: 'getChartTypes',
			params: {
				name: this._name
			}
		};

		this.sendMessage(config, handler);
	}

	this.setChartType = function(type) {
		//var view = this.getView();

		this._def.parameters.visualizationType = type;

		// Testing
		var config = {
			type: 'function_call',
			name: 'setChartType',
			params: {
				name: this._name,
				type: this._def.parameters.visualizationType
			}
		};

		this.sendMessage(config);
	}
}
window.wave.Dashboard = function() {
	window.wave.Base.call();

	// FOR DEMO ONLY
	this.previewUrl = "https://wavepm.force.com/demo/embed2?id={{id}}";
	this.createComponent = function(config, handler) {
		console.warn('Dashboard.creatComponent config: ', config);

		var el = null;

		if (config.locator) {
			if (config.locator.id) {
				el = document.getElementById(config.locator.id);
			}
			// More variations here!
		}

		var width = config.width || '600px';
		var height = config.height || '500px';
		var style = config.style || '';
		var clas = 'wave-embedded-frame' + (config.class ? ' ' + config.class : '');
		var timestamp = Date.now();
		var name = config.name || 'embed_' + timestamp;
		var id = config.id || 'embed_' + timestamp;

		if (el) {

			var iframe = document.createElement('iframe');
			iframe.setAttribute('width', width);
			iframe.setAttribute('height', height);
			iframe.setAttribute('name', name);
			iframe.setAttribute('id', id);
			iframe.setAttribute('class', clas);
			iframe.setAttribute('style', style);
			iframe.src = this.previewUrl.replace('{{id}}', this.getId());
			iframe.onload = function(e) {
				console.warn('iframe onload: ', e);
				if (typeof handler === 'function') {
					handler(e, null);
				}
			}
			iframe.onerror = function(e) {
				console.error('iframe error: ', e);
				if (typeof handler === 'function') {
					handler(null, e);
				}
			}
			el.appendChild(iframe);
		}

	}

	this.getWidgets = function(handler) {
		var widgets = {};
		var widget = null;
		for (var name in this._def.state.widgets) {
			widget = new wave.Widget();
			widget.init(name, this._def.state.widgets[name]);
			widgets[name] = widget;
		}
		if (typeof handler === 'function') {
			handler(widgets, null);
		}
		return widgets;
	}

	this.getWidget = function(name, handler) {
		var widget = new wave.Widget();
		widget.init(name, this._def.state.widgets[name]);
		if (typeof handler === 'function') {
			handler(widget, null);
		}
		return widget;
	}

	this.getChartType = function(name, handler) {
		var widgets = this.getWidgets();
		var widget = widgets[name];
		var type = widget.getChartType();
		if (typeof handler === 'function') {
			handler(type, null);
		}
		return type;
	}

	this.setChartType = function(name, type, handler) {
		var widgets = this.getWidgets();
		var widget = widgets[name];
		var ret = widget.setChartType(type);
		var steps = {};
		var query = null;
		for (var key in this._def.state.steps) {
			steps[key] = this._def.state.steps[key];
			query = steps[key].query.query.replace(/\&quot;/g, '"');
			console.warn('query: ', query);
			steps[key].query.query = query;
			for (var i = 0; i < steps[key].datasets.length; i++) {
				steps[key].datasets[i] = {
					name: steps[key].datasets[i].name
				}
			}

		}
		var def = {
			url: this._def.url,
			label: this._def.label,
			folder: {
				id: this._def.folder.id
			},
			state: {
				steps: steps,
				widgets: this._def.state.widgets,
				layouts: this._def.state.layouts,
				gridLayouts: this._def.state.gridLayouts,
			}
		};
		wave.updateAsset(def, ['label','folder','state'], function(res, err) {
			console.warn('updateAsset returned: ', res, err);
			if (typeof handler === 'function') {
				handler(type, null);
			}
		});
	}

//{"label":"Empty Dashboard","folder":{"id":"005B0000001ow8xIAA"},"state":{"steps":{"Id_0":{"datasets":[{"id":"0FbB00000000LnBKAU","label":"Opportunities","name":"opportunity","url":"/services/data/v36.0/wave/datasets/0FbB00000000LnBKAU"}],"isFacet":true,"isGlobal":false,"query":{"query":"{&quot;measures&quot;:[[&quot;max&quot;,&quot;Amount&quot;]],&quot;groups&quot;:[&quot;Id&quot;]}","version":-1},"selectMode":"single","type":"aggregate","useGlobal":true,"visualizationParameters":{"visualizationType":"hbar"}}},"widgets":{"chart_0":{"parameters":{"legend":false,"step":"Id_1","visualizationType":"hbar"},"position":{"x":0,"y":0},"type":"chart"}},"layouts":[],"gridLayouts":[{"name":"desktop","pages":[{"widgets":[{"colspan":6,"column":6,"name":"chart_1","row":0,"rowspan":10,"widgetStyle":{"borderEdges":[]}}]}],"selectors":[],"version":1,"widgetStyle":{"borderEdges":[]}}]}}
	this.store = function(handler) {
		var def = {
			url: this._def.url,
			label: this._def.label,
			folder: {
				id: this._def.folder.id
			},
			state: {
				steps: this._def.state.steps,
				widgets: this._def.state.widgets,
				layouts: this._def.state.layouts,
				gridLayouts: this._def.state.gridLayouts,
			}
		};
		wave.updateAsset(def, ['label','folder','state'], function(res, err) {
			console.warn('updateAsset returned: ', res, err);
			if (typeof handler === 'function') {
				if (err) {
					handler(null, err);
				} else {
					handler(res, null);
				}
			}
		});
	}

	this.addStep = function(name, properties, handler) {
		console.warn('Dashboard.addStep: ', properties);

		var steps = this._def.state.steps;

		var count = 0;
		for (var k in steps) {
			count++;
		}

		//var name = 'Id_' + count;

		var stepDef = properties;
		
		console.warn('stepDef: ', stepDef);

		steps[name] = stepDef;

		console.warn('steps');

	}

 	this.addWidget = function(name, type, parameters, position, layout, handler) {
		console.warn('Dashboard.addWidget: ', type, parameters, position);

		var widgets = this._def.state.widgets;

		var widgetDef = {
			parameters: parameters,
			position: position,
			type: type
		};

		console.warn('widgetDef: ', widgetDef);

		var typeCount = 0;
		for (var k in widgets) {
			if (widgets[k].type === type) {
				typeCount++;
			}
		}

		//var name = type + '_' + typeCount;
		//var name = parameters.name;

		widgets[name] = widgetDef;

		console.warn('widgets: ', widgets);

		var gridLayouts = this._def.state.gridLayouts;

		var gridLayout = gridLayouts[0];

		var page = gridLayout.pages[0];

		page.widgets.push(layout);

		console.warn('myDashboard: ', myDashboard);

	}

}
window.wave.Dashboard.prototype = Object.create(window.wave.Base.prototype);
window.wave.Dashboard.prototype.constructor = window.wave.Dashboard;
window.wave.Dashboard.prototype.defaultImage = "/analytics/wave/web/proto/images/thumbs/thumb-dashboard.png";

window.wave.Dashboard.template = {
  "folder": {
    "id": "005B0000001ow8xIAA"
  },
  "label": "New Dashboard",
  "name": "New_Dashboard",
  "description": "",
  "state": {
    "gridLayouts": [
      {
        "name": "desktop",
        "pages": [
          {
            "widgets": []
          }
        ],
        "selectors": [],
        "version": 1,
        "widgetStyle": {
          "borderEdges": []
        }
      }
    ],
    "layouts": [],
    "steps": {},
    "widgets": {}
  }
};


window.wave.Step = function() {

 	this.getDef = function(handler) {
		return this._def;
 	}

	this.setName = function(name) {
		this.name = name;
	}

	this.getName = function() {
		return this.name;
	}

	this.setDatasets = function(datasets) {
		this._def.datasets = datasets;
	}

	this.getDatasets = function() {
		return this._def.datasets;
	}

	this.addDataset = function(dataset, handler) {
		this._def.datasets.push(dataset);
	}

	this.setFacet = function(val) {
		this._def.isFacet = val;
	}

	this.isFacet = function() {
		return this._def.isFacet;
	}

	this.setIsGlobal = function(val) {
		this._def.isGlobal = val;
	}

	this.isGlobal = function() {
		return this._def.isGlobal;
	}

	this.setQuery = function(query) {
		this._def.query.query = query;
	}

	this.getQuery = function() {
		return this._def.query.query;
	}

	this.setQueryVersion = function(version) {
		this._def.query.version = version;
	}

	this.getQueryVersion = function() {
		return this._def.query.version;
	}

	this.setSelectMode = function(mode) {
		this._def.selectMode = mode;
	}

	this.getSelectMode = function() {
		return this._def.selectMode;
	}

	this.setType = function(type) {
		this._def.type = type;
	}

	this.getType = function() {
		return this._def.type;
	}

	this.setSelectMode = function(mode) {
		this._def.selectMode = mode;
	}

	this.getSelectMode = function() {
		return this._def.selectMode;
	}

	this.setUseGlobal = function(val) {
		this._def.useGlobal = val;
	}

	this.useGlobal = function() {
		return this._def.isGlobal;
	}

	this.setVisualizationType = function(type) {
		this._def.visualizationParameters.visualizationType = type;
	}

	this.getVisualizationType = function() {
		return this._def.visualizationParameters.visualizationType;
	}

	this.setVisualizationOptions = function(options) {
		this._def.visualizationParameters.options = options;
	}

	this.getVisualizationOptions = function() {
		return this._def.visualizationParameters.options;
	}


}		
window.wave.Step.prototype = Object.create(Object);
window.wave.Step.prototype.constructor = window.wave.Step;
window.wave.Step.prototype.name = null;
window.wave.Step.prototype._def = {
	datasets: [],
	isFacet: true,
	isGlobal: false,
	query: {
		query: null,
		version: -1
	},
	selectMode: 'single',
	type: 'aggregate',
	useGloba: true,
	visualizationParameters: {
		visualizationType: 'hbar'
	}
};



window.wave.App = function() {
	window.wave.Base.call();
	this.getDashboards = function(handler) {
		getDashboards({
			params: { folderId: this._def.id }
		}, handler);
	}
	this.getLenses = function(handler) {
		getLenses({
			params: { folderId: this._def.id }
		}, handler);
	}
	this.getDatasets = function(handler) {
		getDatasets({
			params: { folderId: this._def.id }
		}, handler);
	}
}		
window.wave.App.prototype = Object.create(window.wave.Base.prototype);
window.wave.App.prototype.constructor = window.wave.App;
window.wave.App.prototype.defaultImage = "/analytics/wave/web/proto/images/app/icons/16.png";
