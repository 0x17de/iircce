function TreeItem(id, title, fOnClick) {
	this.id = id;
	this.item = $('<div/>').append($('<div/>').text(title));
	if (fOnClick) {
		this.item.click(function(event) {
			event.stopPropagation();
			fOnClick();
		});
	}
}
TreeItem.prototype.get = function() {
	return this.item;
}
TreeItem.prototype.add = function(treeItem) {
	treeItem.view = this.view;
	this.view.treeItemMap[treeItem.id] = treeItem;
	this.item.append(treeItem.get());
	return treeItem;
}
TreeItem.prototype.remove = function() {
	this.item.remove();
}

function TreeView() {
	this.treeItemMap = {};
	this.root = new TreeItem('');
	this.root.view = this;
}
TreeView.prototype.get = function() {
	return this.root.get();
}
TreeView.prototype.clear = function() {
	for (var i in this.treeItemMap) {
		this.remove(i);
	}
	return this.root.get().empty();
}
TreeView.prototype.find = function(id) {
	return this.treeItemMap[id];
}
TreeView.prototype.remove = function(treeItemOrId) {
	var id, treeItem;
	if (treeItemOrId instanceof TreeItem) {
		id = treeItemOrId.id;
		treeItem = treeItemOrId;
	} else {
		id = treeItemOrId;
		treeItem = this.find(treeItemOrId);
	}
	treeItem.remove();
	delete this.treeItemMap[id];
}
