'use strict';

class ACInput extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
	}
	
	get value()
	{
		return this.value;
	}
	
	set value(value)
	{
		this.value = value;
	}
	
	focus()
	{
		this.focus();
	}
}

window.customElements.define('ac-input', ACInput);