'use strict';

class ACDialog extends ACModal
{
	constructor(parentNode)
	{
		super(parentNode);
		
		var mh = new ACStaticCell(this.contentArea);
		mh.classList.add('modal-header');
		
		var cb1 = AC.create('button', mh);
		cb1.setAttribute('type', 'button');
		cb1.classList.add('close');
		cb1.dataset.dismiss = 'modal';
		cb1.textContent = '×';
		
		this.titleCtrl = AC.create('h4', mh);
		this.titleCtrl.classList.add('modal-title');
		this.titleCtrl.textContent = '';
		
		this.contentCell = new ACStaticCell(this.contentArea);
		this.contentCell.classList.add('modal-body');
		
		this.footerCell = new ACStaticCell(this.contentArea);
		this.footerCell.classList.add('modal-footer');
		
		var cb2 = AC.create('button', this.footerCell);
		cb2.setAttribute('type', 'button');
		cb2.classList.add('btn', 'btn-default');
		cb2.dataset.dismiss = 'modal';
		cb2.textContent = 'Close';
	}
	
	setTitle(title)
	{
		this.titleCtrl.textContent = title;
	}
	
	setWidth(width)
	{
		this.md.style.width = width;
	}
	
	contentCell()
	{
		return this.contentCell;
	}
	
	addButton(caption, action)
	{
		var btn = AC.create('button', this.footerCell);
		btn.setAttribute('type', 'button');
		btn.classList.add('btn', 'btn-default');
		btn.textContent = caption;
		if (action) btn.onclick = action;
		return btn;
	}
}

window.customElements.define('ac-dialog', ACDialog);