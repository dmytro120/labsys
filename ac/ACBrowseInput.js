'use strict';

class ACBrowseInput extends ACInput
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.classList.add('input-group');
		
		this.inputBox = AC.create('input', this);
		this.inputBox.type = 'text';
		this.inputBox.classList.add('form-control', 'input-sm');
		
		this.inputBox.onkeypress = evt => {
			if (evt.keyCode == 13) this.dispatchEvent(new CustomEvent('enter', {
				detail: {}
			}));
			if (evt.ctrlKey && evt.code == 'KeyB') this.dispatchEvent(new CustomEvent('browse', {
				detail: {}
			}));
		}
		
		this.inputBox.onblur = evt => {
			this.dispatchEvent(new CustomEvent('focusout', {
				detail: {}
			}));
		}
		
		var span = AC.create('span', this);
		span.classList.add('input-group-btn');
		var searchBtn = AC.create('a', span);
		searchBtn.classList.add('btn', 'btn-sm', 'btn-default');
		searchBtn.textContent = '🔍';//'…';
		searchBtn.style.fontSize = '18px';
		searchBtn.style.padding = '1px 5px 0px 5px';
		searchBtn.style.borderRadius = '0';
		
		searchBtn.onclick = evt => {
			this.dispatchEvent(new CustomEvent('browse', {
				detail: {}
			}));
		}
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
}

window.customElements.define('ac-browseinput', ACBrowseInput);