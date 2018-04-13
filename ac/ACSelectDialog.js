'use strict';

class ACSelectDialog extends ACModal
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.searchQuery = '';
		
		this.addHeader({closeButton: true});
		this.contentCell = this.addSection();
		this.contentCell.style.maxHeight = '400px';
		this.contentCell.style.overflow = 'auto';
		this.contentCell.style.padding = '0';
		
		this.addFooter();
		
		this.lb = new ACListBox(this.contentCell);
		
		this.lb.addEventListener('itemSelected', evt => {
			if (!evt.detail.internalOrigin) {
				this.dispatchEvent(new CustomEvent('open', { detail: evt.detail.item.dataset }));
			}
		});
		
		this.addEventListener('keydown', evt => {
			switch(evt.key)
			{
				case 'ArrowUp':
					var prev = this.lb.getPreviousItem(true);
					if (prev) this.lb.selectItem(prev);
				break;
				case 'ArrowDown':
					var next = this.lb.getNextItem(true);
					if (next) this.lb.selectItem(next);
				break;
				case 'Enter':
					if (this.lb.getSelectedItem()) {
						var item = this.lb.getSelectedItem();
						this.dispatchEvent(new CustomEvent('open', { detail: this.lb.getSelectedItem().dataset }));
					}
				break;
				default:
					var tryString = evt.key != 'Backspace' ? (this.searchQuery + evt.key).toLowerCase() : this.searchQuery.substring(0, this.searchQuery.length - 1);
					var matches = this.lb.querySelectorAll(tryString ? 'button[data-name^="'+tryString+'"]' : 'button');
					var nonMatches = tryString.length > 0 ? this.lb.querySelectorAll('button:not([data-name^="'+tryString+'"])') : [];
					if (matches.length > 0 && tryString != this.searchQuery) {
						this.searchQuery = tryString;
						matches.forEach(match => {
							match.style.borderTopWidth = '1px';
							match.style.display = '';
							
							var fc = match.firstChild.firstChild;
							var lc = match.firstChild.lastChild;
							var netString = fc == lc ? fc.textContent : fc.textContent + lc.textContent;
							fc.remove();
							lc.remove();
							
							var nfc = AC.create('strong', match.firstChild);
							nfc.textContent = netString.substring(0, tryString.length);
							
							var nlc = AC.create('span', match.firstChild);
							nlc.textContent = netString.substring(tryString.length, netString.length);
						});
						matches[0].style.borderTopWidth = '0px';
						matches[matches.length-1].style.borderBottomWidth = '0px';
						nonMatches.forEach(match => {
							match.style.display = 'none';
							if (this.lb.getSelectedItem() == match) this.lb.selectItem();
						});
						
						if (!this.lb.getSelectedItem()) this.lb.selectItem(matches[0]);
					}
				break;
			}
		}, false);
	}
	
	addItem(name, id)
	{
		var item = this.lb.addItem(id, name);
		item.firstChild.remove(); // remove the text node which we don't want for this custom implementation
		
		var itemCaption = new ACStaticCell(item);
		itemCaption.style.float = 'left';
		itemCaption.textContent = name;
		
		var itemExtra = new ACStaticCell(item);
		itemExtra.style.float = 'right';
		itemExtra.textContent = id;
		
		return item;
	}
	
	display()
	{
		super.display();
	}
}

window.customElements.define('ac-selectdialog', ACSelectDialog);