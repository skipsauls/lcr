window.wave.Step = function() {

 	this.getDef = function(handler) {
		return this._def;
 	}

	this.setName = function(name) {
		this.name = name;
	}

	this.getName = function() {
		return this.name;
	}

	this.setDatasets = function(datasets) {
		this._def.datasets = datasets;
	}

	this.getDatasets = function() {
		return this._def.datasets;
	}

	this.addDataset = function(dataset, handler) {
		this._def.datasets.push(dataset);
	}

	this.setFacet = function(val) {
		this._def.isFacet = val;
	}

	this.isFacet = function() {
		return this._def.isFacet;
	}

	this.setIsGlobal = function(val) {
		this._def.isGlobal = val;
	}

	this.isGlobal = function() {
		return this._def.isGlobal;
	}

	this.setQuery = function(query) {
		this._def.query.query = query;
	}

	this.getQuery = function() {
		return this._def.query.query;
	}

	this.setQueryVersion = function(version) {
		this._def.query.version = version;
	}

	this.getQueryVersion = function() {
		return this._def.query.version;
	}

	this.setSelectMode = function(mode) {
		this._def.selectMode = mode;
	}

	this.getSelectMode = function() {
		return this._def.selectMode;
	}

	this.setType = function(type) {
		this._def.type = type;
	}

	this.getType = function() {
		return this._def.type;
	}

	this.setSelectMode = function(mode) {
		this._def.selectMode = mode;
	}

	this.getSelectMode = function() {
		return this._def.selectMode;
	}

	this.setUseGlobal = function(val) {
		this._def.useGlobal = val;
	}

	this.useGlobal = function() {
		return this._def.isGlobal;
	}

	this.setVisualizationType = function(type) {
		this._def.visualizationParameters.visualizationType = type;
	}

	this.getVisualizationType = function() {
		return this._def.visualizationParameters.visualizationType;
	}

	this.setVisualizationOptions = function(options) {
		this._def.visualizationParameters.options = options;
	}

	this.getVisualizationOptions = function() {
		return this._def.visualizationParameters.options;
	}


}		
window.wave.Step.prototype = Object.create(Object);
window.wave.Step.prototype.constructor = window.wave.Step;
window.wave.Step.prototype.name = null;
window.wave.Step.prototype._def = {
	datasets: [],
	isFacet: true,
	isGlobal: false,
	query: {
		query: null,
		version: -1
	},
	selectMode: 'single',
	type: 'aggregate',
	useGloba: true,
	visualizationParameters: {
		visualizationType: 'hbar'
	}
};


