var express = require('express');
var https = require('https');
var http = require('http');
var request = require('request');
//var oauth = require('./oauth.js');
//var rest = require('./rest.js');
var rest = require('restler');
var fs = require('fs');
var os = require('os');
var argv = require('minimist')(process.argv.slice(2));
var env = require('node-env-file');
var debug = argv.d || argv.debug || process.env.DEBUG || false;
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var Datauri = require('datauri');

var wave = require('./public/javascripts/test.js');

//var ClientOAuth2 = require('client-oauth2');

// Load environment variables for localhost
try {
    env(__dirname + '/.env');
} catch (e) {
    console.error('Exception: ', e);
}

var app = express();

var port = process.env.PORT || 3000;
var https_port = process.env.HTTPS_PORT || parseInt(port) + 1;

var cid = process.env.APPID || "YOUR-REMOTE-ACCESS-CONSUMER-KEY";
var csecr = process.env.APPSECRET || "YOUR-REMOTE-ACCESS-CONSUMER-SECRET";
var tokenUri = process.env.TOKEN_URI || "https://login.salesforce.com";
var authUri = process.env.AUTH_URI || "https://login.salesforce.com";
var redir = process.env.REDIRECT_URI || "https://localhost:" + https_port + "/token";

var apiVersion = 'v37.0';

console.warn('cid: ', cid);
console.warn('csecr: ', csecr);
console.warn('tokenUri: ', tokenUri);
console.warn('authUri: ', authUri);
console.warn('redir: ', redir);


//app.set('view engine', 'jade');
app.set('view engine', 'ejs');

app.set('views', './views');

app.use(express.static(__dirname + '/public'));

var jsonParser = bodyParser.json();

app.use(cookieParser('waveiscool'));

/*
app.use(session({
    secret:'waveiscool',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));
*/

app.use(session({ secret: 'waveiscool'}));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(jsonParser);


function login(req, res, next) {

    req.session.foo = 'bar';
    req.session.save();

    var config = {
      client_id: cid,
      client_secret: csecr,
      grant_type: 'password',
      username: 'skip@wavepm.com',
      password: 'ltngout1!' + 'rbYmLqdaK9ZYQSclKUKWMUrCf'
    };

    rest.post('https://login.salesforce.com/services/oauth2/token', {data: config}).on('complete', function(data, response) {
        if (response.statusCode === 200) {
            req.session.oauth = data;
        }
        next(data, response);
    });
}

app.get('/login', function(req, res) {
    login(req, res, function(data, response) {
        if (response.statusCode === 200) {
            res.send({msg: 'Successful login'});
        } else {
            console.warn('Unable to login');
            res.send({error: 'Unable to login'});
        }
    });
});

app.post('/token', function(req, res) {
    console.warn('/token');
});

function _getAssets(req, res, type, userOpts, next) {
    var oauth = req.session.oauth;

    var url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type;


    var options = {
        headers: {
            "Accept": "application/json",
            "Authorization": oauth.token_type + " " + oauth.access_token
        }

    };

    rest.get(url, options).on('complete', function(result, response) {
        if (typeof next === "function") {
            next(result, response);
        } else {
            if (response.statusCode === 200) {
                res.send(result);
            } else {
                res.send({error: 'Error getting lenses'});
            }
        }
    });
}

function getAssets(req, res, type, next) {
    var opts = null; // Get these as query params?
    var oauth = req.session.oauth;

    if (typeof oauth === "undefined" || oauth === null) {
        login(req, res, function(data, response) {
            if (response.statusCode === 200) {
                _getAssets(req, res, type, opts, next);
            }
        });
    } else {
        _getAssets(req, res, type, opts, next);
    }
}

function _getAsset(req, res, type, options, next) {
    var oauth = req.session.oauth;

    var url = null;

    if (options.id) {
        url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type + "/" + options.id;
        console.warn('url: ', url);
        var opts = {
            headers: {
                "Accept": "application/json",
                "Authorization": oauth.token_type + " " + oauth.access_token
            }

        };

        rest.get(url, opts).on('complete', function(result, response) {
            next(result, response);
        });
    } else if (options.name) {
        url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type + "?q=" + options.name;
        console.warn('url: ', url);
        var opts = {
            headers: {
                "Accept": "application/json",
                "Authorization": oauth.token_type + " " + oauth.access_token
            }

        };

        rest.get(url, opts).on('complete', function(result, response) {
            if (result && result[type] && result[type].length > 0) {
                url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type + "/" + result[type][0].id;
                rest.get(url, opts).on('complete', function(result, response) {
                    next(result, response);
                });
            } else {
                next(null, response);
            }
        });

    }


    

}

function getAsset(req, res, type, options, next) {
    var oauth = req.session.oauth;

    if (typeof oauth === "undefined" || oauth === null) {
        login(req, res, function(data, response) {
            if (response.statusCode === 200) {
                _getAsset(req, res, type, options, next);
            }
        });
    } else {
        _getAsset(req, res, type, options, next);
    }
}


// Remove the specific versions!
function _listDashboards(req, res, next) {
    var oauth = req.session.oauth;

    var type = 'dashboards';

    var url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type;

    var options = {
        headers: {
            "Accept": "application/json",
            "Authorization": oauth.token_type + " " + oauth.access_token
        }

    };

    rest.get(url, options).on('complete', function(result, response) {
        next(result, response);
    });

    

}

function listDashboards(req, res, next) {
    var oauth = req.session.oauth;

    if (typeof oauth === "undefined" || oauth === null) {
        login(req, res, function(data, response) {
            if (response.statusCode === 200) {
                _listDashboards(req, res, next);
            }
        });
    } else {
        _listDashboards(req, res, next);
    }
}

function _getDashboard(req, res, options, next) {
    var oauth = req.session.oauth;

    var apiVersion = 'v37.0';
    var type = 'dashboards';
    var url = null;

    if (options.id) {
        url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type + "/" + options.id;
        console.warn('url: ', url);
        var opts = {
            headers: {
                "Accept": "application/json",
                "Authorization": oauth.token_type + " " + oauth.access_token
            }

        };

        rest.get(url, opts).on('complete', function(result, response) {
            next(result, response);
        });
    } else if (options.name) {
        url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type + "?q=" + options.name;
        console.warn('url: ', url);
        var opts = {
            headers: {
                "Accept": "application/json",
                "Authorization": oauth.token_type + " " + oauth.access_token
            }

        };

        rest.get(url, opts).on('complete', function(result, response) {
            if (result && result.dashboards && result.dashboards.length > 0) {
                url = oauth.instance_url + '/services/data/' + apiVersion + '/wave/' + type + "/" + result.dashboards[0].id;
                console.warn('url: ', url);
                rest.get(url, opts).on('complete', function(result, response) {
                    next(result, response);
                });
            } else {
                next(null, response);
            }
        });

    }


    

}

function getDashboard(req, res, options, next) {
    var oauth = req.session.oauth;

    if (typeof oauth === "undefined" || oauth === null) {
        login(req, res, function(data, response) {
            if (response.statusCode === 200) {
                _getDashboard(req, res, options, next);
            }
        });
    } else {
        _getDashboard(req, res, options, next);
    }
}

app.get('/wave/apps', function(req, res) { getAssets(req, res, 'folders'); });
app.get('/wave/folders', function(req, res) { getAssets(req, res, 'folders'); });
app.get('/wave/dashboards', function(req, res) { getAssets(req, res, 'dashboards'); } );
app.get('/wave/datasets', function(req, res) { getAssets(req, res, 'datasets'); });
app.get('/wave/lenses', function(req, res) { getAssets(req, res, 'lenses'); });

/*
app.get('/wave/dashboards', function(req, res) {
    getAssets(req, res, 'dashboards', null, function(result, response) {
        if (response.statusCode === 200) {
            res.send(result);
        } else {
            res.send({error: 'Error getting dashboards'});
        }
    });
    return;

    listDashboards(req, res, function(result, response) {
        if (response.statusCode === 200) {
            res.send(result);
        } else {
            res.send({error: 'Error getting dashboards'});
        }
    });
});
*/
app.get('/wave/dashboards/:id', function(req, res) {
    var id = req.params.id;
    getDashboard(req, res, {id: id}, function(result, response) {
        if (response.statusCode === 200) {
            res.send(result);
        } else {
            res.send({error: 'Error getting dashboards'});
        }
    });
});

/*
app.get('/wave/lenses', function(req, res) {
    getAssets(req, res, 'lenses', null, function(result, response) {
        if (response.statusCode === 200) {
            res.send(result);
        } else {
            res.send({error: 'Error getting lenses'});
        }
    });
});
*/

/*
 * FINISH THIS!!!
 */
app.post('/wave/query', function(req, res) {
    var id = req.params.id;
    getDashboard(req, res, {id: id}, function(result, response) {
        if (response.statusCode === 200) {
            res.send(result);
        } else {
            res.send({error: 'Error getting dashboard'});
        }
    });
});

app.get('/', function(req, res) {
    res.render('pages/index', {title: 'Wave SDK POC', appId: process.env.APPID});
});

app.get('/widgetTest', function(req, res) {
    res.render('pages/widgetTest', {title: 'Wave SDK Widget Test', appId: process.env.APPID});
});

app.get('/test', function(req, res) {
    res.render('pages/test', {title: 'Wave SDK Test', appId: process.env.APPID});
});

app.get('/test2', function(req, res) {
    res.render('pages/test2', {title: 'Wave SDK Test 2', appId: process.env.APPID});
});

app.get('/slack', function(req, res) {
    console.warn('GET /slack called!');
    res.render('pages/slack', {title: 'Wave SDK - Slack', appId: process.env.APPID});
});


var _imageData = {};

/*
 * Get the thumnail for an asset
 * Use the next callback to get the buffer, otherwise leave it out for async loading
 */
function _getImages(req, res, item, next) {
    var oauth = req.session.oauth;

    if (item) {

        if (item.files && item.files.length > 0) {
            var count = 0;
            for (var j = 0; j < item.files.length; j++) {
                (function(file) {
                    if (file.fileName === "assetPreviewThumb" && file.contentType === "image/png") {
                        var self = this;

                        var options = {
                            headers: {
                                "Accept": "image/png",
                                "Authorization": oauth.token_type + " " + oauth.access_token
                            },
                            decoding: 'binary'

                        };

                        var url = oauth.instance_url + file.url;

                        opts = options;
                        opts.url = url;

                        rest.get(url, options).on('complete', function(result, response) {

                            var buffer = new Buffer(result, 'binary');
                            _imageData[item.id] = buffer;

                            if (typeof next === 'function') {
                                next(buffer);
                            }
                        });

                    }
                })(item.files[j]);         
                        
            }
        } else {
            if (typeof next === 'function') {
                next(null);
            }
        }
    }
}

function getImages(req, res, item, next) {

    var oauth = req.session.oauth;

    if (typeof oauth === "undefined" || oauth === null) {
        login(req, res, function(data, response) {
            if (response.statusCode === 200) {
                _getImages(req, res, item, next);
            }
        });
    } else {
        _getImages(req, res, item, next);
    }
}

var pluralMap = {
    'app': 'apps',
    'dashboard': 'dashboards',
    'dataset': 'datasets',
    'folder': 'folders',
    'lens': 'lenses',
    'query': 'queries'
};

var singularMap = {
    'apps': 'app',
    'dashboards': 'dashboard',
    'datasets': 'dataset',
    'folders': 'folders',
    'lenses': 'lens',
    'queries': 'query'
};

function isPlural(type) {
    return singularMap[type] ? true : false;
}

function createFullAttachment(type, item) {

    var capTitle = singularMap[type] || 'nomatch';
    capTitle = capTitle.substring(0,1).toUpperCase() + capTitle.substring(1);
    var attachment = {
        fallback: 'The ' + item.label + ' ' + capTitle + '.',
        title: item.label,
        title_link: item.assetSharingUrl,
        //thumb_url: "https://wave-sdk.herokuapp.com/wave/thumb/" + type + "/" + item.id,
        image_url: "https://wave-sdk.herokuapp.com/wave/thumb/" + type + "/" + item.id,
        color: '#2EC2BA', // One of the Wave colors
        pretext: '_Powered by the Wave SDK_',
        text: item.description || '', //'Open the <' + item.assetSharingUrl + '|'+ item.label + ' Dashboard>.\n',
        author_name: item.createdBy.name,
        author_link: 'https://wavepm.my.salesforce.com/_ui/core/userprofile/UserProfilePage?u=' + item.createdBy.id,
        author_icon: item.createdBy.profilePhotoUrl,                                            
        fields: [
            {
                "title": "App",
                "value": item.folder ? item.folder.label : item.label,
                "short": true
            },
            {
                "title": "ID",
                "value": item.id,
                "short": true
            }

        ],                                            
        mrkdwn_in: ["text", "pretext"]
    };

    return attachment;
}

function createSimpleAttachment(type, item) {

    var capTitle = singularMap[type] || 'nomatch';
    capTitle = capTitle.substring(0,1).toUpperCase() + capTitle.substring(1);

    var attachment = {
        fallback: 'The ' + item.label + ' ' + capTitle + '.',
        title: item.label,
        title_link: item.assetSharingUrl,
    };

    return attachment;
}


function sendFullAttachments(req, res, type, items) {
    var attachments = [];

    var plural = items.length > 1;
    var capTitle = plural ? type : singularMap[type]; // || 'nomatch';
    capTitle = capTitle.substring(0,1).toUpperCase() + capTitle.substring(1);
    capTitle = '*Salesforce Wave ' + capTitle + '*';

    for (var i = 0; i < items.length; i++) {
        getImages(req, res, items[i]);
        attachments.push(createFullAttachment(type, items[i]));
    }

    res.json({
        attachments: attachments,
        text: capTitle,
        mrkdwn_in: ["text", "pretext"]
    });
}

function sendSimpleAttachments(req, res, type, items) {
    var attachments = [];

    var plural = items.length > 1;
    var capTitle = plural ? type : singularMap[type]; // || 'nomatch';
    capTitle = capTitle.substring(0,1).toUpperCase() + capTitle.substring(1);
    capTitle = '*Salesforce Wave ' + capTitle + '*';

    //var capTitle = singularMap[type] || 'nomatch';
    //capTitle = capTitle.substring(0,1).toUpperCase() + capTitle.substring(1);

    for (var i = 0; i < items.length; i++) {
        getImages(req, res, items[i]);
        attachments.push(createSimpleAttachment(type, items[i]));
    }

    res.json({
        attachments: attachments,
        text: capTitle,
        mrkdwn_in: ["text", "pretext"]
    });
}

function sendError(req, res, text) {
    res.json({text: text + ' \nTry \'wave help\''});
}

var _shortcuts = {
    'showapp': { action: 'show', type: 'app' },
    'showdash': { action: 'show', type: 'dashboard' },
    'showdataset': { action: 'show', type: 'dataset' },
    'showfolder': { action: 'show', type: 'folder' },
    'showlens': { action: 'show', type: 'lens' },
    'apps': { action: 'list', type: 'folders' },
    'dashboards': { action: 'list', type: 'dashboards' },
    'datasets': { action: 'list', type: 'datasets' },
    'folders': { action: 'list', type: 'folders' },
    'lenses': { action: 'list', type: 'lenses' },
}

function getShortcut(action) {
    return _shortcuts[action];
}

var _waveAssetPrefixes = {
    'apps': '00lB',
    'dashboards': '0FKB',
    'datasets': '0FbB',
    'lenses': '0FKB'
}

function sendHelp(req, res) {
    var help = '\n';
    help += 'Welcome to *Salesforce Wave Analytics*!\nHere are a few commands to try:\n\n';
    help += '*wave _apps/datasets/dashboards/folders/lenses_*\n     List of the selected asset\n';
    help += '*wave list _apps/datasets/dashboards/folders/lenses_*\n     List of the selected asset\n';
    help += '*wave show _apps/datasets/dashboards/folders/lenses_*\n     Detailed list of the selected asset\n';
    help += '*wave showapp/showdash/showlens/showdataset XXXXX*\n     Show asset with ID XXXXX\n';
    help += '*wave showapp/showdash/showlens/showdataset Test*\n     Show asset matching \'Test\'\n';
    help += '*wave show _app/dataset/dashboard/folder/lens XXXXX*\n     Show the asset with ID XXXXX\n';
    help += '*wave show _app/dataset/dashboard/folder/lens Test*\n     Show the asset matching \'Test\'\n';
    help += '\n_Powered by the Wave SDK_';

    res.json({
        text: '*Salesforce Wave Help*\n' + help,
        username: 'wavebot',
        mrkdwn_in: ["text", "pretext"],
        parse: 'none'
    });
}

app.post('/slack', function(req, res) {

    var slackReq = req.body; //JSON.parse(req.body);
    var text = slackReq.text.trim();
    console.warn('/slack text: ', text);

    var errText = 'Sorry, didn\'t understand that!';

    var test = {
        "text": errText
    };


    var tokens = text.split(' ');

    // Dumb parsing!

    var tokens = text.split(' ');
    var ltext = text.toLowerCase();
    var ltokens = text.split(' ');

    // Ignore the leading 'wave' if present
    if (tokens[0].match(/^wave$/i)) {
        tokens.shift(1);
        ltokens.shift(1);
    }

    var action = ltokens[0];

    if (action === 'help') {
        sendHelp(req, res);
        return;
    }



    var shortcut = getShortcut(action);
    var type = null;
   
    var offset = 1;

    if (shortcut) {
        action = shortcut.action;
        type = shortcut.type;
    } else {
        type = ltokens[1];
        offset = 2;
    }

    var args = tokens.slice(offset, tokens.length);
    var largs = ltokens.slice(offset, ltokens.length);
    type = type === 'apps' ? 'folders' : type;
    var plural = isPlural(type);

/*
    var type = ltokens[1];
    type = type === 'apps' ? 'folders' : type;
    var largs = ltokens.slice(2, ltokens.length);
    var plural = isPlural(type);
*/

    console.warn('action: ', action);    
    console.warn('type: ', type);
    console.warn('args: ', args);
    console.warn('largs: ', largs);
    console.warn('plural: ', plural);

    if (action === 'show') {
        if (plural) {
            getAssets(req, res, type, function(result, response) {
                if (response.statusCode === 200) {
                    var items = result[type];

                    var item = null;
                    for (var i = 0; i < items.length; i++) {
                        item = items[i];

                        //Do not use with callback as this is async
                        getImages(req, res, item);
                    }

                    sendFullAttachments(req, res, type, items);
                } else {
                    sendError(req, res, 'Sorry, couldn\'t find that');
                }
            });
        } else {
            type = isPlural(type) ? type : pluralMap[type];

            var value = args.join(' ').trim();
            var options = null;
            console.warn('value: ', value);
            var prefix = _waveAssetPrefixes[type];
            console.warn('prefix: ', prefix);
            var regex = new RegExp('\b' + prefix, 'gi')
            if (value.match(regex)) {
                options = {id: value};
            } else {
                options = {name: value};
            }

            console.warn('options: ', options);
            getAsset(req, res, type, options, function(result, response) {
                if (response.statusCode === 200 && result) {
                    getImages(req, res, result);
                    var items = [result];
                    sendFullAttachments(req, res, type, items);
                } else {
                    sendError(req, res, 'Sorry, couldn\'t find that');
                }
            });
        }
    } else if (action === 'list' && plural) {
        getAssets(req, res, type, function(result, response) {
            if (response.statusCode === 200) {
                var items = result[type];
                var item = null;
                for (var i = 0; i < items.length; i++) {
                    item = items[i];

                    //Do not use with callback as this is async
                    getImages(req, res, item);
                }

                sendSimpleAttachments(req, res, type, items);
            } else {
                sendError(req, res, 'Sorry, couldn\'t find that');
            }
        });

    } else {
        sendError(req, res, errText);
    }

    return;

  
/*    
    var subject = null;

    if (ltokens[0].match(/^show$/i)) {
        action = 'get';
    } else if (ltokens[0].match(/^list$/i) {

    });

    if (tokens[1].match(/^dashboard$/i)) {
        subject = 'dashboard';
    } else if (tokens[1].match(/^dashboards$/i)) {
        subject = 'dashboards';
    } else if (tokens[1].match(/^lenses$/i)) {
        subject = 'lenses';
    }
    

    return;

    if (text.indexOf('show') >= 0) {
        if (text.indexOf('dashboards') >= 0)
    } else if (text.indexOf('list') >= 0) {

    }
*/

    if (text.toLowerCase().indexOf('show dashboards') >= 0 || text.toLowerCase().indexOf('list dashboards') >= 0) {
        var action = text.toLowerCase().indexOf('show') >= 0 ? 'show' : "list";
        console.warn('action: ', action);
        listDashboards(req, res, function(result, response) {
            if (response.statusCode === 200) {
                var dashboards = result.dashboards;
                var dashboard = null;
                var attachments = [];
                var attachment = null;
                for (var i = 0; i < dashboards.length; i++) {
                    dashboard = dashboards[i];

                    // Do not use with callback as this is async
                    getImages(req, res, dashboard);

                    attachment = action === "show" ? createFullDashboardAttachment(dashboard) : createPartialDashboardAttachment(dashboard);
                    attachments.push(attachment);
                }
                res.json({
                    text: '*List of Wave Dashboards*\n_Powered by the Wave SDK_',
                    attachments: attachments,
                    mrkdwn_in: ["text", "pretext"]
                });

            } else {
                res.json({text: 'Error getting dashboards'});
            }
        });

    } else if (text.toLowerCase().indexOf('show dashboard') >= 0) {
        try {
            var value = text.match(/show dashboard(.*)/)[1];
            value = value.trim();
            console.warn('value: ', value);
            var optsions = null;
            if (value.match(/\b0FKB/gi)) {
                console.warn('value is a dashboard id');
                options = {id: value};
            } else {
                console.warn('value is a dashboard name');
                options = {name: value};
            }
            if (options !== null) {
                getDashboard(req, res, options, function(result, response) {
                    console.warn('getDashboard returned: ', result);
                    if (response.statusCode === 200 && result) {
                        var attachments = [createFullDashboardAttachment(result)];
                        res.json({
                            text: '*Wave Dashboard*\n_Powered by the Wave SDK_',
                            attachments: attachments,
                            mrkdwn_in: ["text", "pretext"]
                        });
                    } else {
                        res.json({text: 'Dashboard \'' + value + '\' not found'});
                    }
                });
            }
        } catch (e) {
            console.error('Exception: ', e);
        }

    } else if (text.indexOf('login') >= 0) {
        login(req, res, function(data, response) {
            if (response.statusCode === 200) {
                //res.end();
                test.attachments[0].text = 'Successfully logged in';
            } else {
                console.warn('Unable to login');
                //res.send({error: 'Unable to login'});
                test.attachments[0].text = 'Unable to login';
            }

            res.json(test);

        });
    } else {
        // Do nothing!!!!!!!!!!!!!!!!!
        //res.json(test);
    }
});

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

function _sendImage(req, res, type, data) {
    var oauth = req.session.oauth;
    if (typeof data == 'undefined' || data === null) {
        var url = oauth.instance_url + '/analytics/wave/web/proto/images/app/icons/16.png';        
        //res.writeHead(200, {'Content-Type': 'image/png'});
        //res.send(url);
        req.pipe(request(url)).pipe(res);
    } else {
        var imgData = data.toString('base64');

        var img = new Buffer(imgData, 'base64');

        res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': img.length});
        res.end(img, 'binary');
    }
}

function sendImage(req, res, type, data) {
    var oauth = req.session.oauth;

    if (typeof oauth === "undefined" || oauth === null) {
        login(req, res, function(result, response) {
            if (response.statusCode === 200) {
                _sendImage(req, res, type, data);
            }
        });
    } else {
        _sendImage(req, res, type, data);
    }
}

app.get('/wave/thumb/:type/:id', function(req, res) {
    var id = req.params.id;
    var type = req.params.type;
    type = type === 'apps' ? 'folders' : type;

    var data = _imageData[type + '_' + id];

    console.warn('get thumb: ', type, id);

    if (!data) {
        var options = {id: id};
        console.warn('calling getAsset: ', type, options);
        getAsset(req, res, type, options, function(result, response) {
            if (response.statusCode === 200) {
                var item = result;
                getImages(req, res, item, function(imageData) {
                    _imageData[type + '_' + id] = imageData;
                    _sendImage(req, res, type, imageData);
                });
            } else {
                console.warn('error for: ', type, options);
            }

        });
    } else {
        sendImage(req, res, type, data);
    }
});

/*
app.get('/wave/apps/thumb/:id', function(req, res) {
    var id = req.params.id;
    console.warn('get app thumb: ', id);
    var data = _imageData[id];
    if (!data) {
        getAsset(req, res, 'folders', {id: id}, function(result, response) {
            if (response.statusCode === 200) {
                var item = result;
                getImages(req, res, item, function(imageData) {
                    sendImage(imageData, req, res);
                });
            }

        });
    } else {
        sendImage(data, req, res);
    }
});
*/

app.get('/slack/imgtest', function(req, res) {
    //console.warn('GET /slack/imgtest called!');
    //console.warn('req.body: ', req.body);

    var imgData = "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";

    var img = new Buffer(imgData, 'base64');

    res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': img.length});
    res.end(img, 'binary');
});


/*
app.get('/', function (req, res) {
	res.render('index', { title: 'Wave on Heroku/NodeJS', message: 'Wave SDK'});
    response.render('index', { title: 'Wave on Heroku/NodeJS', message: 'Wave SDK'});    
});
*/

/*
app.get('/', function (req, res) {
    res.render('index', { title: 'Wave on Heroku/NodeJS', message: 'Wave SDK'});
    response.render('views/pages/index');    
});
*/

app.get('/oauthcallback.html', function (req, res) {
	res.render('oauthcallback', {title: 'OAuth'});
});

app.get('/oauthcallback', function (req, res) {
	res.render('oauthcallback', {title: 'OAuth'});
});

app.all('*', jsonParser, function (req, res, next) {

    // Set CORS headers: allow all origins, methods, and headers: you may want to lock this down in a production environment
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
    res.header("Access-Control-Allow-Headers", req.header('access-control-request-headers'));

    if (req.method === 'OPTIONS') {
        // CORS Preflight
        res.send();
    } else {
        var targetURL = req.header('Target-URL');
        if (!targetURL) {
            res.status(500).send({ error: 'Resource Not Found (Web Server) or no Target-URL header in the request (Proxy Server)' });
            return;
        }
        var url = targetURL + req.url;
        if (debug) console.log(req.method + ' ' + url);
        if (debug) console.log('Request body:');
        if (debug) console.log(req.body);
        request({ url: url, method: req.method, json: req.body, headers: {'Authorization': req.header('Authorization')} },
            function (error, response, body) {
                if (error) {
                    console.error('error: ' + response.statusCode)
                }
                if (debug) console.log('Response body:');
                if (debug) console.log(body);
            }).pipe(res);
    }
});

console.log('platform: ', os.platform());
console.log('arch: ', os.arch());
console.log('hostname: ', os.hostname());


// Create an HTTP service
http.createServer(app).listen(port);
console.log("Server listening for HTTP connections on port ", port);

// Create an HTTPS service if the certs are present
try {
    var options = {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('key-cert.pem')
    };
    https.createServer(options, app).listen(https_port);
    console.log("Server listening for HTTPS connections on port ", https_port);
} catch (e) {
    console.error("Security certs not found, HTTPS not available");
}

/*
if (os.hostname().indexOf('salesforce.com') > 0) {
    // Probably on Heroku...

} else {

}

// Create an HTTP service
http.createServer(app).listen(process.env.PORT || 3000);

var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('key-cert.pem')
};

https.createServer(options, app).listen(3001);

// Create an HTTP service on localhost
//http.createServer(app).listen(3000);
// Create an HTTPS service identical to the HTTP service
//https.createServer(options, app).listen(3001);
//https.createServer(options, app).listen(443);

*/

