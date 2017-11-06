'use strict';

class ACNumberInput extends ACInput
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.inputBox = AC.create('input', this);
		this.inputBox.type = 'number';
		this.inputBox.classList.add('form-control', 'input-sm');
		
		this.inputBox.onkeypress = evt => {
			if (evt.keyCode == 13) this.dispatchEvent(new CustomEvent('enter', {
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

window.customElements.define('ac-numberinput', ACNumberInput);