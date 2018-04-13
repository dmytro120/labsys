'use strict';

class ACBrowseDialog extends ACModal
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.searchQuery = '';
		
		this.addHeader({closeButton: true});
		this.contentCell = this.addSection();
		this.contentCell.style.padding = '0';
		
		this.addFooter();
		
		var headerTable = AC.create('table', this.contentCell);
		headerTable.classList.add('table', 'table-bordered');
		headerTable.style.marginBottom = '0px';
		headerTable.style.userSelect = 'none';
		//headerTable.style.cursor = 'pointer';
		headerTable.style.border = '0';
		var tbody = AC.create('tbody', headerTable);
		this.headerRow = AC.create('tr', tbody);
		
		var tableContainer = new ACStaticCell(this.contentCell);
		tableContainer.style.maxHeight = '360px';
		tableContainer.style.overflow = 'auto';
		
		var table = AC.create('table', tableContainer);
		table.classList.add('table', 'table-bordered');
		table.style.marginBottom = '0px';
		table.style.userSelect = 'none';
		table.style.cursor = 'pointer';
		table.style.border = '0';
		this.tbody = AC.create('tbody', table);
		
		this.addEventListener('keydown', this.processKey.bind(this), false);
	}
	
	setHeadings(headings)
	{
		for (var index in headings) {
			var cell = AC.create('th', this.headerRow);
			cell.style.overflow = 'hidden';
			cell.textContent = headings[index];
		}
		if (!this.searchFieldIndex) this.searchFieldIndex = 0;
	}
	
	addItem(data, searchID)
	{
		var tr = AC.create('tr', this.tbody);
		for (var field in data) {
			var cell = AC.create('td', tr);
			cell.textContent = data[field];
		}
		if (searchID) tr.dataset.id = searchID.toLowerCase();
		tr.onmouseover = evt => {
			this.setActiveRow(tr, { preventScroll: true });
		};
		tr.onmouseout = evt => {
			tr.classList.remove('active');
			this.setActiveRow();
		};
		return tr;
	}
	
	setActiveRow(row, opts)
	{
		if (this.activeRow) this.activeRow.classList.remove('active');
		if (row) {
			row.classList.add('active');
			this.activeRow = row;
			if (!opts || !opts.preventScroll) row.scrollIntoView({behavior: "instant", block: "nearest", inline: "nearest"});
		} else {
			this.activeRow = null;
		}
	}
	
	updateHeadings()
	{
		var hCell = this.headerRow.firstChild;
		
		var cRow = this.tbody.firstChild;
		while (cRow && cRow.style.display == 'none') cRow = cRow.nextSibling;
		if (!cRow) {
			this.footerCell.style.borderTop = '0';
			return;
		}
		var cCell = cRow.firstChild;

		while (hCell && cCell) {
			var w = window.getComputedStyle(cCell).getPropertyValue('width');
			hCell.style.width = hCell.style.minWidth = hCell.style.maxWidth = w;
			hCell = hCell.nextSibling;
			cCell = cCell.nextSibling;
		}
		if (this.tbody.clientHeight > 360 && cRow.childElementCount == this.headerRow.childElementCount) {
			var filler = AC.create('th', this.headerRow);
			filler.style.borderLeft = '0';
			filler.previousSibling.style.borderRight = '0';
		}
	}
	
	display()
	{
		super.display();
		this.updateHeadings();
	}
	
	processKey(evt)
	{
		switch(evt.key)
		{
			case 'ArrowUp':
			case 'ArrowDown':
				var scanRow = (!this.activeRow && this.tbody.firstChild) ? 
					this.tbody.firstChild : 
					evt.key == 'ArrowUp' ? this.activeRow.previousSibling : this.activeRow.nextSibling;
				if (!scanRow) return;
				var targetRow = null;
				while (scanRow && !targetRow) {
					if (scanRow.style.display != 'none') targetRow = scanRow;
					scanRow = evt.key == 'ArrowUp' ? scanRow.previousSibling : scanRow.nextSibling;
				}
				if (targetRow) this.setActiveRow(targetRow);
			break;
			case 'Enter':
				if (this.activeRow) this.activeRow.dispatchEvent(new MouseEvent('click'));
			break;
			default:
				var tryString = evt.key != 'Backspace' ? 
					(this.searchQuery + evt.key).toLowerCase() : 
					this.searchQuery.substring(0, this.searchQuery.length - 1);
				
				var matches = this.tbody.querySelectorAll(tryString ? 'tr[data-id^="'+tryString+'"]' : 'tr');
				var nonMatches = tryString.length > 0 ? this.tbody.querySelectorAll('tr:not([data-id^="'+tryString+'"])') : [];
				
				if (matches.length > 0 && tryString != this.searchQuery) {
					this.searchQuery = tryString;
					matches.forEach(match => {
						match.classList.remove('last-item');
						match.style.borderTopWidth = '1px';
						match.style.display = '';
						
						var searchCell = match.childNodes[this.searchFieldIndex];
						var fc = searchCell.firstChild;
						var lc = searchCell.lastChild;
						var netString = fc == lc ? fc.textContent : fc.textContent + lc.textContent;
						fc.remove();
						lc.remove();
						
						var nfc = AC.create('strong', searchCell);
						nfc.textContent = netString.substring(0, tryString.length);
						
						var nlc = AC.create('span', searchCell);
						nlc.textContent = netString.substring(tryString.length, netString.length);
					});
					matches[matches.length-1].classList.add('last-item');
					nonMatches.forEach(match => {
						match.style.display = 'none';
						if (this.activeRow == match) this.setActiveRow();
					});
					
					if (!this.activeRow) this.setActiveRow(matches[0]);
					this.updateHeadings();
				}
			break;
		}
	}
}

window.customElements.define('ac-browsedialog', ACBrowseDialog);