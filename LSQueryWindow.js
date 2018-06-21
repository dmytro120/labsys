'use strict';

class LSQueryWindow extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		// Read Info
		this.info = {};
		var infoJSON = localStorage.getItem('LSQueryWindow');
		try {
			var info = JSON.parse(infoJSON);
			if (info && info != null) this.info = info;
		}
		catch (e) {}
		if (!('pages' in this.info)) this.info.pages = {};
		if (Object.keys(this.info.pages) < 1) this.info.pages.default = '';
		if (!('listWidth' in this.info)) this.info.listWidth = '260px';
		if (!('editorHeight' in this.info)) this.info.editorHeight = '50%';
		if (!('leftPaneVisible' in this.info)) this.info.leftPaneVisible = true;
		if (!('editorVisible' in this.info)) this.info.editorVisible = true;
		
		// Main Grid
		this.grid = new ACFlexGrid(this.rootNode, { rowHeights:['10px', 'auto', '36px'], colWidths:[this.info.listWidth, 'auto'] });
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
		
		this.grid.cell(1,0).style.borderRight = '1px solid #ddd';
		this.grid.cell(1,0).style.verticalAlign = 'top';
		
		this.upCtrl = AC.create('input', modeToolBar);
		this.upCtrl.accept = ".sql,.json";
		this.upCtrl.type = 'file';
		this.upCtrl.style.display = 'none';
		this.upCtrl.addEventListener('change', this.importFile.bind(this));
		
		this.listContainer = new ACStaticCell(this.grid.cell(1,0));
		this.listContainer.style.height = '100%';
		this.listContainer.style.overflow = 'auto';
		this.listContainer.lastScrollTop = 0;
		this.listContainer.onscroll = evt => this.listContainer.lastScrollTop = this.listContainer.scrollTop;
		
		this.structTV = new ACTreeView(this.grid.cell(1,0));
		this.structTV.lastScrollTop = 0;
		this.structTV.onscroll = evt => {
			this.structTV.lastScrollTop = this.structTV.scrollTop;
			if (this.popOver) this.popOver.close();
		}

		this.listBox = new ACListBox(this.listContainer);
		this.listBox.classList.add('scriptlist');
		this.listBox.setRearrangeable(true);
		this.listBox.addEventListener('itemSelected', this.selectItem.bind(this));
		this.listBox.addEventListener('itemAdded', e => {
			var item = e.detail.item;
			item.contextMenu = {
				'Rename': this.renameItem.bind(this, item),
				'Export': this.exportPage.bind(this, item),
				'Remove': this.removeItem.bind(this, item)
			};
			item.contextMenuScrollDismisser = this.listContainer;
			item.addEventListener('contextmenu', ACContextMenu.open);
		});
		this.listBox.contextMenu = {
			'Export All': this.exportAll.bind(this),
			'Import...': () => this.upCtrl.click()
		};
		this.listBox.contextMenuScrollDismisser = this.listContainer;
		this.listBox.addEventListener('contextmenu', ACContextMenu.open);
		
		var modeActionBar = new ACToolBar(this.grid.cell(2,0));
		modeActionBar.setStyle(ST_BORDER_TOP | ST_BORDER_RIGHT);
		modeActionBar.setRadio(true);
		modeActionBar.setItems([
			{symbol:'list', caption:'List', targetNode: this.listContainer},
			{symbol:'equalizer', caption:'Structure', targetNode: this.structTV}
		]);
		modeActionBar.setActiveItem(modeActionBar.firstChild.firstChild);
		
		
		// Right
		this.itemToolBar = new ACToolBar(this.grid.cell(0,1), { type: 'secondary' });
		this.itemToolBar.classList.add('ls-toolbar');
		this.itemToolBar.setStyle(ST_BORDER_BOTTOM);
		this.itemToolBar.style.borderBottomColor = '#17817b';
		this.itemToolBar.addItem(
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) }
		);
		this.runButton = this.itemToolBar.addItem(
			{caption: 'Run Current', icon: 'play.png', tooltip: 'Run (⌘↵)', action: this.runQuery.bind(this) }
		);
		this.copyButton = this.itemToolBar.addItem(
			{caption: 'Copy Table', icon: 'copy.png', action: this.copyResults.bind(this) }
		);
		var caption = 'Run All to XLSX';
		this.xlsxButton = this.itemToolBar.addItem(
			{caption: caption, icon: 'xlsx.png', dataset: { caption: caption }, action: this.prepareXLSX.bind(this) }
		);
		this.itemToolBar.firstChild.firstChild.style.display = 'none';
		
		this.itemGrid = new ACFlexGrid(this.grid.cell(1,1), { rowHeights:[this.info.editorHeight, 'auto'], colWidths:['100%'] });
		this.itemGrid.addSizer(0, AC_DIR_HORIZONTAL);
		
		var topCell = this.itemGrid.cell(0,0);
		topCell.style.paddingTop = '6px';
		this.editor = ace.edit(topCell);
		this.editor.$blockScrolling = Infinity;
		this.editor.setTheme("ace/theme/xcode");
		this.editor.getSession().setMode("ace/mode/sql");
		this.editor.renderer.setShowGutter(false);
		this.editor.setShowPrintMargin(false);
		this.editor.setHighlightActiveLine(false);
		this.editor.setFontSize(14);
		this.editor.getSession().setUseSoftTabs(false);
		this.editor.onPaste = (e,t) => {
			if (t.clipboardData.types.length == 4) {
				// Dareth Excel format detected
				var entries = LSQueryWindowTools.arrayFromCSV(e);
				e = '';
				for (var n = 0; n < entries.length; n++) {
					var entry = entries[n][0];
					if (entry.length > 0) e += entry.trim() + ';\r\n\r\n';
				}
				e = e.trim();
			}
			var n={text:e,event:t};
			this.editor.commands.exec("paste",this.editor,n);
		}
		//this.editor.style.borderBottom = '1px solid #ddd';
		this.itemGrid.addEventListener('layoutChanged', e => {
			this.editor.resize(true);
		});
		/*var preText = localStorage.getItem("LSQueryWindowText");
		if (preText) this.editor.setValue(preText, -1);
		this.editor.on("input", evt => {
			localStorage.setItem("LSQueryWindowText", this.editor.getValue());
		});*/
		this.editor.setReadOnly(true);
		this.editor.renderer.$cursorLayer.element.style.display = 'none';
		
		this.resultContainer = AC.create('div', this.itemGrid.cell(1,0));
		this.resultContainer.style.width = '100%';
		this.resultContainer.style.maxWidth = '100%';
		this.resultContainer.style.height = '100%';
		this.resultContainer.style.overflow = 'auto';
		this.resultContainer.style.borderTop = '1px solid #ddd';
		this.resultContainer.style.marginTop = '-3px';
		
		var itemActionBar = new ACToolBar(this.grid.cell(2,1));
		itemActionBar.setStyle(ST_BORDER_TOP);
		itemActionBar.setItems([
			{icon:'pane-reset.png', tooltip:'Reset Layout', action:this.resetLayout.bind(this)},
			{icon:'pane-left.png', tooltip:'Toggle List', action:this.togglePane.bind(this)},
			{icon:'pane-top.png', tooltip:'Toggle Editor', action:this.toggleEditor.bind(this)}
		]);
		
		// Populate structure
		this.enableQueryControls(false);
		DB.query('structure/A/', structure => {
			this.enableQueryControls(true);
			for (var tableName in structure) {
				var tableNode = this.structTV.add(tableName, 'table.png');
				tableNode.setAction(this.displayTableInfo.bind(this, tableNode, tableName));
				tableNode.children[1].setAttribute('draggable', true);
				tableNode.children[1].addEventListener('dragstart', e => {
					e.dataTransfer.setData("Text", e.target.textContent);
				});
				structure[tableName].forEach(colInfo => {
					var colNode = tableNode.add(colInfo.column_name, 'field.png');
					colNode.setAction(this.displayColumnInfo.bind(this, colNode, tableName, colInfo));
					colNode.children[1].setAttribute('draggable', true);
					colNode.children[1].addEventListener('dragstart', e => {
						e.dataTransfer.setData("Text", e.target.textContent);
					});
				});
			}
		});
		
		this.togglePane(this.info.leftPaneVisible);
		this.toggleEditor(this.info.editorVisible);
		
		this.readPages();
	}
	
	readPages()
	{
		var lastActiveItemID = this.listBox.getSelectedItem() ? this.listBox.getSelectedItem().dataset.id : null;
		this.listBox.clear();
		var first = true;
		
		for (var name in this.info.pages) {
			var item = this.listBox.addItem(name, name);
			item.value = this.info.pages[name];
			if (first) {
				this.listBox.selectItem(item);
				first = false;
			}
		}
	}
	
	onAttached()
	{
		this.rootNode.appendChild(this.grid);
		this.listContainer.scrollTop = this.listContainer.lastScrollTop;
		this.structTV.scrollTop = this.structTV.lastScrollTop;
		if (this.resultContainerScrollTop) this.resultContainer.scrollTop = this.resultContainerScrollTop;
		this.editor.focus();
	}
	
	onDetached()
	{
		this.saveCurrentItem();
		this.resultContainerScrollTop = this.resultContainer.scrollTop;
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'new': this.createItem(); break;
			case 'open': this.openItem(); break;
			case 'save': this.saveCurrentItem(); break;
			case 'enter': this.runQuery(); break;
			case 'layout': this.resetLayout(); break;
			case 'eof': this.exit(); break;
		}
	}
	
	writeInfo()
	{
		this.info.pages = {};
		Array.from(this.listBox.children).forEach(item => {
			this.info.pages[item.dataset.id] = item.value;
		});
		
		this.info.listWidth = this.grid.cell(0,0).style.width;
		this.info.editorHeight = this.itemGrid.cell(0,0).style.height;
		
		localStorage.setItem('LSQueryWindow', JSON.stringify(this.info));
	}
	
	exportPage(item)
	{
		var selectedItem = this.listBox.getSelectedItem();
		if (item == selectedItem) item.value = this.editor.getValue();
		
		var element = AC.create('a', this.rootNode);
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(item.value));
		element.setAttribute('download', item.dataset.id + '.sql');
		element.style.display = 'none';
		element.click();
		element.remove();
	}
	
	exportAll()
	{
		this.saveCurrentItem();
		
		var element = AC.create('a', this.rootNode);
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.info.pages, null, '\t')));
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
		
		if (!['sql', 'json'].includes(extension)) {
			alert('Unable to import unrecognised file format.');
			return;
		}
		
		var fileReader = new FileReader();
		fileReader.onload = () => {
			var fileContents = fileReader.result;
			if (extension == 'sql') {
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
				alert('Imported ' + importCount + ' pages.');
			}
		};
		fileReader.onerror = e => {
			alert('Unable to read file.');
		};
		fileReader.readAsText(file);
		this.upCtrl.value = '';
	}
	
	selectItem(evt)
	{
		var lastItem = evt.detail.lastItem;
		if (lastItem) lastItem.value = this.editor.getValue();
		
		var item = evt.detail.item;
		if (item == lastItem) return;
		
		this.editor.session.setValue(item.value, -1);
		this.editor.setReadOnly(false);
		this.editor.renderer.$cursorLayer.element.style.display = "";
		
		this.resultContainer.clear();
		this.spreadsheet = null;
		
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
		var name = 'new ' + LSQueryWindow.counter;
		while (this.listBox.getItemByName(name)) {
			LSQueryWindow.counter++;
			name = 'new ' + LSQueryWindow.counter;
		}
		var item = this.listBox.addItem(name, name);
		item.value = '';
		this.listBox.selectItem(item);
		LSQueryWindow.counter++;
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
	
	renameItem(item)
	{
		this.listBox.renameItem(item);
	}
	
	removeItem(item)
	{
		var selectedItem = this.listBox.getSelectedItem();
		if (item && confirm('Query page ' + item.dataset.id + ' will be removed.')) {
			item.remove();
			if (item == selectedItem) {
				this.editor.session.setValue('', -1);
				this.editor.setReadOnly(true);
				this.editor.renderer.$cursorLayer.element.style.display = 'none';
				this.resultContainer.clear();
				this.spreadsheet = null;
			}
		}
	}
	
	enableQueryControls(visible)
	{
		if (visible) {
			this.runButton.classList.remove('disabled');
			this.xlsxButton.classList.remove('disabled');
			this.copyButton.classList.remove('disabled');
		} else {
			this.runButton.classList.add('disabled');
			this.xlsxButton.classList.add('disabled');
			this.copyButton.classList.add('disabled');
		}
	}
	
	runQuery()
	{
		var item = this.listBox.activeItem;
		if (!item) return;
		
		var queriesString = (typeof ace !== 'undefined' ? this.editor.getValue() : this.editor.value);
		var curPos = this.editor.session.doc.positionToIndex(this.editor.getCursorPosition());
		var semicolonRegex = /(;|--|\n)(?=(?:[^']|'[^']*')*$)/g;
		var startPos = 0;
		var endPos = queriesString.length;
		var inComment = false;
		var match;
		while (match = semicolonRegex.exec(queriesString)) {
			if (match[0] == '--') {
				inComment = true;
			} else if (match[0] == '\n') {
				inComment = false;
			} else if (match[0] == ';' && !inComment) {
				var strPos = match.index;
				if (curPos > strPos) startPos = strPos + 1;
				if (strPos >= curPos) {
					endPos = strPos;
					break;
				}
			}
		}
		
		this.resultContainer.clear();
		this.spreadsheet = null;
		
		var query = queriesString.substring(startPos, endPos).trim();
		if (!query) return;
		
		this.enableQueryControls(false);
		
		// fix control jump issue
		var cr = this.itemGrid.cell(0,0).getBoundingClientRect();
		this.itemGrid.cell(0,0).style.minHeight = this.itemGrid.cell(0,0).style.height = cr.height + 'px';
		
		DB.query(query, (rows, info) => {
			
			if (!('colHeadings' in info) || !('numRows' in info)) return;
			
			if (info.colHeadings.length < 1) {
				var infoCell = new ACStaticCell(this.resultContainer);
				infoCell.style.textAlign = 'center';
				infoCell.style.padding = '8px';
				infoCell.textContent = info.numRows + ' rows impacted';
				return;
			}
			
			if (rows.length > 0 && rows.length <= 100) {
				this.spreadsheet = canvasDatagrid({
					parentNode: this.resultContainer,
					editable: false,
					autoResizeColumns: true
				});
				this.spreadsheet.style.width = this.spreadsheet.style.height = '100%';
				this.spreadsheet.style.cellBorderWidth = 1;
				this.spreadsheet.data = rows;
				this.spreadsheet.schema.forEach(header => {
					header.title = header.name != header.name.toLowerCase() ? header.name : header.name.toUpperCase();
				});
			} else {
				this.spreadsheet = null;
				var table = AC.create('table', this.resultContainer);
				table.classList.add('table', 'table-hover', 'table-condensed');
				table.style.width = 'auto';
				table.style.margin = '0 auto';
				
				var tbody = AC.create('tbody', table);
				var tr = AC.create('tr', tbody);
				info.colHeadings.forEach(heading => {
					var th = AC.create('th', tr);
					th.textContent = heading == heading.toLowerCase() ? heading.toUpperCase() : heading;
				});
				
				rows.forEach(row => {
					tr = AC.create('tr', tbody);
					for (var key in row) {
						var value = row[key];
						if (value == null) value = "";
						var td = AC.create('td', tr);
						td.textContent = value;
					}
				});
			}
			
		}, null, evt => {
			this.enableQueryControls(true);
		});
	}
	
	prepareXLSX()
	{
		if (!confirm('WARNING: All queries on this page will be executed.')) return;
		
		var item = this.listBox.activeItem;
		if (!item) return;
		
		var queries = ((typeof ace !== 'undefined' ? this.editor.getValue() : this.editor.value).split(';')).filter(function(value) {
			return value.trim().length > 0;
		});
		var queryCount = queries.length;
		if (queryCount < 1) return;
		
		this.enableQueryControls(false);
		this.xlsxButton.firstChild.textContent = '0/'+queryCount;
		var datasets = [];
		var colInfo = [];
		this.labels = [];
		var counter = 0;
		var errorCount = 0;
		
		for (var q = 0; q < queryCount; q++) {
			var query = queries[q].trim();
			var found = query.match(/-- QRY(.*)/i);
			var wsName = found && found.length > 1 ? found[1] : 'Q'+q;
			var quotPos = wsName.indexOf('"');
			if (quotPos > -1) wsName = wsName.substring(0, quotPos);
			var firstChr = wsName.charAt(0);
			if (firstChr == '-') wsName = wsName.substring(1);
			this.labels[q] = wsName.length > 0 ? wsName : 'Q'+q;
			DB.query(query, function(dataset, info, q) {
				datasets[q] = dataset;
				colInfo[q] = 'colHeadings' in info ? info.colHeadings : [];
			}, function(error, q) {
				datasets[q] = [
					{
						Error: error
					}
				];
				colInfo[q] = ['Error'];
				errorCount++;
			}, (q) => {
				counter++;
				this.xlsxButton.firstChild.textContent = counter+'/'+queryCount;
				if (counter == queryCount) {
					this.enableQueryControls(true);
					this.xlsxButton.firstChild.textContent = this.xlsxButton.dataset.caption;
					if (errorCount > 0) alert(errorCount + ' ' + (errorCount > 1 ? 'errors' : 'error') + ' encountered. See export file for more info.');
					this.generateXLSX(datasets, colInfo, item.dataset.id);
				}
			}, q);
		}
	}
	
	generateXLSX(datasets, colInfo, outputFileName)
	{
		function Workbook() {
			this.SheetNames = [];
			this.Sheets = {};
		}
		var wb = new Workbook();
		
		for (var d = 0; d < datasets.length; d++) {
			var dataset = datasets[d];
			var ws_name = this.labels[d] ? this.labels[d] : "Sheet " + d;
			if (dataset != null) {
				var data = [];
				
				var headerRow = [];
				for (var m = 0; m < colInfo[d].length; m++) {
					let caption = colInfo[d][m] != colInfo[d][m].toLowerCase() ? colInfo[d][m] : colInfo[d][m].toUpperCase();
					headerRow.push(caption);
				}
				data.push(headerRow);
				
				for (var r = 0; r < dataset.length; r++) {
					var row = dataset[r];
					var values = Object.values(row);
					data.push(values);
				}
				//var data = [[1,2,3],[true, false, null, "sheetjs"],["foo","bar",new Date("2014-02-19T14:30Z"), "0.3"], ["baz", null, "qux"]]
				var ws = LSQueryWindowTools.sheetFromArrayOfArrays(data);
				wb.SheetNames.push(ws_name);
				wb.Sheets[ws_name] = ws;
			}
		}
		
		var wbout = XLSX.write(wb, {bookType:'xlsx', bookSST:true, type: 'binary'});
		//var outputFileName = Math.floor(Date.now() / 1000).toString();
		saveAs(new Blob([LSQueryWindowTools.arrayBufferFromString(wbout)],{type:"application/octet-stream"}), outputFileName + ".xlsx");
	}
	
	copyResults()
	{
		if (this.spreadsheet) {
			var csv = LSQueryWindowTools.toCsv(this.spreadsheet.data, '"', String.fromCharCode(9));
			console.log(csv);
			navigator.clipboard.writeText(csv)
			.then(() => {
				
			})
			.catch(err => {
				console.log('Something went wrong', err);
			});
			return;
		}
		
		var resultTable = this.resultContainer.firstChild;
		if (!resultTable) return;
		
		var range = document.createRange();
		range.selectNode(resultTable);
		
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
		
		document.execCommand('copy');
		sel.removeAllRanges();
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
		this.info.listWidth = this.grid.cell(0,0).style.width = '260px';
		this.info.editorHeight = this.itemGrid.cell(0,0).style.height = '50%';
		this.togglePane(true);
		this.toggleEditor(true);
		this.editor.resize(true);
	}
	
	displayTableInfo(tableNode, tableName)
	{
		var oldSCScrollTop = this.structTV.lastScrollTop;
		DB.query(`
			SELECT *
			FROM table_master
			WHERE name = '${tableName}'
		`, rows => {
			if (rows.length < 1) return;
			var tableInfo = rows[0];
			
			var container = new ACStaticCell();
			var htmlTable = AC.create('table', container);
			htmlTable.classList.add('table', 'table-striped');
			htmlTable.style.marginBottom = '0';
			
			for (var key in tableInfo) {
				var value = tableInfo[key];
				if (key == 'name' || !value) continue;
				var htmlRow = AC.create('tr', htmlTable);
				var htmlCell = AC.create('th', htmlRow);
				htmlCell.textContent = key.toUpperCase();
				var htmlCell = AC.create('td', htmlRow);
				htmlCell.textContent = value;
			}
			
			var link = tableNode.children[1];
			if (document.activeElement != link || this.structTV.lastScrollTop != oldSCScrollTop) return;
			link.dataset.content = container.innerHTML;
			this.popOver = new Popover(link, {trigger: ' ', placement: 'right', duration: 0});
			this.popOver.toggle();
		});
	}
	
	displayColumnInfo(colNode, tableName, colInfo)
	{
		var oldSCScrollTop = this.structTV.lastScrollTop;
		var colName = colInfo.column_name;
		DB.query(`
			SELECT *
			FROM field_master
			WHERE table_name = '${tableName}'
			AND field_name = '${colName}' 
		`, rows => {
			var comboColInfo = rows.length > 0 ? Object.assign(colInfo, rows[0]) : colInfo;
			
			var container = new ACStaticCell();
			var htmlTable = AC.create('table', container);
			htmlTable.classList.add('table', 'table-striped');
			htmlTable.style.marginBottom = '0';
			
			for (var key in comboColInfo) {
				var value = comboColInfo[key];
				if (
					(key[0] == 's' && key[1] == 's') || 
					['table_name', 'field_name', 'column_name'].includes(key) ||
					!value
				) continue;
				var htmlRow = AC.create('tr', htmlTable);
				var htmlCell = AC.create('th', htmlRow);
				htmlCell.textContent = key.toUpperCase();
				var htmlCell = AC.create('td', htmlRow);
				htmlCell.textContent = value;
			}
			
			var link = colNode.children[1];
			if (document.activeElement != link || this.structTV.lastScrollTop != oldSCScrollTop) return;
			link.dataset.content = container.innerHTML;
			this.popOver = new Popover(link, {trigger: ' ', placement: 'right', duration: 0});
			this.popOver.toggle();
		});
	}
	
	exit()
	{
		this.dispatchEvent('quit');
	}
}
LSQueryWindow.counter = 1;

class LSQueryWindowTools
{
	static dateNumFromDate(v, date1904)
	{
		if(date1904) v+=1462;
		var epoch = Date.parse(v);
		return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
	}
	
	static sheetFromArrayOfArrays(data, opts)
	{
		var ws = {};
		var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
		for(var R = 0; R != data.length; ++R) {
			for(var C = 0; C != data[R].length; ++C) {
				if(range.s.r > R) range.s.r = R;
				if(range.s.c > C) range.s.c = C;
				if(range.e.r < R) range.e.r = R;
				if(range.e.c < C) range.e.c = C;
				var cell = {v: data[R][C] };
				if(cell.v == null) continue;
				var cell_ref = XLSX.utils.encode_cell({c:C,r:R});
				
				if(typeof cell.v === 'number') cell.t = 'n';
				else if(typeof cell.v === 'boolean') cell.t = 'b';
				else if(cell.v instanceof Date) {
					cell.t = 'n'; cell.z = XLSX.SSF._table[14];
					cell.v = LSQueryWindowTools.dateNumFromDate(cell.v);
				}
				else cell.t = 's';
				
				ws[cell_ref] = cell;
			}
		}
		if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
		return ws;
	}
	
	static arrayBufferFromString(s)
	{
		var buf = new ArrayBuffer(s.length);
		var view = new Uint8Array(buf);
		for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
		return buf;
	}
	
	static arrayFromCSV(strData, strDelimiter) {
        // Check to see if the delimiter is defined. If not,
        // then default to comma.
        strDelimiter = (strDelimiter || "	");

        // Create a regular expression to parse the CSV values.
        var objPattern = new RegExp(
            (
                // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                // Standard fields.
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
            );


        // Create an array to hold our data. Give the array
        // a default empty first row.
        var arrData = [[]];

        // Create an array to hold our individual pattern
        // matching groups.
        var arrMatches = null;


        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        while (arrMatches = objPattern.exec( strData )){

            // Get the delimiter that was found.
            var strMatchedDelimiter = arrMatches[ 1 ];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (
                strMatchedDelimiter.length &&
                strMatchedDelimiter !== strDelimiter
                ){

                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push( [] );

            }

            var strMatchedValue;

            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[ 2 ]){

                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                strMatchedValue = arrMatches[ 2 ].replace(
                    new RegExp( "\"\"", "g" ),
                    "\""
                    );

            } else {

                // We found a non-quoted value.
                strMatchedValue = arrMatches[ 3 ];

            }


            // Now that we have our value string, let's add
            // it to the data array.
            arrData[ arrData.length - 1 ].push( strMatchedValue );
        }

        // Return the parsed data.
        return( arrData );
    }
	
	/**
	* Converts a value to a string appropriate for entry into a CSV table.  E.g., a string value will be surrounded by quotes.
	* @param {string|number|object} theValue
	* @param {string} sDelimiter The string delimiter.  Defaults to a double quote (") if omitted.
	*/
	static toCsvValue(theValue, sDelimiter) {
		var t = typeof theValue;
		var output;

		if (typeof (sDelimiter) === "undefined" || sDelimiter === null) {
			sDelimiter = '"';
		}

		if (theValue == null || t === "undefined" || t === null) {
			output = "";
		} else if (t === "string") {
			output = sDelimiter + theValue + sDelimiter;
		} else {
			output = String(theValue);
		}

		return output;
	}

	/**
	* Converts an array of objects (with identical schemas) into a CSV table.
	* @param {Array} objArray An array of objects.  Each object in the array must have the same property list.
	* @param {string} sDelimiter The string delimiter.  Defaults to a double quote (") if omitted.
	* @param {string} cDelimiter The column delimiter.  Defaults to a comma (,) if omitted.
	* @return {string} The CSV equivalent of objArray.
	*/
	static toCsv(objArray, sDelimiter, cDelimiter) {
		var i, l, names = [], name, value, obj, row, output = "", n, nl;

		// Initialize default parameters.
		if (typeof (sDelimiter) === "undefined" || sDelimiter === null) {
			sDelimiter = '"';
		}
		if (typeof (cDelimiter) === "undefined" || cDelimiter === null) {
			cDelimiter = ",";
		}

		for (i = 0, l = objArray.length; i < l; i += 1) {
			// Get the names of the properties.
			obj = objArray[i];
			row = "";
			if (i === 0) {
				// Loop through the names
				for (name in obj) {
					if (obj.hasOwnProperty(name)) {
						names.push(name);
						var title = name != name.toLowerCase() ? name : name.toUpperCase();
						row += [sDelimiter, title, sDelimiter, cDelimiter].join("");
					}
				}
				row = row.substring(0, row.length - 1);
				output += row;
			}

			output += "\n";
			row = "";
			for (n = 0, nl = names.length; n < nl; n += 1) {
				name = names[n];
				value = obj[name];
				if (n > 0) {
					row += cDelimiter
				}
				row += LSQueryWindowTools.toCsvValue(value, '"');
			}
			output += row;
		}

		return output;
	}
}