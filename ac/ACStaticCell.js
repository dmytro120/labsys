'use strict';

class ACStaticCell extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		this.style.display = 'block';
	}
}

window.customElements.define('ac-staticcell', ACStaticCell);