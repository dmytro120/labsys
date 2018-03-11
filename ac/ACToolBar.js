'use strict';

class ACToolBar extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.classList.add('navbar', 'navbar-inverse', 'ToolBar');
		this.style.display = 'block';
		
		this.itemsNode = AC.create('ul', this);
		this.itemsNode.classList.add('nav','navbar-nav');
		
		this.iconSize = '32x32';
		this.isRadioCtrl = false;
		this.lastA = null;
	}
	
	addItem(data)
	{
		var li = AC.create('li', this.itemsNode);
		
		var a = AC.create('a', li);
		a.setAttribute('title', data.caption);
		
		if (this.iconSize == '32x32') {
			this.style.borderBottomColor = '#17817b';
			/*a.style.paddingBottom = '4px';
			
			var img = AC.create('div', a);
			img.classList.add('bebox');
			img.style.backgroundImage = 'url(rsrc/' + this.iconSize + '/' + data.icon + ')';
			
			var lbl = new ACStaticCell(a);
			lbl.textContent = data.caption;
			lbl.style.fontSize = 'smaller';
			lbl.style.textAlign = 'center';*/
			
			a.style.color = 'white';
			a.style.textTransform = 'uppercase';
			a.style.fontSize = 'smaller';
			a.style.width = '64px';
			a.style.textAlign = 'center';
			a.style.backgroundImage = 'url(rsrc/' + this.iconSize + '/' + data.icon + ')';
			a.style.backgroundRepeat = 'no-repeat';
			a.style.backgroundPosition = '16px 12px'; // L T
			a.textContent = data.caption;
			a.style.paddingTop = '48px';
		} else {
			//var img = AC.create('img', a);
			//img.src = 'rsrc/' + this.iconSize + '/' + data.icon;
			a.style.lineHeight = '24px';
			a.style.backgroundImage = 'url(rsrc/' + this.iconSize + '/' + data.icon + ')';
			a.style.backgroundRepeat = 'no-repeat';
			a.style.backgroundPosition = '6px 4px';
			a.style.padding = '0';
			a.style.paddingLeft = '28px';
			a.style.paddingRight = '8px';
			a.style.marginRight = '4px';
			a.style.fontSize = 'smaller';
			a.textContent = data.caption;
			/*var lbl = new ACStaticCell(a);
			lbl.textContent = data.caption;
			lbl.style.float = 'left';*/
		}
		
		if ('action' in data) a.action = data.action;
		a.addEventListener('click', this._onItemSelected.bind(this));
		
		if ('dataset' in data) for (var key in data.dataset) li.dataset[key] = data.dataset[key];
		
		return li;
	}
	
	setItems(itemsData)
	{
		this.itemsNode.clear();
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
	
	setIconSize(size)
	{
		this.iconSize = size;
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