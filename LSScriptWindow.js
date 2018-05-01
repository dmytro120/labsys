'use strict';

class LSScriptWindow extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		// Read Info
		this.info = {};
		var infoJSON = localStorage.getItem('LSScriptWindow');
		try {
			var info = JSON.parse(infoJSON);
			if (info && info != null) this.info = info;
		}
		catch (e) {}
		if (!('scripts' in this.info)) this.info.scripts = {};
		if (!('scriptPaneWidth' in this.info)) this.info.scriptPaneWidth = '222px';
		if (!('editorPaneHeight' in this.info)) this.info.editorPaneHeight = '50%';
		if (!('leftPaneVisible' in this.info)) this.info.leftPaneVisible = true;
		if (!('editorVisible' in this.info)) this.info.editorVisible = true;
		
		// Main Grid
		this.grid = new ACFlexGrid(this.rootNode, { rowHeights:['10px', 'auto', '36px'], colWidths:[this.info.scriptPaneWidth, 'auto'] });
		this.grid.addSizer(0, AC_DIR_VERTICAL);
		
		// Left
		var modeToolBar = new ACToolBar(this.grid.cell(0,0), { type: 'secondary' });
		modeToolBar.classList.add('ls-toolbar');
		modeToolBar.setStyle(ST_BORDER_BOTTOM | ST_BORDER_RIGHT);
		modeToolBar.style.borderColor = '#17817b';
		modeToolBar.setItems([
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) },
			{caption: 'Create', icon: 'add.png', tooltip: 'Create (⌘N)', action: this.createItem.bind(this) },
			{caption: 'Open...', icon: 'open.png', tooltip: 'Open (⌘O)', action: this.openItem.bind(this) }
		]);
		
		this.upCtrl = AC.create('input', modeToolBar);
		this.upCtrl.accept = ".js,.json";
		this.upCtrl.type = 'file';
		this.upCtrl.style.display = 'none';
		this.upCtrl.addEventListener('change', this.importFile.bind(this));
		
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
		this.listBox.addEventListener('itemAdded', e => {
			var item = e.detail.item;
			item.contextMenu = {
				'Rename': this.renameItem.bind(this, item),
				'Export': this.exportScript.bind(this, item),
				'Remove': this.removeItem.bind(this, item)
			};
			item.contextMenuScrollDismisser = listContainer;
			item.addEventListener('contextmenu', ACContextMenu.open);
		});
		this.listBox.contextMenu = {
			'Export All': this.exportAll.bind(this),
			'Import...': () => this.upCtrl.click()
		};
		this.listBox.contextMenuScrollDismisser = listContainer;
		this.listBox.addEventListener('contextmenu', ACContextMenu.open);
		
		var modeActionBar = new ACToolBar(this.grid.cell(2,0));
		modeActionBar.setStyle(ST_BORDER_TOP | ST_BORDER_RIGHT);
		modeActionBar.setRadio(true);
		modeActionBar.setItems([
			{symbol:'list', caption:'List', targetNode: listContainer}
		]);
		modeActionBar.setActiveItem(modeActionBar.firstChild.firstChild);
		
		// Right
		this.itemToolBar = new ACToolBar(this.grid.cell(0,1), { type: 'secondary' });
		this.itemToolBar.classList.add('ls-toolbar');
		this.itemToolBar.setStyle(ST_BORDER_BOTTOM);
		this.itemToolBar.style.borderBottomColor = '#17817b';
		this.itemToolBar.setItems([
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) },
			{caption: 'Run', icon: 'play.png', tooltip: 'Run (⌘↵)', action: this.runScript.bind(this) }
		]);
		this.itemToolBar.firstChild.firstChild.style.display = 'none';
		
		this.itemGrid = new ACFlexGrid(this.grid.cell(1,1), { rowHeights:[this.info.editorPaneHeight, 'auto'], colWidths:['100%'] });
		this.itemGrid.addSizer(0, AC_DIR_HORIZONTAL);
		
		this.editor = ace.edit(this.itemGrid.cell(0,0));
		this.editor.$blockScrolling = Infinity;
		this.editor.setTheme("ace/theme/xcode");
		this.editor.getSession().setMode("ace/mode/javascript");
		this.editor.renderer.setShowGutter(false);
		this.editor.setShowPrintMargin(false);
		this.editor.setHighlightActiveLine(false);
		this.editor.setFontSize(14);
		this.editor.getSession().setUseSoftTabs(false);
		this.editor.setReadOnly(true);
		this.editor.renderer.$cursorLayer.element.style.display = 'none';
		this.itemGrid.cell(0,0).style.borderBottom = '1px solid #ddd';
		this.itemGrid.addEventListener('layoutChanged', e => {
			this.editor.resize(true);
		});
		
		this.contentContainer = new ACStaticCell(this.itemGrid.cell(1,0));
		this.contentContainer.style.height = '100%';
		this.contentContainer.style.overflow = 'auto';
		this.contentContainer.style.marginTop = '-3px';
		
		var itemActionBar = new ACToolBar(this.grid.cell(2,1));
		itemActionBar.setStyle(ST_BORDER_TOP);
		itemActionBar.setItems([
			{icon:'pane-reset.png', tooltip:'Reset Layout', action:this.resetLayout.bind(this)},
			{icon:'pane-left.png', tooltip:'Toggle Script List', action:this.togglePane.bind(this)},
			{icon:'pane-top.png', tooltip:'Toggle Editor', action:this.toggleEditor.bind(this)}
		]);
		
		this.togglePane(this.info.leftPaneVisible);
		this.toggleEditor(this.info.editorVisible);
		
		this.readScripts();
	}
	
	readScripts()
	{
		var lastActiveItemID = this.listBox.getSelectedItem() ? this.listBox.getSelectedItem().dataset.id : null;
		var wasSameItemFound = false;
		this.listBox.clear();
		
		for (var name in this.info.scripts) {
			var item = this.listBox.addItem(name, name);
			item.value = this.info.scripts[name];
			
			if (name == lastActiveItemID) {
				item.classList.add('active');
				this.listBox.activeItem = item;
				wasSameItemFound = true;
			}
		}
		
		if (!wasSameItemFound) {
			this.editor.session.setValue('');
			this.contentContainer.clear();
		}
	}
	
	onAttached()
	{
		this.rootNode.appendChild(this.grid);
		if (this.lcScrollTop) this.listBox.parentElement.scrollTop = this.lcScrollTop;
		if (this.contentContainerScrollTop) this.contentContainer.scrollTop = this.contentContainerScrollTop;
		if ('onAttached' in this.contentContainer) this.contentContainer.onAttached.call(this.contentContainer);
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'new': this.createItem(); break;
			case 'open': this.openItem(); break;
			case 'save': this.saveCurrentItem(); break;
			case 'enter': this.runScript(); break;
			case 'layout': this.resetLayout(); break;
			case 'eof': this.exit(); break;
		}
	}
	
	selectItem(evt)
	{
		var lastItem = evt.detail.lastItem;
		if (lastItem) lastItem.value = this.editor.getValue();
		var item = evt.detail.item;
		this.editor.session.setValue(item.value, -1);
		this.editor.setReadOnly(false);
		this.editor.renderer.$cursorLayer.element.style.display = "";
		
		this.contentContainer.clear();
		if ('onAttached' in this.contentContainer) delete this.contentContainer.onAttached;
		if ('onDetached' in this.contentContainer) delete this.contentContainer.onDetached;
		
		this.editor.focus();
	}
	
	saveCurrentItem()
	{
		var item = this.listBox.activeItem;
		if (item) item.value = this.editor.getValue();
		this.writeInfo();
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
		var modal = new ACModal(document.body);
		modal.addHeader({ title: 'Open Entry', closeButton: true });
		
		var contentCell = modal.addSection();
		var si = new ACSuggestiveInput(contentCell);
		
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
		
		modal.addFooter();
		modal.display();
		si.focus();
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
	
	renameItem(item)
	{
		this.listBox.renameItem(item);
	}
	
	removeItem(item)
	{
		var selectedItem = this.listBox.getSelectedItem();
		if (item && confirm('Script ' + item.dataset.id + ' will be removed.')) {
			item.remove();
			if (item == selectedItem) {
				this.editor.session.setValue('', -1);
				this.editor.setReadOnly(true);
				this.editor.renderer.$cursorLayer.element.style.display = 'none';
				this.contentContainer.clear();
			}
		}
	}
	
	runScript()
	{
		this.saveCurrentItem();
		this.contentContainer.clear();
		var script = this.editor.getValue();
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
		this.saveCurrentItem();
		this.contentContainerScrollTop = this.contentContainer.scrollTop;
		if ('onDetached' in this.contentContainer) this.contentContainer.onDetached.call(this.contentContainer);
	}
	
	writeInfo()
	{
		this.info.scripts = {};
		Array.from(this.listBox.children).forEach(item => {
			this.info.scripts[item.dataset.id] = item.value;
		});
		
		this.info.scriptPaneWidth = this.grid.cell(0,0).style.width;
		this.info.editorPaneHeight = this.itemGrid.cell(0,0).style.height;
		
		localStorage.setItem('LSScriptWindow', JSON.stringify(this.info));
	}
	
	exportScript(item)
	{
		var selectedItem = this.listBox.getSelectedItem();
		if (item == selectedItem) item.value = this.editor.getValue();
		
		var element = AC.create('a', this.rootNode);
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(item.value));
		element.setAttribute('download', item.dataset.id + '.js');
		element.style.display = 'none';
		element.click();
		element.remove();
	}
	
	exportAll()
	{
		this.saveCurrentItem();
		
		var element = AC.create('a', this.rootNode);
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.info.scripts, null, '\t')));
		element.setAttribute('download', this.constructor.name + '.json');
		element.style.display = 'none';
		element.click();
		element.remove();
	}
	
	importFile(e)
	{
		var file = this.upCtrl.files.item(0);
		if (!file) return;
		
		var nameBits = file.name.split('.');
		var extension = nameBits.pop();
		var name = nameBits.join('.');
		
		if (!['js', 'json'].includes(extension)) {
			alert('Unable to import unrecognised file format.');
			return;
		}
		
		var fileReader = new FileReader();
		fileReader.onload = () => {
			var fileContents = fileReader.result;
			if (extension == 'js') {
				var counter = 1;
				var importName = name;
				while (this.listBox.getItemByName(importName)) {
					counter++;
					importName = name + ' ' + counter;
				}
				var item = this.listBox.addItem(importName, importName);
				item.value = fileContents;
				this.listBox.selectItem(item);
			} else {
				var importPages;
				try {
					importPages = JSON.parse(fileContents);
				}
				catch (e) {
					alert('Unable to read JSON.');
					return;
				}
				var importCount = 0;
				for (let key in importPages) {
					let value = importPages[key];
					if (typeof value != 'string') continue;
					var counter = 1;
					var importName = key;
					while (this.listBox.getItemByName(importName)) {
						counter++;
						importName = key + ' ' + counter;
					}
					var item = this.listBox.addItem(importName, importName);
					item.value = value;
					importCount++;
				}
				alert('Imported ' + importCount + ' scripts.');
			}
		};
		fileReader.onerror = e => {
			alert('Unable to read file.');
		};
		fileReader.readAsText(file);
		this.upCtrl.value = '';
	}
	
	togglePane(forceOn)
	{
		var hide = (forceOn != undefined) ? !forceOn : ['table-cell', ''].includes(this.grid.cell(0,0).style.display);
		for (var r = 0; r <= 2; r++) this.grid.cell(r,0).style.display = hide ? 'none' : 'table-cell';
		this.itemToolBar.firstChild.firstChild.style.display = hide ? 'block' : 'none';
		this.info.leftPaneVisible = !hide;
	}
	
	toggleEditor(forceOn)
	{
		var hide = (forceOn != undefined) ? !forceOn : ['table-row', ''].includes(this.itemGrid.cell(0,0).parentElement.style.display);
		this.itemGrid.cell(0,0).parentElement.style.display = hide ? 'none' : 'table-row';
		if (!hide) this.editor.focus();
		this.info.editorVisible = !hide;
	}
	
	resetLayout()
	{
		this.info.scriptPaneWidth = this.grid.cell(0,0).style.width = '222px';
		this.info.editorPaneHeight = this.itemGrid.cell(0,0).style.height = '50%';
		this.togglePane(true);
		this.toggleEditor(true);
	}
	
	exit()
	{
		this.dispatchEvent('quit');
	}
}
LSScriptWindow.counter = 1;