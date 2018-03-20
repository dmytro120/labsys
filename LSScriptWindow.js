'use strict';

class LSScriptWindow extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		this.grid = new ACFlexGrid(this.rootNode, { rowHeights:['10px', 'auto', '40px'], colWidths:['20%', 'auto'] });
		this.grid.addSizer(0, AC_DIR_VERTICAL);
		
		// Left
		var tb = new ACToolBar(this.grid.cell(0,0), { type: 'secondary' });
		tb.classList.add('ls-toolbar');
		tb.setStyle(ST_BORDER_BOTTOM | ST_BORDER_RIGHT);
		tb.style.borderColor = '#17817b';
		tb.setItems([
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) },
			{caption: 'Create', icon: 'add.png', tooltip: 'Create (⌘N)', action: this.createItem.bind(this) },
			{caption: 'Open', icon: 'open.png', tooltip: 'Open (⌘O)', action: this.openItem.bind(this) },
			{caption: 'Rename', icon: 'rename.png', action: this.renameItem.bind(this) }
		]);
		
		var listContainer = new ACStaticCell(this.grid.cell(1,0));
		listContainer.style.height = '100%';
		listContainer.style.overflow = 'auto';
		this.grid.cell(1,0).style.borderRight = '1px solid #ddd';
		this.grid.cell(1,0).style.verticalAlign = 'top';
		this.lcScrollTop = null;
		listContainer.onscroll = function(evt) { this.lcScrollTop = listContainer.scrollTop }.bind(this);

		this.listBox = new ACListBox(listContainer);
		this.listBox.classList.add('scriptlist');
		this.listBox.setRearrangeable(true);
		this.listBox.addEventListener('itemSelected', this.selectItem.bind(this));
		
		var ab = new ACToolBar(this.grid.cell(2,0));
		ab.setStyle(ST_BORDER_TOP | ST_BORDER_RIGHT);
		ab.setItems([
			/*{symbol:'plus', caption:'New Entry', action:this.createItem.bind(this)},
			{symbol:'folder-open', caption:'Open Entry', action:this.openItem.bind(this)},*/
			{symbol:'step-backward', caption:'Previous Record', action:this.recPrevious.bind(this)},
			{symbol:'step-forward', caption:'Next Record', action:this.recNext.bind(this)}/*,
			{symbol:'pencil', caption:'Rename', action:this.renameItem.bind(this)}*/
		]);
		
		// Right
		this.tbr = new ACToolBar(this.grid.cell(0,1), { type: 'secondary' });
		this.tbr.classList.add('ls-toolbar');
		this.tbr.setStyle(ST_BORDER_BOTTOM);
		this.tbr.style.borderBottomColor = '#17817b';
		this.tbr.setItems([
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) },
			{caption: 'Run', icon: 'play.png', tooltip: 'Run (⌘↵)', action: this.runScript.bind(this) },
			{caption: 'Export', icon: 'export.png', action: this.exportScript.bind(this) },
			{caption: 'Remove', icon: 'bin.png', action: this.removeItem.bind(this) }
		]);
		this.tbr.firstChild.firstChild.style.display = 'none';
		
		this.itemGrid = new ACFlexGrid(this.grid.cell(1,1), { rowHeights:['50%', 'auto'], colWidths:['100%'] });
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
		this.contentContainer.style.marginTop = '-3px';
		
		var vb = new ACToolBar(this.grid.cell(2,1));
		vb.setStyle(ST_BORDER_TOP);
		vb.setItems([
			{symbol:'arrow-left', caption:'Toggle Script List', action:this.togglePane.bind(this, vb)},
			{symbol:'arrow-up', caption:'Toggle Editor', action:this.toggleEditor.bind(this, vb)}
		]);
	}
	
	onAttached()
	{
		this.rootNode.appendChild(this.grid);
		this.readScripts();
		if (this.contentContainerScrollTop) this.contentContainer.scrollTop = this.contentContainerScrollTop;
		if ('onAttached' in this.contentContainer) this.contentContainer.onAttached.call(this.contentContainer);
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
		if ('onAttached' in this.contentContainer) delete this.contentContainer.onAttached;
		if ('onDetached' in this.contentContainer) delete this.contentContainer.onDetached;
		
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
		if (!item) return;
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
			selectedItem.remove();
			this.scriptCtrl.session.setValue('', -1);
			this.scriptCtrl.setReadOnly(true);
			this.scriptCtrl.renderer.$cursorLayer.element.style.display = 'none';
			this.contentContainer.clear();
		}
	}
	
	runScript()
	{
		this.saveItem();
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
		this.contentContainerScrollTop = this.contentContainer.scrollTop;
		if ('onDetached' in this.contentContainer) this.contentContainer.onDetached.call(this.contentContainer);
	}
	
	writeScripts()
	{
		var scripts = {};
		
		Array.from(this.listBox.children).forEach(item => {
			scripts[item.dataset.id] = item.value;
		});
		
		localStorage.setItem('LSScriptWindowScripts', JSON.stringify(scripts));
	}
	
	exportScript()
	{
		var selectedItem = this.listBox.getSelectedItem();
		var contents = this.scriptCtrl.getValue();
		if (!contents || !selectedItem) return;
		
		var element = AC.create('a', this.rootNode);
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
		element.setAttribute('download', selectedItem.dataset.id + '.js');
		
		element.style.display = 'none';
		this.rootNode.appendChild(element);
		
		element.click();
		element.remove();
	}
	
	togglePane(bar)
	{
		var a = bar.firstChild.firstChild.firstChild;
		var hide = ['table-cell', ''].includes(this.grid.cell(0,0).style.display);
		for (var r = 0; r <= 2; r++) this.grid.cell(r,0).style.display = hide ? 'none' : 'table-cell';
		a.classList.remove(hide ? 'glyphicon-arrow-left' : 'glyphicon-arrow-right');
		a.classList.add(hide ? 'glyphicon-arrow-right' : 'glyphicon-arrow-left');
		this.tbr.firstChild.firstChild.style.display = hide ? 'block' : 'none';
	}
	
	toggleEditor(bar)
	{
		var a = bar.firstChild.lastChild.firstChild;
		var hide = ['table-row', ''].includes(this.itemGrid.cell(0,0).parentElement.style.display);
		this.itemGrid.cell(0,0).parentElement.style.display = hide ? 'none' : 'table-row';
		a.classList.remove(hide ? 'glyphicon-arrow-up' : 'glyphicon-arrow-down');
		a.classList.add(hide ? 'glyphicon-arrow-down' : 'glyphicon-arrow-up');
		if (!hide) this.scriptCtrl.focus();
	}
	
	exit()
	{
		this.dispatchEvent('quit');
	}
}
LSScriptWindow.counter = 1;