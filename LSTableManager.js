'use strict';

class LSTableManager extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		this.grid = new ACFlexGrid(this.rootNode, { rowHeights:['auto', '40px'], colWidths:['20%', '80%'] });
		this.grid.addSizer(0, AC_DIR_VERTICAL);
		
		this.itemType = 'ANALYSIS';
		this.keyFields = ['NAME', 'VERSION'];
		
		var listContainer = new ACStaticCell(this.grid.cell(0,0));
		listContainer.style.height = '100%';
		listContainer.style.overflow = 'auto';
		this.grid.cell(0,0).style.borderRight = '1px solid #ddd';
		this.lcScrollTop = null;
		listContainer.onscroll = function(evt) { this.lcScrollTop = listContainer.scrollTop }.bind(this);

		this.listBox = new ACListBox(listContainer);
		//this.listBox.setStyle(ST_BORDER_RIGHT);
		//this.listBox.style.height = this.grid.cell(0,0).height; // added 09.12.2016
		this.listBox.addEventListener('itemSelected', this.selectItem.bind(this));
		
		// Item List Actions
		var ab = new ACActionBar(this.grid.cell(1,0));
		ab.setStyle(ST_BORDER_TOP | ST_BORDER_RIGHT);
		ab.setItems([
			//{symbol:'plus', caption:'New Entry', action:this.createItem.bind(this)},
			{symbol:'th', caption:'Open Table', action:this.selectTable.bind(this)},
			{symbol:'refresh', caption:'Reload List', action:this.loadData.bind(this)},
			{symbol:'folder-open', caption:'Open Entry', action:this.openItem.bind(this)},
			{symbol:'step-backward', caption:'Previous Record', action:this.recPrevious.bind(this)},
			{symbol:'step-forward', caption:'Next Record', action:this.recNext.bind(this)}
		]);
		
		this.grid.cell(0,1).style.verticalAlign = 'top';
		
		// Current Item Actions
		this.vb = new ACActionBar(this.grid.cell(1,1));
		this.vb.setStyle(ST_BORDER_TOP);
		this.vb.setRadio(true);
		/*this.vb.setItems([
			{symbol:'save', caption:'Save Entry', action:this.saveItem.bind(this)},
			{symbol:'remove', caption:'Remove Entry', action:this.removeItem.bind(this)},
			{symbol:'auditHistory.bmp', caption:'View History', action:null}
		]);*/
		
		// MarvinJS experimental implementation
		var iframe = AC.create('iframe', this.grid.cell(1,1));
		iframe.style.display = 'none';
		iframe.style.width = iframe.style.height = '1px';
		iframe.src = 'pkg/marvin/marvinpack.html';
		iframe.addEventListener('load', evt => {
			try {
				var marvin = iframe.contentWindow.marvin;
				marvin.onLoad = evt => {
					var params = {
						'imageType': 'image/png',
						'settings': {
							'carbonLabelVisible' : false,
							'cpkColoring' : true,
							'chiralFlagVisible': true,
							'lonePairsVisible' : false,
							'lonepaircalculationenabled' : false,
							'atomIndicesVisible': false,
							'implicitHydrogen' : 'TERMINAL_AND_HETERO',
							'displayMode' : 'WIREFRAME',
							'background-color': '#ffffff',
							'zoomMode' : 'fit',
							'width' : 200//,
							//'height' : 200
						},
						'inputFormat': 'mol', //'smiles',
						'services': {
							//molconvertws: 'http://marvinjs-demo.chemaxon.com/webservices2/rest-v0/util/calculate/molExport',
							//stereoinfows: 'http://marvinjs-demo.chemaxon.com/webservices2/rest-v0/util/calculate/cipStereoInfo'
						}
					}
					this.marvinExporter = new marvin.ImageExporter(params);
				};
			} catch(error) {
				//console.warn('Marvin not initialised');
			}
		});
	}
	
	onAttached()
	{
		this.rootNode.appendChild(this.grid);
		this.loadData();
	}
	
	loadData(thenFn)
	{
		if (this.lcScrollTop !== null) this.listBox.parentElement.scrollTop = this.lcScrollTop;
		
		DB.query("SELECT DISTINCT "+ this.keyFields[0] +" \"id\", "+ this.keyFields[0] +" \"name\" FROM "+this.itemType+" ORDER BY 1", rows => {
			var lastActiveItemID = this.listBox.getSelectedItem() ? this.listBox.getSelectedItem().dataset.id : null;
			var wasSameItemFound = false;
			this.listBox.clear();
			rows.forEach(row => {
				var item = this.listBox.addItem(row.id, row.name);
				if (row.id == lastActiveItemID) {
					item.classList.add('active');
					this.listBox.activeItem = item;
					wasSameItemFound = true;
				}
			});
			
			if (!wasSameItemFound && Array.from(this.grid.cell(0,1).children).length > 1) this.grid.cell(0,1).lastChild.remove();
			//else console.log('TODO: Redraw item in 0,1');
			
			if (typeof thenFn !== 'undefined' && typeof thenFn.constructor == 'Function') thenFn();
		});
		
		this.vb.clearItems();
		DB.query("\
			SELECT name, pretty_name \
			FROM table_master \
			WHERE '" + this.itemType + "' IN (name, parent_table) \
			ORDER BY (CASE WHEN parent_table IS NULL THEN 0 ELSE 1 END), pretty_name", 
		subrows => {
			subrows.forEach(subrow => {
				var item = this.vb.addItem({caption: subrow.pretty_name});
				if (this.vb.itemCount() == 1) this.vb.setActiveItem(item);
			});
		});
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'move': this.selectTable(); break;
			case 'new': this.createItem(); break;
			case 'open': this.openItem(); break;
			case 'save': this.saveItem(); break;
			case 'eof': this.exit(); break;
		}
	}
	
	selectTable()
	{
		DB.query("\
			SELECT name \"id\", pretty_name \"name\", key_fields \"key_fields\" \
			FROM table_master \
			WHERE uses_editor = 'T' \
			ORDER BY \"name\" \
		", rows => {
			var dialog = new ACSelectDialog(document.body);
			dialog.setTitle('Select Table');
			
			rows.forEach(row => {
				var item = dialog.addItem(row.name, row.id);
				item.dataset.keyFields = row.key_fields;
			});
			
			dialog.addEventListener('open', evt => {
				this.itemType = evt.detail.id;
				this.keyFields = evt.detail.keyFields.split(' ');
				dialog.close();
				if (Array.from(this.grid.cell(0,1).children).length > 1) this.grid.cell(0,1).lastChild.remove();
				this.lcScrollTop = 0;
				this.loadData();
			});
			
			dialog.display();
			dialog.focus();
		});
	}
	
	selectItem(evt)
	{
		var item = evt.detail.item;
		if (Array.from(this.grid.cell(0,1).children).length > 1) this.grid.cell(0,1).lastChild.remove();
		
		DB.query("\
			SELECT * \
			FROM "+this.itemType+" x \
			WHERE "+ this.keyFields[0] +" = '" + item.dataset.id + "' \
			" + (this.keyFields.includes('VERSION') ? "AND version = (SELECT version FROM versions WHERE table_name = '" + this.itemType + "' AND name = x.name)" : "") + " \
		", rows => {
			if (rows.length < 1) {
				if (Array.from(this.grid.cell(0,1).children).length > 1) this.grid.cell(0,1).lastChild.remove();
				var sc = new ACStaticCell(this.grid.cell(0,1));
				sc.textContent = this.itemType + ' ' + item.dataset.id + ' not found in current database';
				sc.style.color = 'red';
				return;
			}
			DB.query("\
				SELECT fm.field_name, fm.link_table, ltm.key_fields, ltm.description_fields, fm.data_type, fm.hidden, fm.list_key, \
					(CASE WHEN ft.field_name IS NOT NULL THEN 'T' ELSE 'F' END) FT_EXISTS, ft.group_title, ft.field_label \
				FROM field_master fm \
				LEFT JOIN table_template tt ON tt.template_table = fm.table_name AND tt.removed = 'F' \
				LEFT JOIN table_temp_fields ft ON tt.name = ft.template AND fm.field_name = ft.field_name AND ft.entry_mode = 'USERENTRY' \
				LEFT JOIN table_master ltm ON ltm.name = fm.link_table \
				WHERE fm.table_name = '" + this.itemType + "' AND fm.hidden = 'F' AND fm.field_name NOT IN ('NAME', 'CHANGED_BY', 'CHANGED_ON', 'REMOVED') \
				ORDER BY (CASE WHEN ft.group_title IS NULL THEN 0 ELSE 1 END), ft.group_title, ft.order_number \
			", schemaRows => {
				if (Array.from(this.grid.cell(0,1).children).length > 1) this.grid.cell(0,1).lastChild.remove();
				
				// Item Info and Details FlexGrid
				var itemInfoAndDetailsGrid = new ACFlexGrid(this.grid.cell(0,1), { rowHeights:['40px', 'auto'], colWidths:['100%'] });
				
				/*// MenuBar
				var nb = new ACMenuBar(itemInfoAndDetailsGrid.cell(0,0));
				nb.classList.add('lighter');
				nb.setStyle(ST_BORDER_BOTTOM);
				//nb.setHeading('dima', null);
				nb.style.borderBottomColor = 'gray';
				nb.setItems({
					'Table Manager': {
						'Select Table...': this.selectTable.bind(this),
						'Exit': this.exit.bind(this)
					},
					'File': {
						//'New...': null
						'Open...': this.openItem.bind(this)
					},
					//'Approval': {
						//'View Approvals...': null
					//},
					//'Audit': {
						//'Assign Reason...': null
					//},
					'Record': {
						'Previous': this.recPrevious.bind(this),
						'Next': this.recNext.bind(this)
					}
				});
				
				var tb = new ACToolBar(itemInfoAndDetailsGrid.cell(0,0));
				tb.classList.add('lighter');
				tb.setIconSize('20x20');
				tb.setStyle(ST_BORDER_BOTTOM);
				tb.style.borderBottomColor = 'gray';
				tb.setItems([
					{caption: 'Exit', icon: 'close.bmp', action: this.exit.bind(this) },
					{caption: 'Open Table', icon: 'tableButton.bmp', action: this.selectTable.bind(this) },
					{caption: 'Open Entry', icon: 'open.bmp', action: this.openItem.bind(this) },
					//{caption: 'New Entry', icon: 'newButton.bmp', action: this.createItem.bind(this) },
					//{caption: 'Save Entry', icon: 'saveButton.bmp', action: null },
					//{caption: 'Save Entry As', icon: 'saveAsButton.bmp', action: null },
					{caption: 'Previous Record', icon: 'previousButton.bmp', action: this.recPrevious.bind(this) },
					{caption: 'Next Record', icon: 'nextButton.bmp', action: this.recNext.bind(this) },
				]);*/
				
				// Item Info FlexGrid
				var itemInfoGrid = new ACFlexGrid(itemInfoAndDetailsGrid.cell(0,0), { rowHeights:['12px','auto','12px'], colWidths:['12px','6%','20%','10%','22%','10%','auto','12px'] }); //1
				itemInfoGrid.style.backgroundColor = 'rgb(176, 234, 231)';
				
				var c1 = itemInfoGrid.cell(1,1);
				(AC.create('b', c1)).textContent = 'Table:';
				AC.create('br', c1);
				(AC.create('b', c1)).textContent = 'Name:';
				
				var c2 = itemInfoGrid.cell(1,2);
				(AC.create('span', c2)).textContent = this.itemType;
				AC.create('br', c2);
				(AC.create('span', c2)).textContent = rows[0].name;
				
				var c3 = itemInfoGrid.cell(1,3);
				(AC.create('b', c3)).textContent = 'Changed By:';
				AC.create('br', c3);
				(AC.create('b', c3)).textContent = 'Changed On:';
				c3.style.whiteSpace = 'nowrap';
				
				var c4 = itemInfoGrid.cell(1,4);
				(AC.create('span', c4)).textContent = rows[0].changed_by;
				AC.create('br', c4);
				(AC.create('span', c4)).textContent = rows[0].changed_on;
				
				(AC.create('b', itemInfoGrid.cell(1,5))).textContent = 'Description:';
				
				/*var descTextArea = AC.create('textarea', itemInfoGrid.cell(1,6));
				descTextArea.value = rows[0].description;
				descTextArea.style.width = '100%';
				descTextArea.style.height = '100%';
				descTextArea.style.padding = '0';*/
				itemInfoGrid.style.borderBottom = '1px solid #ddd';
				itemInfoGrid.cell(1,6).textContent = rows[0].description;
				
				// Item Features Notebook
				/*var nb = new Notebook(itemInfoAndDetailsGrid.cell(2,0));
				nb.style.height = '100%';
				nb.style.overflow = 'auto';
				nb.setItems(['Info', 'Components']);*/
				
				// Item Features Pane
				var ifp = new ACStaticCell(itemInfoAndDetailsGrid.cell(1,0)); //2
				ifp.style.height = '100%';
				ifp.style.overflow = 'auto';
				
				// Item Details KeyValueView
				this.kvv = new ACKeyValueView(ifp);
				
				for (var s = 0; s < schemaRows.length; s++) {
					var groupTitle = schemaRows[s].ft_exists == 'T' && schemaRows[s].group_title != null ? schemaRows[s].group_title : 'Summary';
					var field = this.kvv.addField(groupTitle, schemaRows[s].field_label ? schemaRows[s].field_label : schemaRows[s].field_name);
					var value = rows[0][schemaRows[s].field_name.toLowerCase()] ? rows[0][schemaRows[s].field_name.toLowerCase()] : '';
					switch (schemaRows[s].data_type) {
						case 'Boolean':
							var control = new ACOnOffSwitch(field);
							control.name = schemaRows[s].field_name;
							control.value = (value == 'T');
						break;
						case 'List':
							if (schemaRows[s].list_key) {
								var control = new ACListInput(field);
								control.name = schemaRows[s].field_name;
								DB.query("\
									SELECT name, value \
									FROM list_entry \
									WHERE list = '" + schemaRows[s].list_key + "' \
									ORDER BY 1",
								function (listEntries, x, extra) {
									extra.control.addOption('', '');
									listEntries.forEach(entry => {
										var o = extra.control.addOption(entry.value, entry.name);
										if (entry.name == extra.value) o.selected = true;
									});
								}, null, null, {
									control: control,
									value: value
								});
								break;
							}
						case 'Text':
						case 'Integer':
						default:
							// Marvin Experimental Implementation START
							if (schemaRows[s].field_name == 'STRUCTURE' && this.marvinExporter) {
								var control = new ACStaticCell(field);
								control.name = schemaRows[s].field_name;
								control.value = value;
								this.marvinExporter.render(value).then(pngData => {
									field.previousSibling.style.lineHeight = '200px';
									var img = AC.create('img', control);
									img.src = pngData;
									img.style.display = 'inline';
								}, bad => {
									var info = AC.create('span', control);
									info.style.color = 'red';
									info.textContent = 'not renderable mol string';
								});
							}
							// Marvin Experimental Implementation END
							else if (!schemaRows[s].link_table) {
								var control = schemaRows[s].data_type == 'Integer' ? new ACNumberInput(field) : new ACTextInput(field);
								control.name = schemaRows[s].field_name;
								control.value = value;
							} else {
								var control = new ACBrowseInput(field);
								control.name = schemaRows[s].field_name;
								control.value = value;
								control.table = schemaRows[s].link_table;
								control.mainKeyField = schemaRows[s].key_fields.split(' ')[0];
								control.addEventListener('focusout', this.verifyField.bind(this));
								control.addEventListener('browse', this.browseLinkedItem.bind(this, {
									type: schemaRows[s].link_table, 
									keyFields: schemaRows[s].key_fields, 
									descFields:schemaRows[s].description_fields.trim()
								}));
							}
						break;
					}
				}
				
				// Subroutine Special Handling
				if (this.itemType == "SUBROUTINE") {
					ifp.clear();
					var srcContainer = new ACStaticCell(ifp);
					//srcContainer.style.borderTop = '1px solid #ddd';
					srcContainer.style.height = '100%';
					var srcCtrl = ace.edit(srcContainer);
					srcCtrl.$blockScrolling = Infinity;
					srcCtrl.setTheme("ace/theme/xcode");
					srcCtrl.getSession().setMode("ace/mode/vbscript");
					srcCtrl.renderer.setShowGutter(true);
					srcCtrl.setShowPrintMargin(false);
					srcCtrl.setHighlightActiveLine(false);
					srcCtrl.setFontSize(14);
					srcCtrl.getSession().setUseSoftTabs(false);
					srcCtrl.setValue(rows[0].source_code, -1);
				}
			});
		});
	}
	
	verifyField(evt)
	{
		if (!evt.srcElement.table || !evt.srcElement.mainKeyField) return;
		
		var value = evt.srcElement.value.toUpperCase();
		if (!value) return;
		
		DB.query("\
			SELECT " + evt.srcElement.mainKeyField + " \
			FROM " + evt.srcElement.table + " \
			WHERE " + evt.srcElement.mainKeyField + " LIKE '"+value+"%'", 
		rows => {
			if (rows.length < 1) evt.srcElement.value = "";
			else evt.srcElement.value = rows[0][evt.srcElement.mainKeyField.toLowerCase()];
		});
	}
	
	saveItem()
	{
		/*if (this.kvv) {
			var item = this.kvv.getItem();
			if ('id' in item) {
				var queryBits = [];
				for (var key in item) {
					if (key == 'id') continue;
					var value = item[key];
					switch(value.constructor) {
						default:
							queryBits.push(key + " = " + "'" + value.replace(/'/g, "\\'") + "'");
						break;
						case Boolean:
							queryBits.push(key + " = " + (value ? "1" : "0"));
						break;
					}
				}
				DB.query("UPDATE "+this.itemType+" SET " + queryBits.join() + " WHERE id = " + item.id, rows => {
					this.loadData();
				}, error => {
					alert(error);
				});
			}
		}*/
		alert('saveItem not implemented');
	}
	
	createItem()
	{
		/*DB.query("INSERT INTO "+this.itemType+" VALUES()", result => {
			this.loadData(e => {
				this.listBox.selectItem(this.listBox.getItemById(result.insertId));
			});
		}, error => {
			alert(error);
		});*/
		alert('createItem not implemented');
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
	
	browseLinkedItem(itemInfo, evt)
	{
		// itemInfo: {type:, keyFields:, descFields:}
		var control = evt.srcElement;
		var selFields = itemInfo.keyFields.split(' ').concat(itemInfo.descFields.split(' '));
		
		DB.query("\
			SELECT " + selFields.join(', ') + " \
			FROM " + itemInfo.type + " x "
			 + (selFields.includes('VERSION') ? "WHERE version = (SELECT version FROM versions WHERE table_name = '" + itemInfo.type + "' AND name = x.name)" : "") + "\
			ORDER BY 1"
		, rows => {
			var browser = new ACBrowseDialog(document.body);
			browser.setTitle(itemInfo.type);
			browser.setHeadings(selFields);
			
			rows.forEach(row => {
				var item = browser.addItem(row, row[itemInfo.keyFields.split(' ')[0]]);
				item.onclick = evt => {
					control.value = row[selFields[0].toLowerCase()];
					browser.close();
					control.focus();
				};
			});
			
			browser.addEventListener('close', evt => {
				control.focus();
			});
			
			browser.display();
			browser.focus();
		});
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
	
	removeItem()
	{
		/*var item = this.listBox.getSelectedItem();
		if (item && confirm("Item will be removed")) {
			DB.query("DELETE FROM "+this.itemType+" WHERE id = " + item.dataset.id, result => {
				this.loadData();
				var cell = this.grid.cell(0,1).clear();
			});
		}*/
		alert('Not implemented');
	}
	
	exit()
	{
		this.dispatchEvent('quit');
	}
}