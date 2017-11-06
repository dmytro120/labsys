'use strict';

const ST_BORDER_TOP = 1;
const ST_BORDER_RIGHT = 2;
const ST_BORDER_BOTTOM = 4;
const ST_BORDER_LEFT = 8;

class AC
{
	static create(type, container, replace)
	{
		var el = document.createElement(type);
		if (el) {
			if (container instanceof HTMLElement) {
				if (replace === true) {
					var fc = container.firstChild;
					if (fc) fc.remove();
				}
				container.appendChild(el);
			}
			return el;
		} else {
			return document.createElement('div');
		}
	}
}

Node.prototype.clear = function()
{
	while (this.firstChild) this.firstChild.remove();
}