'use strict';

class ACMenuBar extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.classList.add('navbar', 'navbar-inverse');
		
		this.headingNode = AC.create('div', this);
		this.headingNode.classList.add('navbar-header');
		
		this.itemsNode = AC.create('ul', this);
		this.itemsNode.classList.add('nav','navbar-nav');
	}
	
	setHeading(caption, action)
	{
		this.headingNode.clear();
		var heading = AC.create('a', this.headingNode);
		heading.classList.add('navbar-brand');
		heading.href = 'javascript:void(0)';
		if (action) heading.onclick = action;
		heading.textContent = caption;
	}
	
	setItems(items)
	{
		this.itemsNode.clear();
		for (var caption in items) {
			var li = AC.create('li', this.itemsNode);
			
			var a = AC.create('a', li);
			a.href = 'javascript:void(0)';
			a.textContent = caption;
			
			var action = items[caption];
			if (action && action.constructor == Function) {
				a.onclick = action;
			} else if (action) {
				li.classList.add('dropdown');
				a.classList.add('dropdown-toggle');
				a.dataset.toggle = 'dropdown';
				/*a.firstChild.nodeValue = a.firstChild.nodeValue + ' ';
				var caret = document.createElement('span');
				caret.classList.add('caret');
				a.appendChild(caret);*/
				var dh = new window.Dropdown(a);
				a.addEventListener('mouseover', e => {
					// if a dropdown is open: close it; open its dropdown.
					var openDropdown = this.querySelector('.open');
					if (openDropdown && e.srcElement.nextSibling != openDropdown.lastChild) {
						e.srcElement.click();
					}
				});
				//a.onclick = dh.toggle;
				var si_ul = AC.create('ul', li);
				si_ul.classList.add('dropdown-menu');
				for (var si_caption in action) {
					var si_li = AC.create('li', si_ul);
					var si_a = AC.create('a', si_li);
					si_a.href = 'javascript:void(0)';
					var si_action = action[si_caption];
					if (si_action) si_a.addEventListener('click', si_action);//si_a.onclick = si_action;
					si_a.textContent = si_caption;
				}
			}
		}
		
		//this.itemsNode.firstChild.firstChild.style.fontWeight = 'bold';
		
		/*var li = AC.create('li', this.itemsNode);
			
		var a = AC.create('a', li);
		a.href = 'javascript:void(0)';
		a.textContent = ' ';
		a.onclick = function() {alert('lol')};
		
		var img = AC.create('img', a);
		img.src = 'bmp/32x32/TbExit.bmp';*/
	}
	
	setStyle(style)
	{
		if (ST_BORDER_TOP & style) this.style.borderTopWidth = '1px';
		if (ST_BORDER_RIGHT & style) this.style.borderRightWidth = '1px';
		if (ST_BORDER_BOTTOM & style) this.style.borderBottomWidth = '1px';
		if (ST_BORDER_LEFT & style) this.style.borderLeftWidth = '1px';
	}
}

window.customElements.define('ac-menubar', ACMenuBar);