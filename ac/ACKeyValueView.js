'use strict';

class ACKeyValueView extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		this.groups = {};
		this.controls = [];
	}
	
	getOrCreateGroupNamed(groupName)
	{
		if (groupName in this.groups) return this.groups[groupName];
		
		// Group header
		var groupHeader = new ACStaticCell(this);
		//groupHeader.style.backgroundColor = 'rgb(176, 234, 231)';
		groupHeader.style.margin = '0px 12px';
		groupHeader.style.padding = '4px 8px';
		groupHeader.style.fontWeight = 'bold';
		groupHeader.style.borderTop = '1px solid #ddd';
		groupHeader.style.borderBottom = '1px solid #ddd';
		groupHeader.style.marginBottom = '4px';
		groupHeader.textContent = (groupName != 'null' ? groupName : 'Summary');
		
		var tableContainer = new ACStaticCell(this);
		tableContainer.style.columnCount = '2';
		tableContainer.style.marginBottom = '12px';
		
		var table = AC.create('table', tableContainer);
		table.classList.add('table', 'KeyValueView');
		
		var tbody = AC.create('tbody', table);
		this.groups[groupName] = tbody;
		
		return tbody;
	}
	
	addField(groupName, key)
	{
		var group = this.getOrCreateGroupNamed(groupName);
		
		var row = AC.create('tr', group);
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