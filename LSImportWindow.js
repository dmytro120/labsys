'use strict';

const INSERT_CLAUSE = 1;
const UPDATE_CLAUSE = 2;

const ORACLE = 1;
const MSSQL = 2;
const MYSQL = 4;

class LSImportWindow extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		// Read Info
		this.info = {};
		var infoJSON = localStorage.getItem('LSImportWindow');
		try {
			var info = JSON.parse(infoJSON);
			if (info && info != null) this.info = info;
		}
		catch (e) {}
		
		// Set Quotes
		if (!('dbType' in this.info) || ![ORACLE, MSSQL, MYSQL].includes(this.info.dbType)) this.info.dbType = ORACLE;
		this.setQuotes();
		
		// Table Presets & Defaults & Composite Parents
		if (!('skipTables' in this.info) || !Array.isArray(this.info.skipTables)) this.info.skipTables = [];
		if (!('doOnlyTables' in this.info) || !Array.isArray(this.info.doOnlyTables)) this.info.doOnlyTables = [];
		if (!('tableDefaults' in this.info)) this.info.tableDefaults = {};
		if (!('tableCompositeIDs' in this.info)) this.info.tableCompositeIDs = {};
		
		this.grid = new ACFlexGrid(this.rootNode, { rowHeights:['10px', 'auto', '36px'], colWidths:['100%'] });
		
		this.outputArea = new ACStaticCell(this.grid.cell(1,0));
		this.outputArea.style.width = this.outputArea.style.height = '100%';
		this.outputArea.style.overflow = 'auto';
		
		this.versionedMainTables = ['PRODUCT', 'ANALYSIS', 'T_PH_SAMPLE_PLAN'];
		
		var tb = new ACToolBar(this.grid.cell(0,0), { type: 'secondary' });
		tb.classList.add('ls-toolbar');
		tb.setStyle(ST_BORDER_BOTTOM);
		tb.style.borderBottomColor = '#17817b';
		tb.setItems([
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) },
			{caption: 'Open Workbook', icon: 'open.png', tooltip: 'Open (⌘O)', action: this.browseForWorkbook.bind(this) },
			{caption: 'Set DB Type', icon: 'db.png', action: this.setDBType.bind(this) },
			{caption: 'Set Skip Tables', icon: 'reject.png', action: this.setTables.bind(this, 'skipTables') },
			{caption: 'Set Do Only Tables', icon: 'select.png', action: this.setTables.bind(this, 'doOnlyTables') },
			{caption: 'Set Defaults', icon: 'defaults.png', action: this.setRules.bind(this, 'tableDefaults') },
			{caption: 'Set Composite IDs', icon: 'hierarchy.png', action: this.setRules.bind(this, 'tableCompositeIDs') },
			{caption: 'Kill Queue', icon: 'kill.png', action: this.killQueue.bind(this) },
			{caption: 'Clear Unchanged', icon: 'clear.png', action: this.clearUnchanged.bind(this) }
		]);
		
		var fileNameCtrl = new ACStaticCell(tb);
		fileNameCtrl.style.float = 'right';
		fileNameCtrl.style.lineHeight = '24px';
		fileNameCtrl.style.marginRight = '8px';
		
		this.upCtrl = AC.create('input', tb);
		this.upCtrl.type = 'file';
		this.upCtrl.style.display = 'none';
		this.upCtrl.addEventListener('change', e => {
			var file = this.upCtrl.files.item(0);
			if (!file) return;
			this.killQueue();
			fileNameCtrl.textContent = file.name;
			this.upCtrl.value = '';
			this.readFile(file);
		});
		
		// this.grid.cell(1,0) is contentarea
		// this.grid.cell(2,0) is tabbed area
		
		this.tabCtrl = new ACToolBar(this.grid.cell(2,0));
		this.tabCtrl.setStyle(ST_BORDER_TOP);
		this.tabCtrl.setRadio(true);
	}
	
	onAttached()
	{
		this.rootNode.appendChild(this.grid);
		if (this.contentContainerScrollTop) this.outputArea.scrollTop = this.contentContainerScrollTop;
	}
	
	onDetached()
	{
		this.contentContainerScrollTop = this.outputArea.scrollTop;
		this.writeInfo();
	}
	
	writeInfo()
	{
		localStorage.setItem('LSImportWindow', JSON.stringify(this.info));
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'eof': this.exit(); break;
			case 'open': this.browseForWorkbook(); break;
		}
	}
	
	exit()
	{
		this.dispatchEvent('quit');
	}
	
	setDBType()
	{
		var modal = new ACModal(document.body);
		modal.addHeader({ title: 'DB Type', closeButton: true });
		
		var contentCell = modal.addSection();
		var textInput = new ACListInput(contentCell);
		var dbTypes = {
			'ORACLE': ORACLE,
			'MSSQL': MSSQL,
			'MYSQL': MYSQL
		};
		for (var name in dbTypes) {
			var o = textInput.addOption(name, dbTypes[name]);
			if (dbTypes[name] == this.info.dbType) o.selected = true;
		}
		
		var handler = e => {
			this.info.dbType = parseInt(textInput.value);
			this.setQuotes();
		};
		
		modal.addEventListener('close', handler);
		textInput.addEventListener('enter', e => modal.close());
		
		modal.addFooter();
		modal.display();
		textInput.focus();
	}
	
	setQuotes()
	{
		this.quot = {
			L: this.info.dbType == ORACLE ? '"' : this.info.dbType == MYSQL ? '`' : '[',
			R: this.info.dbType == ORACLE ? '"' : this.info.dbType == MYSQL ? '`' : ']'
		};
	}
	
	setTables(infoKey)
	{
		var modal = new ACModal(document.body);
		modal.addHeader({ title: infoKey, closeButton: true });
		
		var contentCell = modal.addSection();
		var textInput = new ACTextInput(contentCell);
		textInput.value = this.info[infoKey].join(', ');
		
		var handler = e => {
			var tablesString = textInput.value.replace(/\s/g, '');
			this.info[infoKey] = tablesString ? tablesString.split(',') : [];
			this.writeInfo();
		};
		
		modal.addEventListener('close', handler);
		textInput.addEventListener('enter', e => modal.close());
		
		modal.addFooter();
		modal.display();
		textInput.focus();
	}
	
	setRules(varName)
	{
		var modal = new ACModal(document.body);
		modal.addHeader({ title: varName, closeButton: true });
		
		var contentCell = modal.addSection();
		contentCell.style.height = '400px';
		
		var footerCell = modal.addFooter();
		
		var errorCell = new ACStaticCell(footerCell);
		errorCell.style.color = 'red';
		errorCell.textContent = '\u00a0';
		footerCell.style.padding = '6px 15px';
		errorCell.style.textAlign = 'left';
		
		var editor = ace.edit(contentCell);
		editor.$blockScrolling = Infinity;
		editor.setTheme("ace/theme/xcode");
		editor.getSession().setMode("ace/mode/json");
		editor.renderer.setShowGutter(false);
		editor.setShowPrintMargin(false);
		editor.setHighlightActiveLine(false);
		editor.setFontSize(14);
		editor.getSession().setUseSoftTabs(false);
		editor.session.setValue(
			Object.keys(this.info[varName]).length > 0 ? 
			JSON.stringify(this.info[varName], null, '\t') : 
			''
		);
		editor.getSession().on('change', e => {
			errorCell.textContent = '\u00a0';
		});
		
		modal.addEventListener('close', evt => {
			var rulesString = editor.getValue();
			if (rulesString) try {
				var rules = JSON.parse(rulesString);
				if (rules) this.info[varName] = rules;
				this.writeInfo();
			} catch (e) {
				evt.preventDefault();
				errorCell.textContent = e.message;
				editor.focus();
			}
			else this.info[varName] = {};
		});
		
		modal.display();
		editor.focus();
	}
	
	killQueue()
	{
		DB.abortAll();
	}
	
	browseForWorkbook()
	{
		this.upCtrl.click();
	}
	
	readFile(file)
	{
		this.outputArea.clear();
		this.sheetNames = [];
		this.tableKeyFields = {};
		this.tableIsChangeTracked = {};
		this.sheetEntries = {};
		var fileReader = new FileReader();
		fileReader.onload = e => {
			var filename = file.name;
			// pre-process data
			var binary = "";
			var bytes = new Uint8Array(e.target.result);
			var length = bytes.byteLength;
			for (var i = 0; i < length; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			// call 'xlsx' to read the file
			var oFile = XLSX.read(binary, {type: 'binary', cellDates:true, cellStyles:true});
			
			// next
			var tableNames = [];
			this.sheetNames = oFile.SheetNames;
			oFile.SheetNames.forEach(sheetName => {
				var sheet = oFile.Sheets[sheetName];
				this.sheetEntries[sheetName] = XLSX.utils.sheet_to_json(sheet);
				//var entries = XLSX.utils.sheet_to_json(sheet);
				var [tableName, extraName] = sheetName.split('#');
				tableNames.push(tableName);
				//this.readKeyFields(tableName, extraName, entries);
			});
			this.readKeyFields(tableNames);
			
			this.tableKeys = {};
			for (var sheetName in oFile.Sheets) {
				var [tableName, extraName] = sheetName.split('#');
				this.tableKeys[tableName] = [];
				var firstRowCellKeys = Object.keys(oFile.Sheets[sheetName]).filter(key => key.replace( /^\D+/g, '') == '1');
				firstRowCellKeys.forEach(cellKey => {
					this.tableKeys[tableName].push(oFile.Sheets[sheetName][cellKey].v);
				});
			}
		};
		fileReader.readAsArrayBuffer(file);
	}
	
	readKeyFields(tableNames)
	{
		DB.query("\
			SELECT name, key_fields, (\
				SELECT COUNT(*) \
				FROM field_master \
				WHERE field_name IN('CHANGED_BY', 'CHANGED_ON') \
				AND table_name = table_master.name\
			) extra \
			FROM table_master \
			WHERE name IN('" + tableNames.join("','") + "')", 
		rows => {
			rows.forEach(row => {
				this.tableKeyFields[row.name] = row.key_fields.trim().split(' ');
				this.tableIsChangeTracked[row.name] = row.extra == 2;
			});
			this.readEntries();
		});
	}
	
	readEntries()
	{
		// queue management
		var selectQueryCount = 0;
		var executedSelectQueryCount = 0;
		
		this.sheetNames.forEach(sheetName => {
			
			var [tableName, extraName] = sheetName.split('#');
			
			// Do Only?
			if (
				this.info.doOnlyTables.length > 0 && 
				!this.info.doOnlyTables.includes(tableName)
			)
			return;
			
			// Skip?
			if (
				this.info.skipTables.includes(tableName) && 
				(this.info.doOnlyTables.length < 1 || !this.info.doOnlyTables.includes(tableName))
			)
			return;
			
			var htmlTable = AC.create('table', this.outputArea);
			htmlTable.style.margin = '10px 0px';
			htmlTable.setAttribute('border', 1);
			htmlTable.setAttribute('cellpadding', 2);
			htmlTable.style.whiteSpace = 'pre-wrap';
			htmlTable.style.display = 'none';
			
			var caption = AC.create('caption', htmlTable);
			caption.textContent = tableName;
			
			var htmlRow = AC.create('tr', htmlTable);
			this.tableKeys[tableName].forEach(key => {
				var htmlCell = AC.create('th', htmlRow);
				htmlCell.textContent = key;
			});
			
			var keyFields = this.tableKeyFields[tableName];
			if (!keyFields) {
				(new ACStaticCell(this.outputArea)).textContent = 'Could not read table ' + tableName;
				return;
			}
			var isChangeTracked = this.tableIsChangeTracked[tableName];
			
			// order number vars
			var lastParentCompositeID = null;
			var orderNumber = null;
			var compositeIDs = [];
			
			this.sheetEntries[sheetName].forEach(entry => {
				var htmlRow = AC.create('tr', htmlTable);
				
				// compose parent and self composite IDs
				var parentCompositeID = null;
				var compositeID = null;
				for (let compositeKey of ['parent', 'self']) {
					if (tableName in this.info.tableCompositeIDs && compositeKey in this.info.tableCompositeIDs[tableName]) {
						var fieldNames = this.info.tableCompositeIDs[tableName][compositeKey];
						var bits = [];
						fieldNames.forEach(fieldName => {
							if (!(fieldName in entry)) {
								bits = [];
								return;
							}
							bits.push(entry[fieldName]);
						});
						if (bits.length > 0) {
							let currentCompositeID = bits.join(':');
							if (compositeKey == 'parent') parentCompositeID = currentCompositeID;
							else compositeID = currentCompositeID;
						}
					}
				}
				
				if (parentCompositeID) {
					if (!this.tableKeys[tableName].includes('ORDER_NUMBER')) this.tableKeys[tableName].push('ORDER_NUMBER');
					if (parentCompositeID != lastParentCompositeID) {
						orderNumber = 1;
						entry.ORDER_NUMBER = orderNumber;
						if (compositeIDs.length > 0) this.checkForOrphans(
							tableName, this.tableKeys[tableName], 
							this.info.tableCompositeIDs[tableName], 
							lastParentCompositeID, compositeIDs, 
							htmlRow
						);
						lastParentCompositeID = parentCompositeID;
						compositeIDs = [];
					} else {
						orderNumber++;
						entry.ORDER_NUMBER = orderNumber;
					}
					if (compositeID) {
						compositeIDs.push(compositeID);
					}
				}
				
				// WHERE clause
				var whereClauseBody = LSImportWindow.clauseBody(keyFields, entry, null, this.quot);
				selectQueryCount++;
				
				DB.query("SELECT " + this.quot.L + this.tableKeys[tableName].join(this.quot.R + ', ' + this.quot.L) + this.quot.R + " FROM " + tableName + " WHERE " + whereClauseBody, rows => {
					
					htmlTable.style.display = 'table';
					var changed = false;
					var oldRecord = rows.length > 0 ? rows[0] : null;
					if (!oldRecord) changed = true;
					
					this.tableKeys[tableName].forEach(key => {
						var td = AC.create('td', htmlRow);
						
						// standardise line breaks
						if (typeof entry[key] == 'string') entry[key] = entry[key].replace(/\r/g, '');
						if (oldRecord && key in oldRecord && typeof oldRecord[key.toLowerCase()] == 'string') 
							oldRecord[key.toLowerCase()] = oldRecord[key.toLowerCase()].replace(/\r/g, '');
						
						// are values same?
						if (oldRecord && entry[key] != oldRecord[key.toLowerCase()]) {
							changed = true;
							td.style.backgroundColor = 'yellow';
							var oldContentSpan = AC.create('span', td);
							oldContentSpan.textContent = oldRecord[key.toLowerCase()];
							oldContentSpan.style.textDecoration = 'line-through';
						}
						var newContentSpan = AC.create('span', td);
						if (!entry[key]) entry[key] = null;
						newContentSpan.textContent = entry[key] ? entry[key] : ' ';
					});
					this.outputArea.scrollTop = this.outputArea.scrollHeight;
					
					// Controls
					if (!changed) {
						htmlRow.classList.add('unchanged');
						return;
					}
					var ctrlCell = AC.create('td', htmlRow);
					var labelCtrl = AC.create('label', ctrlCell);
					labelCtrl.style.fontWeight = 'bold';
					var textCtrl = document.createTextNode('');
					labelCtrl.appendChild(textCtrl);
					var checkCtrl = AC.create('input', labelCtrl);
					checkCtrl.type = 'checkbox';
					checkCtrl.checked = true;
					
					if (isChangeTracked) {
						entry.CHANGED_BY = 'AUTOLOADER';
						entry.CHANGED_ON = 'CURRENT_TIMESTAMP';
					}
					
					if (oldRecord) {
						textCtrl.textContent = "UPDATE";
						var fieldsToUpdate = Object.keys(entry).filter(k => !keyFields.includes(k));
						var updateClauseBody = LSImportWindow.clauseBody(fieldsToUpdate, entry, UPDATE_CLAUSE, this.quot);
						var query = "UPDATE " + tableName + "\r\nSET " + updateClauseBody + "\r\nWHERE " + whereClauseBody;
						checkCtrl.title = query;
					} else {
						htmlRow.style.backgroundColor = 'LightSkyBlue';
						textCtrl.textContent = "INSERT";
						var fieldsToInsert = Object.keys(entry);
						if (keyFields.includes('VERSION') && !fieldsToInsert.includes('VERSION')) fieldsToInsert.push('VERSION');
						if (tableName in this.info.tableDefaults) for (var defaultValueKey in this.info.tableDefaults[tableName]) {
							if (defaultValueKey in entry) continue;
							var defaultValue = this.info.tableDefaults[tableName][defaultValueKey];
							fieldsToInsert.push(defaultValueKey);
							entry[defaultValueKey] = defaultValue;
						}
						var insertClauseBody = LSImportWindow.clauseBody(fieldsToInsert, entry, INSERT_CLAUSE, this.quot);
						var query = "INSERT INTO " + tableName + insertClauseBody;
						if (this.versionedMainTables.includes(tableName) && entry.NAME) 
							query += ";\r\nINSERT INTO versions (table_name, name, version) VALUES('"+ tableName +"', '"+ entry.NAME +"', 1)";
						checkCtrl.title = query;
					}
				}, errorText => {
					htmlTable.style.display = 'table';
					var td = AC.create('td', htmlRow);
					td.textContent = errorText;
					td.style.color = 'red';
					td.colSpan = this.tableKeys[tableName].length;
				}, e => {
					executedSelectQueryCount++;
					if (this.generateBtn) {
						this.generateBtn.textContent = executedSelectQueryCount + ' / ' + selectQueryCount;
						if (executedSelectQueryCount == selectQueryCount) {
							this.generateBtn.disabled = false;
							this.generateBtn.textContent = 'Execute';
						}
					}
				});
			});
			
			// check for orphans on last recordset
			if (lastParentCompositeID && compositeIDs.length > 0) this.checkForOrphans(
				tableName, this.tableKeys[tableName], 
				this.info.tableCompositeIDs[tableName], 
				lastParentCompositeID, compositeIDs, 
				htmlTable
			);
		});
				
		this.generateBtn = AC.create('button', this.outputArea);
		this.generateBtn.textContent = " ";
		this.generateBtn.disabled = true;
		this.generateBtn.style.marginBottom = '10px';
		var queryContainer = new ACStaticCell(this.outputArea);
		this.generateBtn.onclick = evt => {
			queryContainer.clear();
			evt.srcElement.parentElement.querySelectorAll("input:checked").forEach(checkCtrl => {
				checkCtrl.title.split(';').forEach(query => {
					var qCtrl = new ACStaticCell(queryContainer);
					qCtrl.style.width = qCtrl.style.height = '20px';
					qCtrl.style.border = '1px solid grey';
					qCtrl.style.float = 'left';
					qCtrl.title = query;
					DB.query(qCtrl.title, x => {
						qCtrl.style.backgroundColor = 'lime';
					}, error => {
						qCtrl.style.backgroundColor = 'red';
						qCtrl.title += error;
					});
				});
				this.generateBtn.disabled = true;
			});
			this.outputArea.scrollTop = this.outputArea.scrollHeight;
		};
	}
	
	checkForOrphans(tableName, selectFields, compositorKeys, parentCompositeID, compositeIDs, node)
	{
		if (this.info.dbType != MSSQL) return;
		
		DB.query(
			"SELECT " + this.quot.L + selectFields.join(this.quot.R + ', ' + this.quot.L) + this.quot.R + " " + 
			"FROM " + tableName + " " + 
			"WHERE " + compositorKeys.parent.join(" + ':' + ") + " = '" + parentCompositeID + "' " + 
			"AND " + compositorKeys.self.join(" + ':' + ") + " NOT IN ('" + compositeIDs.join("', '") + "')"
		, rows => {
			rows.forEach(row => {
				var htmlRow = AC.create('tr');
				htmlRow.style.backgroundColor = '#f2dede';
				htmlRow.style.color = '#a94442';
				var compositeIDBits = [];
				for (let key in row) {
					let htmlCell = AC.create('td', htmlRow);
					htmlCell.textContent = row[key];
				}
				
				for (let key of compositorKeys.self) {
					compositeIDBits.push(row[key.toLowerCase()]);
				}
				
				// DELETE control
				if (compositeIDBits.length > 0) {
					var ctrlCell = AC.create('td', htmlRow);
					var labelCtrl = AC.create('label', ctrlCell);
					labelCtrl.style.fontWeight = 'bold';
					labelCtrl.textContent = 'DELETE';
					var checkCtrl = AC.create('input', labelCtrl);
					checkCtrl.type = 'checkbox';
					checkCtrl.checked = true;
					checkCtrl.title = 
						"DELETE FROM " + tableName + "\r\n" + 
						"WHERE " + compositorKeys.parent.join(" + ':' + ") + " = '" + parentCompositeID + "'\r\n" + 
						"AND " + compositorKeys.self.join(" + ':' + ") + " = '" + compositeIDBits.join(":") + "'";
				}
						
				if (node.tagName == 'TR') {
					node.parentElement.insertBefore(htmlRow, node);
				} else {
					node.appendChild(htmlRow);
				}
			});
		});
	}
	
	static clauseBody(fieldNames, entry, isInsert, quot)
	{
		var textFields = ['NAME', 'ALIAS_NAME', 'PRODUCT', 'GRADE', 'T_PH_ITEM_CODE', 'T_PH_SAMPLE_PLAN'];
		var bits = [];
		fieldNames.forEach(fieldName => {
			var checkBit = entry[fieldName];
			var valueBit = !checkBit && checkBit !== 0 ? "NULL" : (
				(fieldName == "CHANGED_ON" || 
					(!isNaN(parseFloat(checkBit)) && isFinite(checkBit) && !textFields.includes(fieldName))
				) ? checkBit : "'" + checkBit.replace(/'/g, "''") + "'"
			);
			if (!checkBit && fieldName == "VERSION") valueBit = "1";
			bits.push(!isInsert || isInsert == UPDATE_CLAUSE ? quot.L + fieldName + quot.R + " = " + valueBit : valueBit);
		});
		return !isInsert ? 
			bits.join(" AND "): (
				isInsert == INSERT_CLAUSE ? "(" + quot.L + fieldNames.join(quot.R + ", " + quot.L) + quot.R + ")\r\nVALUES (" + bits.join(", ") + ")":
				bits.join(", ")
			);
	}
	
	clearUnchanged()
	{
		this.outputArea.querySelectorAll('.unchanged').forEach(node => {
			node.remove();
		});
	}
}