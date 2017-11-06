'use strict';

class ACOnOffSwitch extends ACInput
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.inputBox = AC.create('input', this);
		this.inputBox.id = 'ACOnOffSwitch' + ACOnOffSwitch.count;
		this.inputBox.type = 'checkbox';
		
		var label = AC.create('label', this);
		label.htmlFor = this.inputBox.id;
		
		this.inputBox.onfocus = evt => {
			label.classList.add('active');
		}
		
		this.inputBox.onblur = evt => {
			label.classList.remove('active');
		}
		
		this.inputBox.onkeypress = evt => {
			if (evt.keyCode == 13) this.dispatchEvent(new CustomEvent('enter', {
				detail: {}
			}));
		}
		
		ACOnOffSwitch.count++;
	}
	
	get value()
	{
		return this.inputBox.checked;
	}
	
	set value(value)
	{
		this.inputBox.checked = value;
	}
	
	focus()
	{
		this.inputBox.focus();
	}
}

window.customElements.define('ac-onoffswitch', ACOnOffSwitch);
ACOnOffSwitch.count = 0;