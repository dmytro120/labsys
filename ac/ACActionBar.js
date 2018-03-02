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
		
		this.isRadioCtrl = false;
		this.lastA = null;
	}
	
	clearItems()
	{
		this.itemsNode.clear();
	}
	
	addItem(data)
	{
		var li = AC.create('li', this.itemsNode);
		var a = AC.create('a', li);
		if ('symbol' in data) a.classList.add('glyphicon', 'glyphicon-'+data.symbol);
		if ('caption' in data) a.setAttribute('title', data.caption);
		if ('caption' in data && !('symbol' in data)) a.textContent = data.caption;
		if ('action' in data) a.action = data.action;
		a.addEventListener('click', this._onItemSelected.bind(this));
		return li;
	}
	
	setItems(itemsData)
	{
		this.clearItems();
		for (var i = 0; i < itemsData.length; i++) {
			this.addItem(itemsData[i]);
		}
	}
	
	itemCount()
	{
		return this.itemsNode.childElementCount;
	}
	
	setRadio(isRadioCtrl)
	{
		this.isRadioCtrl = isRadioCtrl;
	}
	
	setActiveItem(li)
	{
		if (!li && this.lastA) {
			this.lastA.parentElement.classList.remove('active');
			this.lastA = null;
		}
		var a = li.firstChild;
		if (a == this.lastA) return;
		if (this.lastA) this.lastA.parentElement.classList.remove('active');
		this.lastA = a;
		a.parentElement.classList.add('active');
		this.lastA = a;
	}
	
	setStyle(style)
	{
		if (ST_BORDER_TOP & style) this.style.borderTopWidth = '1px';
		if (ST_BORDER_RIGHT & style) this.style.borderRightWidth = '1px';
		if (ST_BORDER_BOTTOM & style) this.style.borderBottomWidth = '1px';
		if (ST_BORDER_LEFT & style) this.style.borderLeftWidth = '1px';
	}
	
	_onItemSelected(evt)
	{
		var a = evt.target;
		if (!this.isRadioCtrl) {
			if (a.action) a.action();
		} else {
			if (a == this.lastA) return;
			if (this.lastA) this.lastA.parentElement.classList.remove('active');
			a.parentElement.classList.add('active');
			this.lastA = a;
			if (a.action) a.action();
		}
	}
}

window.customElements.define('ac-actionbar', ACActionBar);