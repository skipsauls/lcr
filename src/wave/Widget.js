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