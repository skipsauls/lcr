var exports = module.exports = {};

function init(app, gameDef) {

	app.get('/games/rochambeau', function(req, res) {
	    res.render('partials/games/rochambeau', {title: 'Rochambeau'});
	});
}

function update(socket, req, nsp, game, action, callback) {
	console.warn('\n\n @@@@@ rochambeau.update: ', game, action);

	nsp.to(game.room).emit('game_update', {action: action, players: game.players, id: game.id, name: game.name, state: game.state});
}

exports.init = init;
exports.update = update;
