'use strict';

class ACListBox extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.classList.add('list-group');
		this.rearrangeable = false;
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
		if (rearrangeable) {
			this.addEventListener('dragstart', this.onItemDragStart);
			this.addEventListener('dragover', this.onItemDragged);
			this.addEventListener('dragend', this.onItemDragEnd);
		}
		
		Array.from(this.children).forEach(item => {
			item.setAttribute('draggable', rearrangeable);
		});
	}
	
	setItems(itemsInfo)
	{
		if (this.activeItem && 'id' in this.activeItem.dataset) var preselectId = this.activeItem.dataset.id;
		this.clear();
		for (var i = 0; i < itemsInfo.length; i++) {
			var itemInfo = itemsInfo[i];
			if (!('id' in itemInfo && 'name' in itemInfo)) {
				console.log('ListBox setItems: could not add item because passed info is missing `id` and/or `name`.');
				continue;
			}
			var lgi = AC.create('button', this);
			lgi.setAttribute('type', 'button');
			lgi.classList.add('list-group-item');
			lgi.style.overflow = 'hidden';
			if (this.rearrangeable) lgi.setAttribute('draggable', true);
			
			lgi.dataset.id = itemInfo.id;
			if (preselectId == itemInfo.id) {
				lgi.classList.add('active');
				this.activeItem = lgi;
			}
			
			lgi.dataset.name = itemInfo.name.toLowerCase();
			lgi.textContent = itemInfo.name;
			
			lgi.addEventListener('click', this.onItemSelected.bind(this, lgi, false), false);
		}
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
		
		lgi.addEventListener('click', this.onItemSelected.bind(this, lgi, false), false);
		
		return lgi;
	}
	
	onItemSelected(lgi, internalOrigin)
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
	
	onItemDragStart(evt)
	{
		this.draggedItem = evt.target;
		this.classList.add('indrag');
	}
	
	onItemDragged(evt)
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
	
	onItemDragEnd(evt)
	{
		this.draggedItem = null;
		this.classList.remove('indrag');
		if (this.activeItem) this.activeItem.focus();
	}
	
	selectItemById(id)
	{
		var lgi = this.querySelector('button[data-id="'+id+'"]');
		if (lgi) this.selectItem(lgi);
		return lgi != null;
	}
	
	selectItemByName(name)
	{
		var lgi = this.querySelector('button[data-name^="'+name.toLowerCase()+'"]');
		if (lgi) this.selectItem(lgi);
		return lgi != null;
	}
	
	selectItem(item)
	{
		if (item) {
			this.onItemSelected.call(this, item, true);
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
	
	removeItemById(id)
	{
		var item = this.getItemById(id);
		if (item) {
			item.remove();
		}
	}
	
	itemCount()
	{
		return this.children.length;
	}
}

window.customElements.define('ac-listbox', ACListBox);