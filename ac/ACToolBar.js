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
	}
	
	setItems(items)
	{
		this.itemsNode.clear();
		items.forEach(function(item) {
			var li = AC.create('li', this.itemsNode);
			
			var a = AC.create('a', li);
			//a.href = 'javascript:void(0)';
			a.setAttribute('title', item.caption);
			
			if (this.iconSize == '32x32') {
				a.style.paddingBottom = '4px';
				
				var img = AC.create('div', a);
				img.classList.add('bebox');
				img.style.backgroundImage = 'url(rsrc/' + this.iconSize + '/' + item.icon + ')';
				
				var lbl = new ACStaticCell(a);
				lbl.textContent = item.caption;
				lbl.style.fontSize = 'smaller';
				lbl.style.textAlign = 'center';
			} else {
				//var img = AC.create('img', a);
				//img.src = 'rsrc/' + this.iconSize + '/' + item.icon;
				a.style.lineHeight = '24px';
				a.style.backgroundImage = 'url(rsrc/' + this.iconSize + '/' + item.icon + ')';
				a.style.backgroundRepeat = 'no-repeat';
				a.style.backgroundPosition = '6px 2px';
				a.style.padding = '0';
				a.style.paddingLeft = '28px';
				a.style.paddingRight = '8px';
				a.style.marginRight = '4px';
				a.style.fontSize = 'smaller';
				a.textContent = item.caption;
				/*var lbl = new ACStaticCell(a);
				lbl.textContent = item.caption;
				lbl.style.float = 'left';*/
			}
			
			var action = item.action;
			if (action && action.constructor == Function) {
				a.onclick = action;
			}
		}, this);
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
}

window.customElements.define('ac-toolbar', ACToolBar);