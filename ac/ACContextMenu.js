class ACContextMenu extends ACControl
{
	constructor(parentNode, params, target)
	{
		if (ACContextMenu.lastContextMenu != null) {
			ACContextMenu.lastContextMenu.destroy();
		}
		
		super(parentNode || document.body);
		
		this.style.left = `${params.clientX}px`;
		this.style.top = `${params.clientY}px`;
		
		for (var key in target.contextMenu) {
			var action = target.contextMenu[key];
			var item = new ACContextMenuItem(this);
			item.textContent = key;
			item.action = action;
			item.tabIndex = '-1';
			item.addEventListener('click', this._onItemClicked.bind(this, item));
		}
		
		ACContextMenu.lastContextMenu = this;
		this.listener = this.destroy.bind(this);
		document.addEventListener('click', this.listener);
		
		// If scroll dismisser is scrolled, this AC context menu is destroyed
		if (target.contextMenuScrollDismisser) {
			this.scrollDismisser = target.contextMenuScrollDismisser;
			this.scrollListener = (() => {
				this.destroy();
			}).bind(this);
			target.contextMenuScrollDismisser.addEventListener('scroll', this.scrollListener);
		}
		
		// Disable native context menu on AC context menu
		this.addEventListener('contextmenu', e => {
			e.preventDefault();
		});
		
		// If native context menu invoked, close AC context menu
		this.docCtxHandler = (e => {
			if (e.target != target) this.destroy();
		}).bind(this);
		document.addEventListener('contextmenu', this.docCtxHandler);
	}
	
	_onItemClicked(item)
	{
		if (item.action) item.action();
		this.destroy();
	}
	
	destroy(e)
	{
		if (e && e.target && e.target == this) return;
		document.removeEventListener('click', this.listener);
		if (this.scrollDismisser) {
			this.scrollDismisser.removeEventListener('scroll', this.scrollListener);
		}
		document.removeEventListener('contextmenu', this.docCtxHandler);
		ACContextMenu.lastContextMenu = null;
		this.remove();
	}
	
	static open(e)
	{
		new ACContextMenu(null, e, e.target);
		e.preventDefault();
	}
}
ACContextMenu.lastContextMenu = null;

class ACContextMenuItem extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
	}
}

window.customElements.define('ac-contextmenu', ACContextMenu);
window.customElements.define('ac-contextmenuitem', ACContextMenuItem);