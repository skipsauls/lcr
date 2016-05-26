window.wave.Lens = function() {
	wave.Base.call();
	var vtypes = {
		calheatmap: 'Calendar heat map',
		comparisontable: 'Comparison table',
		heatmap: 'Heat map',
		hbar: 'Horizontal bar',
		hbarhdot: 'Horizontal dot plot',
		matrix: 'Matrix',
		parallelcoords: 'Parallel coordinates',
		pie: 'Donut',
		pivottable: 'Pivot table',
		scatter: 'Scatter plot',
		stackhbar: 'Stacked horizontal bar',
		stackvbar: 'Stacked vertical bar',
		time: 'Time line',
		valuestable: 'Values table',
		vbar: 'Vertical bar',
		vdot: 'Vertical dot plot',			
	};
	this.getVisualizationTypes = function() { return vtypes; }
	this.getVisualizationType = function() {
		return this._def ? {name: this._def.visualizationType, label: vtypes[this._def.visualizationType]} : null;
	}
}		
window.wave.Lens.prototype = Object.create(window.wave.Base.prototype);
window.wave.Lens.prototype.constructor = window.wave.Lens;
window.wave.Lens.prototype.defaultImage = "/analytics/wave/web/proto/images/thumbs/thumb-chart-hbar.png";
window.wave.Lens.prototype.setVisualizationType = function(vtype) {
	this._def.visualizationType = vtype;
	updateAsset(this._def, 'visualizationType', function(res, err) {
		console.warn('updateAsset returned: ', res, err);
	});
}