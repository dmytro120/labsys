'use strict';

class ACKeyValueView extends ACControl
{
	constructor(parentNode, params = {})
	{
		super(parentNode);
		this.controls = [];
		
		this.header = new ACStaticCell(this);
		this.header.classList.add('header');
		this.header.style.display = 'none';
		if ('caption' in params) this.setTitle(params.caption);
		
		var tableContainer = new ACStaticCell(this);
		tableContainer.classList.add('table-container');
		
		var table = AC.create('table', tableContainer);
		table.classList.add('table');
		
		this.tbody = AC.create('tbody', table);
	}
	
	setTitle(title)
	{
		this.header.textContent = title;
		this.header.style.display = 'block';
	}
	
	addField(key)
	{
		var row = AC.create('tr', this.tbody);
		row.classList.add('unbreakable');
		
		var th = AC.create('th', row);
		th.textContent = key;
		
		var td = AC.create('td', row);
		td.addEventListener('DOMNodeInserted', evt => {
			td.firstChild.addEventListener('enter', this.onEnter.bind(this));
			this.controls.push(td.firstChild);
		});
		
		return td;
	}
	
	onEnter(evt)
	{
		var control = evt.srcElement;
		
		var nextContainer = control.parentNode.parentNode.nextSibling;
		if (nextContainer) {
			var next = nextContainer.firstChild.nextSibling.firstChild;
			if (next.nodeName == 'DIV') next = next.firstChild;
			next.focus();
		}
	}
	
	getItem()
	{
		/*var item = {};
		for (var c = 0; c < this.controls.length; c++) {
			var control = this.controls[c];
			switch (control.type) {
				case 'checkbox': 
					item[control.name] = control.checked;
				break;
				case 'int':
					item[control.name] = parseInt(control.value);
				break;
				default:
					item[control.name] = control.value;
				break;
			}
		}
		return item;*/
	}
}

window.customElements.define('ac-keyvalueview', ACKeyValueView);