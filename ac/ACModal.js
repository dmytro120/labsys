'use strict';

class ACModal extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.style.display = 'none';
		this.classList.add('modal', 'in');
		this.setAttribute('tabindex', '0');
		this.addEventListener('click', this.close.bind(this));
		
		this.backDrop = new ACStaticCell(parentNode);
		this.backDrop.classList.add('modal-backdrop', 'in');
		this.backDrop.style.display = 'none';
		
		var dialog = new ACStaticCell(this);
		dialog.classList.add('modal-dialog');
		
		this.contentArea = new ACStaticCell(dialog);
		this.contentArea.classList.add('modal-content');
		
		this.escapeListener = e => {
			if (e.which == 27) this.close();
		};
		document.addEventListener('keydown', this.escapeListener);
	}
	
	addHeader(params = {})
	{
		var header = new ACStaticCell(this.contentArea);
		header.classList.add('modal-header');
		
		if ('closeButton' in params && params.closeButton) {
			var cb1 = AC.create('button', header);
			cb1.setAttribute('type', 'button');
			cb1.classList.add('close');
			cb1.dataset.dismiss = 'modal';
			cb1.textContent = '×';
		}
		
		this.titleCtrl = AC.create('h4', header);
		this.titleCtrl.classList.add('modal-title');
		if ('title' in params) this.titleCtrl.textContent = params.title;
		
		return header;
	}
	
	setTitle(title)
	{
		if (this.titleCtrl) this.titleCtrl.textContent = title;
	}
	
	addSection()
	{
		var section = new ACStaticCell(this.contentArea);
		section.classList.add('modal-body');
		return section;
	}
	
	addFooter()
	{
		var footer = new ACStaticCell(this.contentArea);
		footer.classList.add('modal-footer');
		return footer;
	}
	
	setWidth(width)
	{
		this.contentArea.parentElement.style.width = width;
	}
	
	display()
	{
		this.style.display = this.backDrop.style.display = 'block';
	}
	
	close(e)
	{
		if (e && e.target != this && e.target.dataset.dismiss != 'modal') return;
		var cancelled = !this.dispatchEvent(new CustomEvent('close', {cancelable: true}));
		if (!cancelled) {
			document.removeEventListener('keydown', this.escapeListener);
			this.remove();
			this.backDrop.remove();
		}
	}
}

window.customElements.define('ac-modal', ACModal);