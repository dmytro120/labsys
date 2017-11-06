'use strict';

class ACListBox extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.classList.add('list-group');
		this.items = {};
	}
	
	setStyle(style)
	{
		if (ST_BORDER_TOP & style) this.style.borderTopWidth = '1px';
		if (ST_BORDER_RIGHT & style) this.style.borderRightWidth = '1px';
		if (ST_BORDER_BOTTOM & style) this.style.borderBottomWidth = '1px';
		if (ST_BORDER_LEFT & style) this.style.borderLeftWidth = '1px';
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
			
			lgi.dataset.id = itemInfo.id;
			if (preselectId == itemInfo.id) {
				lgi.classList.add('active');
				this.activeItem = lgi;
			}
			
			lgi.dataset.name = itemInfo.name.toLowerCase();
			lgi.textContent = itemInfo.name;
			
			lgi.addEventListener('click', this.onItemSelected.bind(this, lgi, false), false);
			this.items[itemInfo.id] = lgi;
		}
	}
	
	/*clear()
	{
		this.items = {};
		this.activeItem = null;
		super.clear();
	}*/
	
	addItem(id, name)
	{
		var lgi = AC.create('button', this);
		lgi.setAttribute('type', 'button');
		lgi.classList.add('list-group-item');
		lgi.style.overflow = 'hidden';
		
		lgi.dataset.id = id;
		lgi.dataset.name = name.toLowerCase();
		lgi.textContent = name;
		
		lgi.addEventListener('click', this.onItemSelected.bind(this, lgi, false), false);
		this.items[id] = lgi;
		
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
	
	selectItemById(id)
	{
		//var lgi = this.querySelector('button[data-id="'+id+'"]');
		var lgi = this.items[id];
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
		return this.items[id];
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
		if (this.items[id]) {
			this.items[id].remove();
			delete this.items[id];
		}
	}
	
	itemCount()
	{
		return Object.keys(this.items).length;
	}
}

window.customElements.define('ac-listbox', ACListBox);