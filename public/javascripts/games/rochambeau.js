// rochambeau.js
// Simple Rochambeau / Rock, Paper, Scissors game
console.warn('rochambeau.js');

var rochambeau = (function () {

	function select(event, roll) {
		console.warn('rochambeau.select: ', event, roll);
		var target = event.target;
		console.warn('target: ', target);
	}

	function play(roll) {
		console.warn('rochambeau.play: ', roll);
		emit('play', roll);
	}

	function showAction(obj, action) {
		var board = getGameBoard(obj);
		var actionEl = board.querySelector('[name="action"]');
		actionEl.innerHTML = action;		
	}

	function showState(obj, state) {
		var board = getGameBoard(obj);
		var stateEl = board.querySelector('[name="state"]');
		stateEl.innerHTML = state;		
	}

	function showMessage(obj, msg) {
		if (!msg) {
			return;
		}
		var board = getGameBoard(obj);
		var msgEl = board.querySelector('[name="message"]');
		msgEl.innerHTML = msg;
	}

	function showRound(obj, round) {
		if (!round) {
			return;
		}
		var board = getGameBoard(obj);
		var roundEl = board.querySelector('[name="round"]');
		roundEl.innerHTML = round;
	}

	function showPlayers(obj, players) {
		var board = getGameBoard(obj);
		var playersList = board.querySelector('[name="players"]');
		playersList.innerHTML = '';
		for (var id in players) {
			item = document.createElement('li');
			item.dataset.playerId = id;
			item.innerHTML = players[id].alias;
			playersList.appendChild(item);
		}
	}

	function showStats(obj, stats, players, rounds) {
		var board = getGameBoard(obj);
		var playersList = board.querySelector('[name="players"]');
		playersList.innerHTML = '';
		var stat = null;
		var info = null;
		var rolls = rounds.length > 1 ? rounds[rounds.length - 2].rolls : null;
		for (var id in players) {
			stat = stats[id];
			item = document.createElement('li');
			item.dataset.playerId = id;
			info = ' (' + (rolls && rolls[id] ? rolls[id] : 'N/A') + ')';
			info += ' - wins:' + stat.wins + ', losses: ' + stat.losses + ', ties: ' + stat.ties + '';
			item.innerHTML = players[id].alias + info;
			playersList.appendChild(item);
		}
	}

	function showDetails(obj) {
		showAction(obj, obj.action);
		showState(obj, obj.state);
		showRound(obj, obj.rounds ? obj.rounds.length : 0);
		showMessage(obj, obj.msg || obj.message);
		if (obj.stats) {
			showStats(obj, obj.stats, obj.players, obj.rounds);
		} else {
			showPlayers(obj, obj.players);
		}
	}

	function update(obj) {
		console.warn('\n\nrochambeau.update: ', obj);

		var board = getGameBoard(obj);
		var controls = board.querySelector('.controls');
		console.warn('obj.state: ', obj.state);
		if (obj.state !== 'running') {
			controls.classList.remove('running');
			var buttons = controls.querySelector('button');
			console.warn('buttons: ', buttons);
		}

		/*
		action: action,
		players: game.players,
		id: game.id,
		name: game.name,
		state: game.state,
		rounds: gs ? gs.rounds : null,
		stats: gs ? gs.players : null		
		*/

		showDetails(obj);
	}

    // The public API
    return {
    	select: select,
    	play: play,
        update: update
    };

}());

registerGameModule('rochambeau', rochambeau);
	
