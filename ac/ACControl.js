'use strict';

class ACControl extends HTMLElement
{
	constructor(parentNode)
	{
		super();
		if (!parentNode) parentNode = document.body;
		parentNode.appendChild(this);
	}
}

window.customElements.define('ac-control', ACControl);