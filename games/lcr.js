var exports = module.exports = {};

function init(app, gameDef) {

	app.get('/games/lcr', function(req, res) {
	    res.render('partials/games/lcr', {title: 'LCR'});
	});
}

exports.init = init;