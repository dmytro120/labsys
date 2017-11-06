'use strict';

class ACActionBar extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.classList.add('navbar', 'navbar-default');
		this.style.display = 'block';
		
		this.itemsNode = AC.create('ul', this);
		this.itemsNode.classList.add('nav','navbar-nav');
		this.itemsNode.style.overflow = 'auto';
	}
	
	setItems(items)
	{
		this.itemsNode.clear();
		for (var i = 0; i < items.length; i++) {
			var li = AC.create('li', this.itemsNode);
			var a = AC.create('a', li);
			//a.href = 'javascript:void(0)';
			if ('symbol' in items[i]) a.classList.add('glyphicon', 'glyphicon-'+items[i].symbol);
			if ('caption' in items[i]) a.setAttribute('title', items[i].caption);
			if ('action' in items[i]) a.onclick = items[i].action;
		}
	}
	
	setStyle(style)
	{
		if (ST_BORDER_TOP & style) this.style.borderTopWidth = '1px';
		if (ST_BORDER_RIGHT & style) this.style.borderRightWidth = '1px';
		if (ST_BORDER_BOTTOM & style) this.style.borderBottomWidth = '1px';
		if (ST_BORDER_LEFT & style) this.style.borderLeftWidth = '1px';
	}
}

window.customElements.define('ac-actionbar', ACActionBar);