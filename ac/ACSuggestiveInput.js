'use strict';

class ACSuggestiveInput extends ACInput
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.inputBox = AC.create('input', this);
		this.inputBox.type = 'text';
		this.inputBox.style.width = '100%';
		this.lastDataList = [];
		
		this.dl = AC.create('DATALIST', this);
		this.dl.id = 'itemMatches';
		
		this.inputBox.addEventListener('input', evt => {
			if (this.lastDataList.includes(this.inputBox.value)) {
				this.dispatchEvent(new CustomEvent('select', {detail: { value: this.inputBox.value }}));
				return;
			}
			this.lastDataList = [];
		});
		
		this.inputBox.addEventListener('keydown', evt => {
			if (evt.key == 'ArrowDown') return;
			this.dl.clear();
			if (evt.key != 'Enter') return;
			this.dispatchEvent(new CustomEvent('scan', {detail: { value: this.inputBox.value }}));
		});
		
		this.inputBox.focus();
	}
	
	get value()
	{
		return this.inputBox.value;
	}
	
	set value(value)
	{
		this.inputBox.value = value;
	}
	
	focus()
	{
		this.inputBox.focus();
	}
	
	clearSuggestions()
	{
		this.lastDataList = [];
		this.dl.clear();
	}
	
	addSuggestion(suggestion)
	{
		var o = AC.create('option', this.dl);
		o.value = suggestion;
		o.textContent = suggestion;
		this.lastDataList.push(suggestion);
	}
	
	showSuggestions()
	{
		this.inputBox.setAttribute('list', this.dl.id);
	}
}

window.customElements.define('ac-suggestiveinput', ACSuggestiveInput);