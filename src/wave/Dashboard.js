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

