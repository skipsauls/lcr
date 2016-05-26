console.warn('bridge.js');

function setup() {
    window.addEventListener("message", messageHandler, false);
    window.parent.postMessage({"type": "ready"}, "*");

    function messageHandler(event) {
        var data = event.data;
        var type = data.type;
        //console.warn('event: ', event);
        //console.warn('data: ', data);
        if (data.type === 'function_call') {
        	var name = data.name;
        	var params = data.params;
        	//console.warn('calling function: ', name, ' with ', params);
        	window[name](params, function(res, err) {
        		console.warn('---------------> ', res, err);
        		var ret = {
        			type: 'function_result',
        			data: {
        				uid: data.uid,
        				name: data.name,
        				params: data.params,
        				result: res,
        				error: err
        			}
        		}
			    window.parent.postMessage(ret, "*");
        	});
        } else if (data.type === 'function_call') {
        	var name = data.name;
        	var params = data.params;
        	//console.warn('function: ', name, ' returned ', params);

		}
    }	
}

function getView() {
	var waveFrame = document.getElementsByClassName("waveFrame")[0];
	var frame = waveFrame.contentDocument.getElementById("explore");
	var view = frame.contentWindow.edgeChrome.tabManager.getSelectedView();
	var rc = view.getReactComponent();	
	return view;
}

function getReactComponent() {
	var waveFrame = document.getElementsByClassName("waveFrame")[0];
	var frame = waveFrame.contentDocument.getElementById("explore");
	var view = frame.contentWindow.edgeChrome.tabManager.getSelectedView();
	var rc = view.getReactComponent();	
	return rc;
}

function getWidgets() {
	var rc = getReactComponent();
	console.warn('rc: ', rc);
	var widgets = {};
	rc.state.model._widgets.each(function(w) {
		widgets[w.getUID()] = w;
	});
	return widgets;
}

function getWidget(obj, handler) {
	var name = typeof obj === 'string' ? obj : obj.name;
	var res = undefined;
	var err = undefined;
	try {
		var widgets = getWidgets();
		res = widgets[name];
	} catch (e) {
		err = e;
	}
	if (typeof handler === "function") {
		handler(res, err);
	}
 	return res || err;
}

function getChartTypes(params, handler) {
	var res = undefined;
	var err = undefined;
	try {
		var widget = getWidget(params.name);
		res = widget.attributes.properties.chartType.choices;
		res = res.sort();
	} catch (e) {
		err = e;
	}
	if (typeof handler === "function") {
		handler(res, err);
	}
 	return res || err;
}

function getChartType(params, handler) {
	var res = undefined;
	var err = undefined;
	try {
		var widget = getWidget(params);
		res = widget.attributes.properties.chartType.value;
	} catch (e) {
		err = e;
	}
	if (typeof handler === "function") {
		handler(res, err);
	}
 	return res || err;
}

function setChartType(params, handler) {
	//var widget = getWidget(params);
	//widget.attributes.properties.chartType.value = params.type;
	//widget._triggerPropsChange();

	var res = undefined;
	var err = undefined;
	try {
		var widget = getWidget(params);
		widget.attributes.properties.chartType.value = params.type;
		widget._triggerPropsChange();
		res = params.type;
	} catch (e) {
		err = e;
	}
	if (typeof handler === "function") {
		handler(res, err);
	}
 	return res || err;
}

setup();
