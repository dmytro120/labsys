'use strict';

class ACModal extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.style.display = 'block';
		this.classList.add('modal');
		this.setAttribute('tabindex', '0');
		
		this.md = new ACStaticCell(this);
		this.md.classList.add('modal-dialog');
		
		this.contentArea = new ACStaticCell(this.md);
		this.contentArea.classList.add('modal-content');
		
		this.bsSelector = new window.BSModal(this, {duration: 1});
		
		this.bsSelector.modal.addEventListener('hidden.bs.modal', evt => {
			var cancelled = !this.dispatchEvent(new CustomEvent('close', {cancelable: true}));
			if (cancelled) evt.preventDefault();
			else this.remove();
		});
	}
	
	display()
	{
		this.bsSelector.open();
	}
	
	close()
	{
		this.bsSelector.close();
	}
}

window.customElements.define('ac-modal', ACModal);