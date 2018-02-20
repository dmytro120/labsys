'use strict';

class LSScriptWindow extends ACFlexGrid
{
	constructor(parentNode)
	{
		super(parentNode);
		this.setLayout(['auto', '50px'], ['20%', 'auto']);
		this.addSizer(0, AC_DIR_VERTICAL);
		
		// Left
		var listContainer = new ACStaticCell(this.cell(0,0));
		listContainer.style.height = '100%';
		listContainer.style.overflow = 'auto';
		this.cell(0,0).style.borderRight = '1px solid #ddd';
		this.cell(0,0).style.verticalAlign = 'top';
		this.lcScrollTop = null;
		listContainer.onscroll = function(evt) { this.lcScrollTop = listContainer.scrollTop }.bind(this);

		this.listBox = new ACListBox(listContainer);
		this.listBox.setRearrangeable(true);
		this.listBox.addEventListener('itemSelected', this.selectItem.bind(this));
		
		var ab = new ACActionBar(this.cell(1,0));
		ab.setStyle(ST_BORDER_TOP | ST_BORDER_RIGHT);
		ab.setItems([
			{symbol:'plus', caption:'New Entry', action:this.createItem.bind(this)},
			{symbol:'folder-open', caption:'Open Entry', action:this.openItem.bind(this)},
			{symbol:'step-backward', caption:'Previous Record', action:this.recPrevious.bind(this)},
			{symbol:'step-forward', caption:'Next Record', action:this.recNext.bind(this)},
			{symbol:'pencil', caption:'Rename', action:this.renameItem.bind(this)}
		]);
		
		// Right
		this.itemGrid = new ACFlexGrid(this.cell(0,1));
		this.itemGrid.setLayout(['50%', 'auto'], ['100%']);
		this.itemGrid.addSizer(0, AC_DIR_HORIZONTAL);
		
		this.scriptCtrl = ace.edit(this.itemGrid.cell(0,0));
		this.scriptCtrl.$blockScrolling = Infinity;
		this.scriptCtrl.setTheme("ace/theme/xcode");
		this.scriptCtrl.getSession().setMode("ace/mode/javascript");
		this.scriptCtrl.renderer.setShowGutter(false);
		this.scriptCtrl.setShowPrintMargin(false);
		this.scriptCtrl.setHighlightActiveLine(false);
		this.scriptCtrl.setFontSize(14);
		this.scriptCtrl.getSession().setUseSoftTabs(false);
		this.scriptCtrl.setReadOnly(true);
		this.scriptCtrl.renderer.$cursorLayer.element.style.display = 'none';
		this.itemGrid.cell(0,0).style.borderBottom = '1px solid #ddd';
		this.itemGrid.addEventListener('layoutChanged', e => {
			this.scriptCtrl.resize(true);
		});
		
		this.contentContainer = new ACStaticCell(this.itemGrid.cell(1,0));
		this.contentContainer.style.height = '100%';
		this.contentContainer.style.overflow = 'auto';
		
		var vb = new ACActionBar(this.cell(1,1));
		vb.setStyle(ST_BORDER_TOP);
		vb.setItems([
			{symbol:'play', caption:'Save Entry', action:this.runScript.bind(this)},
			{symbol:'floppy-save', caption:'Save Entry', action:this.saveItem.bind(this)},
			{symbol:'minus', caption:'Remove Entry', action:this.removeItem.bind(this)}
		]);
	}
	
	onAttached()
	{
		this.readScripts();
	}
	
	readScripts()
	{
		if (this.lcScrollTop !== null) this.listBox.parentElement.scrollTop = this.lcScrollTop;
		
		var lastActiveItemID = this.listBox.getSelectedItem() ? this.listBox.getSelectedItem().dataset.id : null;
		var wasSameItemFound = false;
		this.listBox.clear();
		
		var scripts = localStorage.getItem('LSScriptWindowScripts');
		if (scripts) {
			try {
				var scripts = JSON.parse(scripts);
			} catch(e) {
				console.log('bad json ' + scripts);
				return;
			}
		
			for (var name in scripts) {
				var item = this.listBox.addItem(name, name);
				item.value = scripts[name];
				if (name == lastActiveItemID) {
					item.classList.add('active');
					this.listBox.activeItem = item;
					wasSameItemFound = true;
				}
			}
			
			if (!wasSameItemFound) {
				this.scriptCtrl.session.setValue('');
				this.contentContainer.clear();
			}
		}
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'new': this.createItem(); break;
			case 'open': this.openItem(); break;
			case 'save': this.saveItem(); break;
			case 'enter': this.runScript(); break;
			case 'eof': this.exit(); break;
		}
	}
	
	selectItem(evt)
	{
		var lastItem = evt.detail.lastItem;
		if (lastItem) lastItem.value = this.scriptCtrl.getValue();
		var item = evt.detail.item;
		this.scriptCtrl.session.setValue(item.value, -1);
		this.scriptCtrl.setReadOnly(false);
		this.scriptCtrl.renderer.$cursorLayer.element.style.display = "";
		this.contentContainer.clear();
		this.scriptCtrl.focus();
	}
	
	saveItem()
	{
		var item = this.listBox.activeItem;
		if (item) item.value = this.scriptCtrl.getValue();
		this.writeScripts();
	}
	
	createItem()
	{
		var name = 'New ' + LSScriptWindow.counter;
		while (this.listBox.getItemByName(name)) {
			LSScriptWindow.counter++;
			name = 'New ' + LSScriptWindow.counter;
		}
		var item = this.listBox.addItem(name, name);
		item.value = '';
		this.listBox.selectItem(item);
		LSScriptWindow.counter++;
	}
	
	openItem()
	{
		var modal = new ACDialog(document.body);
		modal.setTitle('Open Entry');
		
		var si = new ACSuggestiveInput(modal.contentCell);
		
		si.addEventListener('select', evt => {
			this.listBox.selectItem(this.listBox.getItemsByNameBeginningWith(evt.detail.value)[0]);
			modal.close();
		});
		
		si.addEventListener('scan', evt => {
			var items = this.listBox.getItemsByNameBeginningWith(evt.detail.value);
			if (items.length == 1 || (items.length > 0 && items[0].dataset.id == evt.detail.value)) {
				this.listBox.selectItem(items[0]);
				modal.close();
			} else if (items.length > 0) {
				si.clearSuggestions();
				items.forEach(item => {
					si.addSuggestion(item.dataset.id);
				});
				si.showSuggestions();
			} else {
				si.clearSuggestions();
			}
		});
		
		modal.display();
	}
	
	recPrevious()
	{
		var p = this.listBox.getPreviousItem();
		if (p) this.listBox.selectItem(p);
	}
	
	recNext()
	{
		var n = this.listBox.getNextItem();
		if (n) this.listBox.selectItem(n);
	}
	
	renameItem()
	{
		var item = this.listBox.activeItem;
		item.clear();
		
		var input = new ACTextInput(item);
		input.firstChild.style.padding = '0';
		input.firstChild.style.height = '20px';
		input.value = item.dataset.id;
		input.select();
		input.focus();
		
		input.addEventListener('enter', e => {
			item.focus();
		});
		input.addEventListener('blur', e => {
			var oldName = item.dataset.id;
			var newName = input.value;
			
			if (oldName != newName) {
				var foundItem = this.listBox.getItemByName(newName);
				if (foundItem) {
					input.style.borderColor = 'red';
					input.focus();
					return;
				}
				
				item.clear();
				
				item.dataset.name = newName.toLowerCase();
			}
			
			item.textContent = item.dataset.id = newName;
		});
		input.addEventListener('click', e => {
			e.stopPropagation();
		});
	}
	
	removeItem()
	{
		var selectedItem = this.listBox.getSelectedItem();
		if (selectedItem && confirm('Script ' + selectedItem.dataset.id + ' will be removed.')) {
			this.listBox.removeItemById(selectedItem.dataset.id);
			this.scriptCtrl.session.setValue('', -1);
			this.scriptCtrl.setReadOnly(true);
			this.scriptCtrl.renderer.$cursorLayer.element.style.display = 'none';
			this.contentContainer.clear();
		}
	}
	
	runScript()
	{
		this.contentContainer.clear();
		var script = this.scriptCtrl.getValue();
		var lsListBox = this.listBox;
		try {
			(function() {
				var run = scriptName => {
					var item = lsListBox.getItemByName(scriptName);
					if (item) {
						return eval(item.value);
					} else {
						console.log('Could not run script');
						return false;
					};
				}
				return eval(script);
			}).call(this.contentContainer);
		} catch (e) {
			var errorCell = new ACStaticCell(this.contentContainer);
			errorCell.textContent = e.message;
			errorCell.style.color = 'red';
		}
	}
	
	onDetached()
	{
		this.saveItem();
	}
	
	writeScripts()
	{
		var scripts = {};
		
		Array.from(this.listBox.children).forEach(item => {
			scripts[item.dataset.id] = item.value;
		});
		
		localStorage.setItem('LSScriptWindowScripts', JSON.stringify(scripts));
	}
	
	exit()
	{
		this.dispatchEvent(new Event('quit'));
	}
}
LSScriptWindow.counter = 1;

window.customElements.define('ls-scriptwindow', LSScriptWindow);