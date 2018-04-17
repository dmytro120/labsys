'use strict';

class ACTextInput extends ACInput
{
	constructor(parentNode)
	{
		super(parentNode);
		this.style.display = 'block';
		
		this.inputBox = AC.create('input', this);
		this.inputBox.type = 'text';
		this.inputBox.classList.add('form-control', 'input-sm');
		
		this.inputBox.onkeypress = evt => {
			if (evt.keyCode == 13) this.dispatchEvent(new CustomEvent('enter', {
				detail: {}
			}));
		}
		
		// Fix for glitch where spacebar triggers to parent element
		this.inputBox.addEventListener('keyup', evt => {
			if (evt.key == ' ') {
				evt.stopPropagation();
				evt.preventDefault();
			}
		});
		
		this.inputBox.onblur = evt => {
			this.dispatchEvent(new CustomEvent('blur', {
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
	
	select()
	{
		this.inputBox.setSelectionRange(0, this.inputBox.value.length);
	}
}

window.customElements.define('ac-textinput', ACTextInput);