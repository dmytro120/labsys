'use strict';

class ACNotebook extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.pager = AC.create('div', this);
		this.pager.classList.add('btn-group', 'pager');
		this.pager.setAttribute('role', 'group');
		
		this.container = AC.create('div', this);
	}
	
	setItems(items)
	{
		var isFirst = true;
		this.nodes = [];
		for (var i = 0; i < items.length; i++) {
			var caption = items[i];
			
			var tab = AC.create('button', this.pager);
			tab.type = 'button';
			tab.classList.add('btn', 'btn-default');
			
			var node = new StaticCell;
			tab.onclick = this.setNode.bind(this, tab, node);
			tab.textContent = caption;
			
			if (isFirst) {
				tab.classList.add('active');
				this.setNode(tab, node);
				isFirst = false;
			}
			
			this.nodes.push(node);
		}
	}
	
	setNode(btn, node)
	{
		if (this.activeBtn) this.activeBtn.classList.remove('active');
		btn.classList.add('active');
		this.activeBtn = btn;
		var existing = this.container.firstChild;
		if (existing) existing.remove();
		this.container.appendChild(node);
	}
	
	page(i)
	{
		return this.nodes[i];
	}
}

window.customElements.define('ac-notebook', ACNotebook);