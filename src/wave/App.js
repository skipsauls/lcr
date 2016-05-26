window.wave.App = function() {
	window.wave.Base.call();
	this.getDashboards = function(handler) {
		getDashboards({
			params: { folderId: this._def.id }
		}, handler);
	}
	this.getLenses = function(handler) {
		getLenses({
			params: { folderId: this._def.id }
		}, handler);
	}
	this.getDatasets = function(handler) {
		getDatasets({
			params: { folderId: this._def.id }
		}, handler);
	}
}		
window.wave.App.prototype = Object.create(window.wave.Base.prototype);
window.wave.App.prototype.constructor = window.wave.App;
window.wave.App.prototype.defaultImage = "/analytics/wave/web/proto/images/app/icons/16.png";
