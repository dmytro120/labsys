'use strict';

class ACToolBar extends ACControl
{
	constructor(parentNode, params)
	{
		super(parentNode, params);
		
		this.classList.add('navbar', 'navbar-default');
		
		if (params && 'type' in params) {
			this.type = params.type;
			this.classList.add(this.type);
		}
		
		this.itemsNode = AC.create('ul', this);
		this.itemsNode.classList.add('nav','navbar-nav');
		
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
		if ('tooltip' in data || 'caption' in data) a.setAttribute('title', data.tooltip || data.caption);
		if ('caption' in data && !('symbol' in data)) a.textContent = data.caption;
		if ('icon' in data && this.type) a.style.backgroundImage = 'url(rsrc/' + (this.type == 'primary' ? '32x32' : '16x16') + '/' + data.icon + ')';
		if ('action' in data) a.action = data.action;
		a.addEventListener('click', this._onItemSelected.bind(this));
		if ('dataset' in data) for (var key in data.dataset) li.dataset[key] = data.dataset[key];
		return li;
	}
	
	setItems(itemsData)
	{
		this.clearItems();
		for (var i = 0; i < itemsData.length; i++) {
			this.addItem(itemsData[i]);
		}
	}
	
	setCaption(caption)
	{
		if (!this.captionCtrl) {
			this.captionCtrl = new ACStaticCell(this);
			this.captionCtrl.classList.add('caption');
		}
		this.captionCtrl.textContent = caption;
		return this.captionCtrl;
	}
	
	setStyle(style)
	{
		if (ST_BORDER_TOP & style) this.style.borderTopWidth = '1px';
		if (ST_BORDER_RIGHT & style) this.style.borderRightWidth = '1px';
		if (ST_BORDER_BOTTOM & style) this.style.borderBottomWidth = '1px';
		if (ST_BORDER_LEFT & style) this.style.borderLeftWidth = '1px';
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
			return;
		}
		var a = li.firstChild;
		if (a == this.lastA) return;
		if (this.lastA) this.lastA.parentElement.classList.remove('active');
		this.lastA = a;
		a.parentElement.classList.add('active');
		this.lastA = a;
	}
	
	_onItemSelected(evt)
	{
		var a = evt.target.tagName == 'A' ? evt.target : evt.target.parentElement;
		var li = a.parentElement;
		if (li.classList.contains('disabled')) return;
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

window.customElements.define('ac-toolbar', ACToolBar);