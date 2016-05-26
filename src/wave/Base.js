window.wave.Base = function () {
}

window.wave.Base.prototype._def = {};

window.wave.Base.prototype.defaultImage = "/analytics/wave/web/proto/images/thumbs/thumb-dashboard.png";

window.wave.Base.prototype.init = function(def, handler) {
	this._def = def;
	this._typeMap = {
		'folder': 'app'
 	};

 	this.template = {

 	};

 	this.getDef = function(handler) {
		if (typeof handler === "function") {
			handler(this._def, null);
		} else {
			return this._def;
		}
 	}

 	this.getId = function() {
 		return this._def.id;
 	}

	this.getApp = function(handler) {
		if (this._def && this._def.folder) {
			getApp(
				{
					id: this._def.folder.id
				},
				handler
			);
		} else {
			if (typeof handler === "function") {
				handler(null, "No app found, perhaps you are calling this from an App?");
			} else {
				"No app found, perhaps you are calling this from an App?";
			}
		}
	}		

	if (typeof handler === 'function') {
		handler(this);
	}
}

window.wave.Base.prototype.getType = function() {
	return this._typeMap[this._def.type] || this._def.type;
}

window.wave.Base.prototype.getName = function() {
	return this._def.name;
}

window.wave.Base.prototype.getLabel = function() {
	return this._def.label;
}

window.wave.Base.prototype.setLabel = function(label) {
	this._def.label = label;
	wave.updateAsset(this._def, 'label', function(res, err) {
		console.warn('updateAsset returned: ', res, err);
	});
}

window.wave.Base.prototype.getFolderId = function() {
	return this._def.folder.id;
}

window.wave.Base.prototype.setFolderId = function(id) {
	this._def.folder.id = id;
	wave.updateAsset(this._def, 'folder', function(res, err) {
		console.warn('updateAsset returned: ', res, err);
	});
}

window.wave.Base.prototype.getPreview = function(handler) {
	if (this._def.imageData) {
		if (typeof handler === 'function') {
			handler(this._def.imageData.length ? this._def.imageData[0] : this._def.imageData, null)
		}
	} else {
		//return force.oauth.instance_url + this.defaultImage;

		var self = this;
		var t1 = window.performance.now();
		wave.getImages(this._def, function(imageData) {
			var t2 = window.performance.now();
			console.log('getImages timing: ' + (imageData !== null ? imageData.length : 0) + ' images in ' + ((t2 - t1) / 1000).toFixed(4) + ' seconds');
			self._def.imageData = imageData;
			if (typeof handler === 'function') {
				var img = self._def.imageData ? (self._def.imageData.length ? self._def.imageData[0] : self._def.imageData, force.oauth.instance_url + self.defaultImage) : null;
				handler(self._def.imageData || force.oauth.instance_url + self.defaultImage);
			}
		});
	}

	return;

	if (this._def.imageData) {
		return this._def.imageData.length ? this._def.imageData[0] : this._def.imageData;
	} else {
		return force.oauth.instance_url + this.defaultImage;
	}
}

