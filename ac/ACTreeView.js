'use strict';

class ACTreeView extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.tabIndex = -1;
		this.style.display = 'block';
		this.style.outline = 'none';
		this.rootNodeList = new ACTreeViewNodeList(this, this);
		
		this.selectedNode = null;
		this.addEventListener('keydown', this.processKey.bind(this));
	}
	
	add(caption, cssClass, action)
	{
		return this.rootNodeList.add(caption, cssClass, action);
	}
	
	processKey(evt)
	{
		if (!this.selectedNode) return;
		switch(evt.key) {
			
			case 'ArrowUp':
				var sibling = this.selectedNode.previousSibling;
				if (sibling) {
					var checkNode = sibling;
					while (!checkNode.classList.contains('closed')) {
						checkNode = checkNode.lastChild.lastChild;
					}
					checkNode.select();
				} else {
					var parent = this.selectedNode.parentNode.parentNode;
					if (parent.tagName == 'AC-TREEVIEWNODE') parent.select();
				}
			break;
			
			case 'ArrowDown':
				if (!this.selectedNode.classList.contains('closed')) {
					var targetNode = this.selectedNode.lastChild.firstChild;
					targetNode.select();
				} else {
					var checkNode = this.selectedNode;
					while (!checkNode.nextSibling) {
						checkNode = checkNode.parentNode.parentNode;
						if (checkNode.tagName != 'AC-TREEVIEWNODE') return;
					}
					checkNode.nextSibling.select();
				}
			break;
			
			case 'ArrowRight':
				this.selectedNode.open();
			break;
			
			case 'ArrowLeft':
				this.selectedNode.close();
			break;
			
		}
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
		this.action = action;
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
		if (this.action) this.action();
	}
	
	open()
	{
		if (this.classList.contains('closed') && this.hasChildren) this.classList.remove('closed');
	}
	
	close()
	{
		if (!this.classList.contains('closed')) this.classList.add('closed');
	}
}

window.customElements.define('ac-treeview', ACTreeView);
window.customElements.define('ac-treeviewnodelist', ACTreeViewNodeList);
window.customElements.define('ac-treeviewnode', ACTreeViewNode);