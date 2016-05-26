function clearList() {
    //document.getElementById('list').innerHTML = '';
}

function clearLog() {
    document.getElementById('log').innerHTML = '';
}

function clearDetails() {
    document.getElementById('details').innerHTML = '';
}

function log(str) {
    console.warn('log: ', str);
    return;
    if (str) {
        var item = document.createElement('li');
        item.innerHTML = str;
        document.getElementById('log').appendChild(item);
    }
}

function login() {
    //if (wave.isAuthenticated()) {
        log('Already authenticated');
        init();
    //} else {
    	console.warn('calling wave.login');
        wave.login(function(res, err) {
       		if (err) {
            	log(err);
            } else {
            	init();
            }
        });
    //}
}

function logout() {
    wave.logout(function() {
	    init();
	    //clear();
    });
}

function init() {
    if (wave.isAuthenticated()) {
    	initUser(function(res, err) {
    		if (err) {
    		} else {
		    	initTree();
    		}
    	});
    } else {
		//getDummies();
		$('#user-menu-item').hide();
		$('#login-menu-item').show();
    }
}

function initUser(handler) {
	wave.getUser(function(res, err) {
		if (err) {
			$('#login-menu-item').show();
		} else {
			$('#username').html(res.Name);
			$('#user-menu-item').show();
			$('#login-menu-item').hide();
			if (typeof handler === 'function') {
				handler(res, null);
			}
		}
	});
}

function initTree() {
	$("#treeview").treeview().empty();
	getApps();
	getDashboards();
	getLenses();
	getDatasets();
}

function refreshTree() {
	$("#treeview").treeview().empty();
	getApps();
	getDashboards();
	getLenses();
	getDatasets();
}

function addRow(label, items) {
    var tbody = document.getElementById('tbody');
    var row = document.createElement('tr');
    tbody.appendChild(row);
    var cell = null;
    cell = document.createElement('td');
    cell.innerHTML = label;
    row.appendChild(cell);
    for (var i = 0; i < items.length; i++) {
        cell = document.createElement('td');
        cell.innerHTML = items[i].label;
        row.appendChild(cell);
    }
}

function addList(label, items) {
    var container = document.getElementById("details");
    var list = document.createElement('ul');
    list.classList.add('list');
    var item = null;
    item = document.createElement('li');
    var title = document.createElement('h3');
    title.innerHTML = label;
    item.appendChild(title);
    list.appendChild(item);
    for (var i = 0; i < items.length; i++) {
        item = document.createElement('li');
        item.innerHTML = items[i].label;
        list.appendChild(item);
    }
    container.appendChild(list);
}

function formatJson(json) {        
    var formattedJson = null;
    if (typeof json === 'object') {
        formattedJson = JSON.stringify(json, undefined, 2);
    } else {
        formattedJson = JSON.stringify(JSON.parse(json), undefined, 2);
    }
    return formattedJson;
}

function showDataset(res) {
    clearDetails();
    var dataset = res;

    dataset.getPreview(function(preview, err) {
    	if (preview) {
		    document.getElementById('preview').src = preview;
    	}
    });

    myDataset = dataset;
    _currentSelection = {
    	obj: myDataset,
    	name: 'myApp',
    	type: 'app'
    };


    console.warn('Use the myDataset variable in the console to access the current selection: ', res);

    dataset.getVersions(function(res, err) {
        dataset.getVersion(res[0].id, function(res, err) {
            console.warn('version: ', res);
            version = res;
            console.warn('Use the version variable in the console to access the current selection: ', res);

            var json = formatJson(res);
            document.getElementById("code").innerText = json;

            dataset.getDimensions(function(res, err) {
                if (res) {
                    addList('Dimensions', res);
                }
            });
            dataset.getMeasures(function(res, err) {
                if (res) {
                    addList('Measures', res);
                }
            });
            dataset.getDates(function(res, err) {
                if (res) {
                    addList('Dates', res);
                }
            });
        });
    });
}

function showApp(res) {
    clearDetails();
    var app = res;

    app.getPreview(function(preview, err) {
    	if (preview) {
		    document.getElementById('preview').src = preview;
    	}
    });

    myApp = app;
    _currentSelection = {
    	obj: myApp,
    	name: 'myApp',
    	type: 'app'
    };

    console.warn('Use the myApp variable in the console to access the current selection: ', res);
}

var previewUrl = "https://wavepm.force.com/demo/embed2?id={{id}}";

function showDashboard(res) {
    clearDetails();

    $(".viewMsg").hide(0);

    var dashboard = res;

	dashboard.createComponent({
		locator: { id: 'dashboard' }
	},
	function(res, err) {
		if (err) {
	  		console.error('dashboard.createComponent error: ', err);
		} else {

		}
	});

    dashboard.getPreview(function(preview, err) {
    	if (preview) {
		    document.getElementById('preview').src = preview;
    	}
    });

/*
    $(".viewMsg").hide(0);
    $(".wave-embedded-frame").show(0);
    $(".wave-embedded-frame").attr("src", previewUrl.replace('{{id}}', dashboard.getId()));
    $(".wave-embedded-frame").on("error", function(e) {
    	console.warn("wave-embedded-frame.error: ", e);
    });

    // Simple error handling...
    var count = 0;
    var handler = $(".wave-embedded-frame").on("load", function(e) {
    	count++;
    	if (count === 3) {
		    $(".wave-embedded-frame").attr("src", "");
			$(".wave-embedded-frame").off("load", handler);
			alert('Please login to the community');
			// Add error message to instruct user to login to communities
    	}
    });


    dashboard.getPreview(function(preview, err) {
    	if (preview) {
		    document.getElementById('preview').src = preview;
    	}
    });

	//var waveFrame = document.getElementsByClassName("wave-embedded-frame")[0];
	//waveFrame.src = previewUrl.replace('{{id}}', dashboard.getId());

*/    

    myDashboard = dashboard;
    _currentSelection = {
    	obj: myDashboard,
    	name: 'myDashboard',
    	type: 'dashboard'
    };

    console.warn('Use the myDashboard variable in the console to access the current selection: ', res);
}

function showLens(res) {
    clearDetails();
    var lens = res;

    lens.getPreview(function(preview, err) {
    	if (preview) {
		    document.getElementById('preview').src = preview;
    	}
    });

    myLens = lens;
    _currentSelection = {
    	obj: myLens,
    	name: 'myLens',
    	type: 'lens'
    };


    console.warn('Use the myLens variable in the console to access the current selection: ', res);
}

function showTryIt(name, params) {
	console.warn('showTryIt: ', name, params);
	var tryit = $('#tryit');
	//$('#tryit #objName').html(_currentSelection.name);
	//$('#tryit #apiName').html(name);
	var paramArray = params instanceof Array ? params : params.split(',');
	$('#tryit #params').empty();
	var param = null;
	var row = null;
	var field = null;
	var label = null;
	for (var i = 0; i < paramArray.length; i++) {
		row = document.createElement('div');
		param = paramArray[i].trim();
		if (param.length > 0) {
			label = document.createElement('label');
			label.setAttribute('for', param);
			label.innerHTML = param;
			row.appendChild(label);
			if (param === 'handler' || param === 'callback') {
				field = document.createElement('textarea');
			} else {
				field = document.createElement('input');
			}
			field.setAttribute('id', param);
			field.setAttribute('type', 'text');
			field.setAttribute('placeholder', param);
			field.classList.add('field');
			row.appendChild(field);
			$('#tryit #params').append(row);
		}			
	}

}

function createLogItem(arg) {
	var s = null;
	console.warn(s, ' is type ', clas);
	if (typeof arg === 'function') {
		s = arg.toString() + ' ';
		s = s.replace('function', '<span>function</span>');
	} else if (typeof arg === 'object') {
		s = JSON.stringify(arg);
	} else {
		s = arg.toString();
	}
	s += ' ';
	var clas = typeof arg;
	var span = document.createElement('span');
	span.innerHTML = s;
	span.classList.add(clas);
	console.warn('returning span: ', span);
	return span;
}

function logit(type, args) {
	console.warn('logit: ', type, args, typeof args, args instanceof Array);
	var s = '';
	var span = null;
	var arg = null;
	var clas = null;
	var line = document.createElement("li");
	if (args.length) {
		for (var i = 0; i < args.length; i++) {
			if (args[i]) {
				span = createLogItem(args[i]);
				line.appendChild(span);
			}
		}
		$('#tryit #console ul').append(line);

	} else {
		span = createLogItem(args);
		line.appendChild(span);
		$('#tryit #console ul').append(line);

	}
/*	
		arg = args[i];
		s = s.toString() + ' ';
		clas = typeof arg;
		if (typeof arg === 'function') {
			s = s.replace('function', '<span>function</span>');
		} else {
		}
		span = document.createElement('span');
		span.innerHTML = s;
		span.classList.add(clas);
		//s += args[i].toString() + ' ';
		line.appendChild(span);
*/		
}

var _tryitConsole = {
	debug: function() {
		logit('debug', arguments);
		window.console.debug(arguments);
	},
	error: function() {
		logit('error', arguments);
		window.console.error(arguments);
	},
	info: function() {
		logit('info', arguments);
		window.console.info(arguments);
	},
	log: function() {
		logit('log', arguments);
		window.console.log(arguments);
	},
	warn: function() {
		logit('warn', arguments);
		window.console.warn(arguments);
	}
}

function execTryit() {
	console.warn('execTryit');
	var objName = $('#tryit #objName').html();
	var apiName = $('#tryit #api_select').val();
	console.warn('objName: ', objName);
	console.warn('apiName: ', apiName);
	var field = null;
	var value = null;
	var params = [];
	var self = this;
	$('#tryit #params .field').each(function(i, field)  {
		console.warn('field: ', field);
		var name = field.getAttribute('id');
		value = field.value;
		console.warn('name: ', name);
		console.warn('value: ', value);
		//value = value.replace(/\'/g, "\\'");
		//value = value.replace(/\"/g, "\\\"");
		value = value.replace(/console/g, '_tryitConsole');
		if (name === 'handler' || name === 'callback') {
			try {
 				eval('var cb = ' + value);
 				value = cb;
			} catch (e) {
				console.error('Error: ', e);				
			}
		}
		params.push(value);
	});
	console.warn('params: ', params);

	//var funcString = objName + '[\"' + apiName + '\"](' + params.toString() + ')';
	//console.warn('funcString: ', funcString);

	var funcString = '[\"' + apiName + '\"](' + params.toString() + ')';
	console.warn('funcString: ', funcString);

_params = params;
_apiName = apiName;

	try {
		var result = _currentSelection.obj[apiName].apply(_currentSelection.obj, params);
		var pstring = params.toString();
		pstring.replace(/_tryitConsole/g, 'console');
		_tryitConsole.log(_currentSelection.name + '.' + apiName + '(' + pstring + ')');

		if (result) {
			_tryitConsole.log(result);
		}
		refresh();
	} catch (e) {
		console.error('Error: ', e);
	}
}


function REMOVE___showApi(asset) {
	$('#api').empty();
	var api = {};
	var s = null;
	var params = null;
	var list = document.createElement('ul');
	list.classList.add('api');
	var label = null;
	var item = null;

	item = document.createElement('li');
	
	label = document.createElement('span');
	label.classList.add('name', 'heading');
	label.innerHTML = 'Function';
	item.appendChild(label);
	
	label = document.createElement('span');
	label.classList.add('params', 'heading');
	label.innerHTML = 'Parameters';
	item.appendChild(label);

	list.appendChild(item);

	for (var k in asset) {
		if (k !== 'constructor' && typeof asset[k] === 'function') {
			s = asset[k].toString();
			//s = s.match(/(?:(?!%).)*/)[0];
			s = s.match(/(?:(?!{).)*/)[0];
			s = s.replace(/function \(/g, '');
			s = s.replace(/\)/g, '');
			params = s.split(',');
			api[k] = {
				name: k,
				params: params,
				func: asset[k]
			}

			item = document.createElement('li');
			
			label = document.createElement('span');
			label.classList.add('name');
			label.innerHTML = k;
			item.appendChild(label);
			
			label = document.createElement('span');
			label.classList.add('params');
			label.innerHTML = params;
			item.appendChild(label);

			item.dataset.apiName = k;
			item.dataset.params = params;

			$(item).click(function(evt) {
				console.warn('item clicked: ', evt);
				var target = evt.currentTarget;
				console.warn('target: ', target);
				var apiName = target.dataset.apiName;
				var params = target.dataset.params;
				console.warn('apiName: ', apiName, ', params: ', params);
				showTryIt(apiName, params);
			});

			list.appendChild(item);
		}
	}
	console.warn('api: ', api);
	$('#api').append(list);
}

function showApi(asset) {
	var select = $('#api_select');
	$(select).empty();
	$(select).change(function() {
		var val = $(this).val();
		console.warn(val + ' selected');
		var api = $(select).data('api');
		console.warn('api: ', api);
		var sel = api[val];
		console.warn('sel: ', sel);
		showTryIt(sel.name, sel.params);
	});

	var api = {};
	var s = null;
	var params = null;
	var option = null;

	option = $('<option>');
	$(option).text('Please select an API');
	$(option).text('');
	//$(option).attr('disabled', 'disabled');
	$(select).append(option);

	for (var k in asset) {
		if (k !== 'constructor' && typeof asset[k] === 'function') {
			s = asset[k].toString();
			//s = s.match(/(?:(?!%).)*/)[0];
			s = s.match(/(?:(?!{).)*/)[0];
			s = s.replace(/function \(/g, '');
			s = s.replace(/\)/g, '');
			params = s.split(',');
			api[k] = {
				name: k,
				params: params,
				func: asset[k]
			}

			option = $('<option>');
			$(option).text(k);

			$(select).append(option);
		}
	}

	$(select).data('api', api);
}

function showDetails(type, item) {
	console.warn('showDetails: ', type, item);
	if (type !== 'dashboard') {
	    $(".wave-embedded-frame").hide(0);
	    $(".viewMsg").show(0);
	}

    var json = formatJson(item.getDef());
    document.getElementById("code").innerText = json;

    if (type === 'app') {
        showApp(item);
    } else if (type === 'dataset') {
        showDataset(item);
    } else if (type === 'dashboard') {
        showDashboard(item);
    } else if (type === 'lens') {
        showLens(item);
    }

	$('#tryit #objName').html(item._def.label);
	$('#tryit #varName').html(_currentSelection.name);
	$('#tryit #params').empty();
	$('#tryit #api_select').empty();

    showApi(item);
}

var lastSelection = null;

function selectAsset(type, id) {
	var func = type;
	func = 'get' + func.substring(0,1).toUpperCase() + func.substring(1);
	lastSelection = {
		type: type,
		id: id
	};
	try {
    	wave[func]({id: id}, function(res, err) {
        	showDetails(type, res);
    	});
	} catch (e) {

	}
}

function refresh() {
	if (_currentSelection) {
	    var json = formatJson(_currentSelection.obj.getDef());
    	document.getElementById("code").innerText = json;
	}
}

singularNameMap = {
    'dummies': 'dummy',
    'apps': 'app',
    'dashboards': 'dashboard',
    'datasets': 'dataset',
    'lenses': 'lens'
};

pluralNameMap = {
    'dummy': 'dummies',
    'app': 'apps',
    'dashboard': 'dashboards',
    'dataset': 'datasets',
    'lens': 'lenses'
};

treeOrder = {
	'apps': 0,
	'apps': 1,
	'dashboards': 2,
	'lenses': 3,
	'datasets': 4
};

treeData = [
/*
	{
		id: 'dummies',
		text: 'Dummies',
		nodes: []
	},
*/
	{
		id: 'apps',
		text: 'Apps',
		nodes: []
	},
	{
		id: 'dashboards',
		text: 'Dashboards',
		nodes: []
	},
	{
		id: 'lenses',
		text: 'Lenses',
		nodes: []
	},
	{
		id: 'datasets',
		text: 'Datasets',
		nodes: []
	}
];

function displayResults(type, res, err) {
    if (err) {
        log(err);
        console.warn('displayResults error: ', err);
    } else if (res) {            
        clearList();

        var resultsNode = null;

        for (var i = 0; i < treeData.length; i++) {
        	if (treeData[i].id === type) {
        		resultsNode = treeData[i];
        		break;
        	}
        }

        if (resultsNode === null) {
	     	resultsNode = {
	        	id: type,
	    		text: type.substring(0, 1).toUpperCase() + type.substring(1),
	    		nodes: []
	        };
	       	treeData.push(resultsNode);
	  	} else {
	  		resultsNode.nodes = [];
	  	}

        var stype = singularNameMap[type];
        for (var i = 0; i < res.length; i++) {
            asset = res[i];
           	resultsNode.nodes.push({
           		text: asset.getLabel(),
           		assetId: asset.getId(),
           		assetType: stype,
           		asset: asset
           	});
        }

        $('#treeview').treeview({data: treeData});
        $('#treeview').on('nodeSelected', function(event, data) {
  			//console.warn('nodeSelected: ', event, data);
  			if (data.assetType) {
			    selectAsset(data.assetType, data.assetId);
			    /*
			    var func = data.assetType;
			    func = 'get' + func.substring(0,1).toUpperCase() + func.substring(1);
			   	try {
				    wave[func]({id: data.assetId}, function(res, err) {
				        showDetails(data.assetType, res);
				    });
			   	} catch (e) {}
			   	*/
  			}
		});

    }
}

function getDummies() {
    wave.getDummies(null, function(res, err) { displayResults('dummies', res, err); });
}

function getApps() {
    wave.getApps(null, function(res, err) { displayResults('apps', res, err); });
}

function getDashboards() {
    wave.getDashboards(null, function(res, err) { displayResults('dashboards', res, err); });
}

function getLenses() {
    wave.getLenses(null, function(res, err) { displayResults('lenses', res, err); });
}

function getDatasets() {
    wave.getDatasets(null, function(res, err) { displayResults('datasets', res, err); });
}
