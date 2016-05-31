// rochambeau.js
// Simple Rochambeau / Rock, Paper, Scissors game
console.warn('rochambeau.js');

var rochambeau = (function () {

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

	function showStats(obj, stats, players, rolls) {
		var board = getGameBoard(obj);
		var playersList = board.querySelector('[name="players"]');
		playersList.innerHTML = '';
		var stat = null;
		var info = null;
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
		showRound(obj, obj.round);
		showMessage(obj, obj.msg || obj.message);
		if (obj.stats) {
			showStats(obj, obj.stats, obj.players, obj.rolls);
		} else {
			showPlayers(obj, obj.players);
		}
	}

	function update(obj) {
		console.warn('\n\nrochambeau.update: ', obj);
		showDetails(obj);
	}

    // The public API
    return {
    	play: play,
        update: update
    };

}());

registerGameModule('rochambeau', rochambeau);
	
