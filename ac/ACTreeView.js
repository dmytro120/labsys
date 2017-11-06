'use strict';

class ACTreeView extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.style.display = 'block';
		this.rootNodeList = new ACTreeViewNodeList(this, this);
		
		this.selectedNode = null;
		this.addEventListener('keydown', e => {
			console.log(e);
		});
	}
	
	add(caption, cssClass, action)
	{
		return this.rootNodeList.add(caption, cssClass, action);
	}
}

class ACTreeViewNodeList extends ACControl
{
	constructor(parentNode, treeView)
	{
		super(parentNode);
		this.treeView = treeView;
	}
	
	add(caption, iconClass, action)
	{
		var node = new ACTreeViewNode(this);
		node.setCaption(caption);
		if (iconClass) node.setIconClass(iconClass);
		if (action) node.setAction(action);
		node.classList.add('closed');
		if (this.parentElement.setHasChildren) this.parentElement.setHasChildren(true);
		return node.nodeList;
	}
}

class ACTreeViewNode extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.toggleCtrl = AC.create('span', this);
		this.toggleCtrl.classList.add('vtree-toggle');
		this.toggleCtrl.addEventListener('click', e => {
			this.classList.contains('closed') ? this.classList.remove('closed') : this.classList.add('closed');
		});
		
		this.labelCtrl = AC.create('a', this);
		//this.labelCtrl.classList.add('vtree-leaf-label');
		this.labelCtrl.addEventListener('click', evt => {
			this.select();
		});
		
		//this.toggleCtrl = AC.create('input', this);
		//this.toggleCtrl.type = 'checkbox';
		
		this.nodeList = new ACTreeViewNodeList(this, this.parentElement.treeView);
		this.hasChildren = false;
	}
	
	setCaption(caption)
	{
		this.labelCtrl.textContent = caption;
	}
	
	setIconClass(iconClass)
	{
		this.labelCtrl.className = iconClass;
	}
	
	setAction(action)
	{
		this.labelCtrl.addEventListener('click', action);
	}
	
	setHasChildren(hasChildren)
	{
		if (hasChildren && !this.hasChildren) this.classList.add('vtree-has-children');
		else if (!hasChildren && this.hasChildren) this.classList.remove('vtree-has-children');
		this.hasChildren = hasChildren;
	}
	
	select()
	{
		if (this.parentElement.treeView.selectedNode) this.parentElement.treeView.selectedNode.classList.remove('vtree-selected');
		this.classList.add('vtree-selected');
		this.parentElement.treeView.selectedNode = this;
	}
}

window.customElements.define('ac-treeview', ACTreeView);
window.customElements.define('ac-treeviewnodelist', ACTreeViewNodeList);
window.customElements.define('ac-treeviewnode', ACTreeViewNode);