'use strict';

class ACListInput extends ACInput
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.inputBox = AC.create('select', this);
		this.inputBox.classList.add('form-control', 'input-sm');
		this.style.display = 'block';
		this.inputBox.style.paddingLeft = '0';
		this.inputBox.style.paddingRight = '0';
		this.inputBox.style.maxWidth = '199px';
		
		this.inputBox.onkeypress = evt => {
			if (evt.keyCode == 13) {
				evt.preventDefault();
				this.dispatchEvent(new CustomEvent('enter', { detail: {} }));
			}
		}
	}
	
	addOption(name, value)
	{
		var o = AC.create('option', this.inputBox);
		o.textContent = name;
		o.value = value;
		return o;
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

window.customElements.define('ac-listinput', ACListInput);