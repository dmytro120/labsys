'use strict';

class ACAboutModal extends ACModal
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.md.style.width = '502px';
		this.md.style.marginTop = '92px';
		
		this.contentCell = new ACStaticCell(this.contentArea);
		this.contentCell.classList.add('modal-body');
		this.contentCell.style.padding = '0';
		
		this.contentCell.style.width = '500px';
		this.contentCell.style.height = '333px';
		
		var infoCell = new ACStaticCell(this.contentCell);
		infoCell.style.position = 'absolute';
		infoCell.style.bottom = '0';
		infoCell.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
		infoCell.style.padding = '12px';
		
		this.titleControl = AC.create('div', infoCell);
		this.titleControl.style.fontSize = 'x-large';
		
		this.urlControl = AC.create('a', infoCell);
		this.urlControl.target = '_blank';
		
		var cb1 = AC.create('button', this.contentCell);
		cb1.setAttribute('type', 'button');
		cb1.classList.add('close');
		cb1.dataset.dismiss = 'modal';
		cb1.textContent = '×';
		cb1.style.paddingRight = '4px';
	}
	
	setTitle(title)
	{
		this.titleControl.textContent = title;
	}
	
	setURL(url)
	{
		this.urlControl.href = this.urlControl.textContent = url;
	}
	
	setImagePath(url)
	{
		this.contentCell.style.backgroundImage = 'url('+url+')';
	}
	
	contentCell()
	{
		return this.contentCell;
	}
}

window.customElements.define('ac-aboutmodal', ACAboutModal);