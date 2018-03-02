'use strict';

class ACListBox extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.classList.add('list-group');
		this.rearrangeable = false;
		
		this.eventNamesAndHandlers = {
			'dragstart': this._onItemDragStart,
			'dragover': this._onItemDragged,
			'dragend': this._onItemDragEnd
		};
	}
	
	setStyle(style)
	{
		if (ST_BORDER_TOP & style) this.style.borderTopWidth = '1px';
		if (ST_BORDER_RIGHT & style) this.style.borderRightWidth = '1px';
		if (ST_BORDER_BOTTOM & style) this.style.borderBottomWidth = '1px';
		if (ST_BORDER_LEFT & style) this.style.borderLeftWidth = '1px';
	}
	
	setRearrangeable(rearrangeable)
	{
		this.rearrangeable = rearrangeable;
		
		for (var eventName in this.eventNamesAndHandlers) {
			if (rearrangeable) this.addEventListener(eventName, this.eventNamesAndHandlers[eventName]);
			else this.removeEventListener(eventName, this.eventNamesAndHandlers[eventName]);
		}
		
		Array.from(this.children).forEach(item => {
			item.setAttribute('draggable', rearrangeable);
		});
	}
	
	/*clear()
	{
		this.activeItem = null;
		super.clear();
	}*/
	
	addItem(id, name)
	{
		var lgi = AC.create('button', this);
		lgi.setAttribute('type', 'button');
		lgi.classList.add('list-group-item');
		lgi.style.overflow = 'hidden';
		if (this.rearrangeable) lgi.setAttribute('draggable', true);
		
		lgi.dataset.id = id;
		lgi.dataset.name = name.toLowerCase();
		lgi.textContent = name;
		
		lgi.addEventListener('click', this._onItemSelected.bind(this, lgi, false), false);
		
		return lgi;
	}
	
	selectItem(item)
	{
		if (item) {
			this._onItemSelected.call(this, item, true);
			item.scrollIntoViewIfNeeded();
		} else {
			this.activeItem.classList.remove('active');
			this.activeItem = null;
		}
	}
	
	getItemById(id)
	{
		return this.querySelector('button[data-id^="'+id+'"]');;
	}
	
	getItemByName(name)
	{
		return this.querySelector('button[data-name^="'+name.toLowerCase()+'"]');
	}
	
	getItemsByNameBeginningWith(nameStart)
	{
		return this.querySelectorAll('button[data-name^="'+nameStart.toLowerCase()+'"]');
	}
	
	getSelectedItem()
	{
		return this.contains(this.activeItem) ? this.activeItem : null;
	}
	
	getPreviousItem(filterVisible)
	{
		if (!this.activeItem) return false;
		if (!filterVisible) return this.activeItem.previousSibling;
		
		var curItem = this.activeItem.previousSibling;
		while (1) {
			if (curItem.style.display != 'none') return curItem;
			curItem = curItem.previousSibling;
			if (!curItem) break;
		}
		return false;
	}
	
	getNextItem(filterVisible)
	{
		if (!this.activeItem) return false;
		if (!filterVisible) return this.activeItem.nextSibling;
		
		var curItem = this.activeItem.nextSibling;
		while (1) {
			if (curItem.style.display != 'none') return curItem;
			curItem = curItem.nextSibling;
			if (!curItem) break;
		}
		return false;
	}
	
	itemCount()
	{
		return this.children.length;
	}
	
	_onItemSelected(lgi, internalOrigin)
	{
		var lastItem = this.activeItem;
		if (this.activeItem) this.activeItem.classList.remove('active');
		lgi.classList.add('active');
		this.activeItem = lgi;
		this.dispatchEvent(new CustomEvent('itemSelected', {
			detail: {
				item: lgi,
				lastItem: lastItem,
				internalOrigin: internalOrigin
			}
		}));
	}
	
	_onItemDragStart(evt)
	{
		this.draggedItem = evt.target;
		this.classList.add('indrag');
	}
	
	_onItemDragged(evt)
	{
		evt.preventDefault();
		
		var isDown;
		if (this.dragScreenY) isDown = evt.screenY > this.dragScreenY;
		this.dragScreenY = evt.screenY;
		
		if (this.draggedItem && this.draggedItem != evt.target && evt.target.tagName == 'BUTTON') {
			var lb = evt.srcElement.parentElement;
			var pushOver = isDown ? evt.target.nextSibling : evt.target;
			lb.insertBefore(this.draggedItem, pushOver);
			this.draggedItem.focus();
		};
	}
	
	_onItemDragEnd(evt)
	{
		this.draggedItem = null;
		this.classList.remove('indrag');
		if (this.activeItem) this.activeItem.focus();
	}
}

window.customElements.define('ac-listbox', ACListBox);