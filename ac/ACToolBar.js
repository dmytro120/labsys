'use strict';

class ACToolBar extends ACControl
{
	constructor(parentNode, params)
	{
		super(parentNode, params);
		
		this.classList.add('navbar', 'navbar-default');
		
		this.type = null;
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
		if ('icon' in data) a.style.backgroundImage = 'url(rsrc/' + (this.type == 'primary' ? '32x32' : '16x16') + '/' + data.icon + ')';
		if (!('caption' in data) && !('symbol' in data)) {
			a.textContent = '\xa0';
			a.parentElement.style.width = '40px';
		}
		if ('action' in data) a.action = data.action;
		a.addEventListener('click', this._onItemSelected.bind(this));
		if ('dataset' in data) for (var key in data.dataset) li.dataset[key] = data.dataset[key];
		if ('targetNode' in data) {
			li.targetNode = data.targetNode;
			li.targetNode.style.display = 'none';
		}
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
		if (li && li.firstChild == this.lastA) return;
		
		if (this.lastA) {
			var lastItem = this.lastA.parentElement;
			lastItem.classList.remove('active');
			if (lastItem.targetNode) {
				lastItem.targetNode.lastScrollTop = lastItem.targetNode.scrollTop;
				lastItem.targetNode.style.display = 'none';
			}
		}
		
		if (li) {
			var a = li.firstChild;
			this.lastA = a;
			li.classList.add('active');
			if (li.targetNode) {
				li.targetNode.style.display = 'block';
				if (li.targetNode.lastScrollTop) li.targetNode.scrollTop = li.targetNode.lastScrollTop;
			}
		} else {
			this.lastA = null;
		}
	}
	
	_onItemSelected(evt)
	{
		var a = evt.target.tagName == 'A' ? evt.target : evt.target.parentElement;
		var li = a.parentElement;
		if (li.classList.contains('disabled')) return;
		if (!this.isRadioCtrl) {
			if (a.action) a.action();
		} else {
			this.setActiveItem(li);
			if (a.action) a.action();
		}
	}
}

window.customElements.define('ac-toolbar', ACToolBar);