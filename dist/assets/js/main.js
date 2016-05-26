console.warn('bar.js');

console.warn('foo');

var Base = function () {
	}

	Base.prototype.defaultImage = "/analytics/wave/web/proto/images/thumbs/thumb-dashboard.png";

	Base.prototype.init = function(def, handler) {
		this._def = def;
		this._typeMap = {
			'folder': 'app'
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

	Base.prototype.getType = function() {
		return this._typeMap[this._def.type] || this._def.type;
	}

	Base.prototype.getName = function() {
		return this._def.name;
	}

	Base.prototype.getLabel = function() {
		return this._def.label;
	}

	Base.prototype.setLabel = function(label) {
		this._def.label = label;
		updateAsset(this._def, 'label', function(res, err) {
			console.warn('updateAsset returned: ', res, err);
		});
	}

	Base.prototype.getPreview = function(handler) {
		if (this._def.imageData) {
			if (typeof handler === 'function') {
				handler(this._def.imageData.length ? this._def.imageData[0] : this._def.imageData, null)
			}
		} else {
			//return force.oauth.instance_url + this.defaultImage;

			var self = this;
			var t1 = window.performance.now();
			getImages(this._def, function(imageData) {
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

window.wave = window.wave || (function () {

    "use strict";

    // Note that we should restrict min version to 36.0 for SDK
    var apiVersion = 'v36.0';
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
		    	if (typeof successHandler === "function") {

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
		    	if (typeof errorHandler === "function") {
		    		errorHandler(null, err);
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
		                            var blob = new Blob([xhr.response], {type: 'image/png'});
		                            var reader = new FileReader();
		                            reader.id = item.id;
		                            reader.onload = function(e) {
		                                var returnedURL = e.target.result;
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
        getUser: getUser
/*        ,
        getDummies: getDummies,
        getDummy: getDummy,
        getApps: getApps,
        getApp: getApp,
        getDashboards: getDashboards,
        getDashboard: getDashboard,
        getLenses: getLenses,
        getLens: getLens,
        getDatasets: getDatasets,
        getDataset: getDataset,

        Dummy: Dummy,
        App: App,
        Dashboard: Dashboard,
        Lens: Lens,
        Dataset: Dataset
*/        
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