'use strict';

const INSERT_CLAUSE = 1;
const UPDATE_CLAUSE = 2;

class LSImportWindow extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		this.grid = new ACFlexGrid(this.rootNode, { rowHeights:['10px', 'auto', '40px'], colWidths:['100%'] });
		
		this.outputArea = new ACStaticCell(this.grid.cell(1,0));
		this.outputArea.style.width = this.outputArea.style.height = '100%';
		this.outputArea.style.overflow = 'auto';
		
		['LSImportWindowSkipTables', 'LSImportWindowDoOnlyTables'].forEach(localStorageVarName => {
			var tablesString = localStorage.getItem(localStorageVarName);
			if (tablesString) tablesString = tablesString.replace(/\s/g, '');
			this[localStorageVarName] = tablesString ? tablesString.split(',') : [];
		});
		
		this.tablePresets = {};
		var tablePresetsString = localStorage.getItem('LSImportWindowDefaults');
		if (tablePresetsString) try {
			var tablePresets = JSON.parse(tablePresetsString);
			if (tablePresets) this.tablePresets = tablePresets;
		} catch (e) {
			localStorage.setItem('LSImportWindowDefaults', '');
		}
		
		this.versionedMainTables = ['PRODUCT', 'ANALYSIS', 'T_PH_SAMPLE_PLAN'];
		
		var tb = new ACToolBar(this.grid.cell(0,0), { type: 'secondary' });
		tb.classList.add('ls-toolbar');
		tb.setStyle(ST_BORDER_BOTTOM);
		tb.style.borderBottomColor = '#17817b';
		tb.setItems([
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) },
			{caption: 'Open Workbook', icon: 'open.png', tooltip: 'Open (⌘O)', action: this.browseForWorkbook.bind(this) },
			{caption: 'Set Skip Tables', icon: 'reject.png', action: this.setTables.bind(this, 'LSImportWindowSkipTables') },
			{caption: 'Set Do Only Tables', icon: 'select.png', action: this.setTables.bind(this, 'LSImportWindowDoOnlyTables') },
			{caption: 'Set Defaults', icon: 'defaults.png', action: this.setDefaults.bind(this) },
			{caption: 'Kill Queue', icon: 'kill.png', action: this.killQueue.bind(this) }
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
	
	setTables(localStorageVarName)
	{
		var modal = new ACDialog(document.body);
		modal.setTitle(localStorageVarName);
		
		var textInput = new ACTextInput(modal.contentCell);
		textInput.value = localStorage.getItem(localStorageVarName);
		textInput.focus();
		
		var handler = e => {
			var tablesString = textInput.value.replace(/\s/g, '');
			localStorage.setItem(localStorageVarName, tablesString);
			this[localStorageVarName] = tablesString ? tablesString.split(',') : [];
		};
		
		modal.addEventListener('close', handler);
		textInput.addEventListener('enter', handler);
		textInput.addEventListener('enter', e => modal.close());
		
		modal.display();
	}
	
	setDefaults()
	{
		var modal = new ACDialog(document.body);
		modal.setTitle('Set Defaults');
		modal.contentCell.style.height = '400px';
		
		var errorCell = new ACStaticCell(modal.footerCell);
		errorCell.style.color = 'red';
		errorCell.textContent = '\u00a0';
		modal.footerCell.style.padding = '6px 15px';
		errorCell.style.textAlign = 'left';
		
		var editor = ace.edit(modal.contentCell);
		editor.$blockScrolling = Infinity;
		editor.setTheme("ace/theme/xcode");
		editor.getSession().setMode("ace/mode/json");
		editor.renderer.setShowGutter(false);
		editor.setShowPrintMargin(false);
		editor.setHighlightActiveLine(false);
		editor.setFontSize(14);
		editor.getSession().setUseSoftTabs(false);
		editor.session.setValue(localStorage.getItem('LSImportWindowDefaults') || '', -1);
		editor.focus();
		editor.getSession().on('change', e => {
			errorCell.textContent = '\u00a0';
		});
		
		modal.addEventListener('close', evt => {
			this.tablePresets = {};
			var tablePresetsString = editor.getValue();
			if (tablePresetsString) try {
				var tablePresets = JSON.parse(tablePresetsString);
				if (tablePresets) this.tablePresets = tablePresets;
				localStorage.setItem('LSImportWindowDefaults', tablePresetsString);
			} catch (e) {
				evt.preventDefault();
				errorCell.textContent = e.message;
				editor.focus();
			}
			else localStorage.setItem('LSImportWindowDefaults', '');
		});
		
		modal.display();
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
				this.tableKeyFields[row.name] = row.key_fields.split(' ');
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
				this.LSImportWindowDoOnlyTables.length > 0 && 
				!this.LSImportWindowDoOnlyTables.includes(tableName)
			)
			return;
			
			// Skip?
			if (
				this.LSImportWindowSkipTables.includes(tableName) && 
				(this.LSImportWindowDoOnlyTables.length < 1 || !this.LSImportWindowDoOnlyTables.includes(tableName))
			)
			return;
			
			var htmlTable = AC.create('table', this.outputArea);
			htmlTable.style.margin = '10px 0px';
			htmlTable.setAttribute('border', 1);
			htmlTable.setAttribute('cellpadding', 2);
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
			
			this.sheetEntries[sheetName].forEach(entry => {
				var htmlRow = AC.create('tr', htmlTable);
				
				// automatically compose order number
				var parentCompositeID = null;
				
				if (tableName == 'LIST_ENTRY' && 'LIST' in entry) parentCompositeID = entry.LIST;
				if (tableName == 'PRODUCT_GRADE' && 'PRODUCT' in entry) parentCompositeID = entry.PRODUCT;
				if (
					tableName == 'PROD_GRADE_STAGE' && 
					'PRODUCT' in entry && 
					'SAMPLING_POINT' in entry && 'GRADE' in entry
				)
				parentCompositeID = entry.PRODUCT + '/' + 
					entry.SAMPLING_POINT + ':' + entry.GRADE;
				if (
					tableName == 'PRODUCT_SPEC' && 
					'PRODUCT' in entry && 
					'SAMPLING_POINT' in entry && 'GRADE' in entry &&
					'STAGE' in entry && 'ANALYSIS' in entry && 'SPEC_TYPE' in entry
				)
				parentCompositeID = entry.PRODUCT + '/' + 
					entry.SAMPLING_POINT + ':' + entry.GRADE + '/' + 
					entry.STAGE + ':' + entry.ANALYSIS + ':' + entry.SPEC_TYPE;
				if (tableName == 'COMPONENT' && 'ANALYSIS' in entry) parentCompositeID = entry.ANALYSIS;
				if (tableName == 'T_PH_SAMPLE_PLAN_EN' && 'T_PH_SAMPLE_PLAN' in entry) parentCompositeID = entry.T_PH_SAMPLE_PLAN;
				if (tableName == 'T_PH_ITEM_CODE_SPEC' && 'T_PH_ITEM_CODE' in entry) parentCompositeID = entry.T_PH_ITEM_CODE;
				
				if (parentCompositeID) {
					if (!this.tableKeys[tableName].includes('ORDER_NUMBER')) this.tableKeys[tableName].push('ORDER_NUMBER');
					if (parentCompositeID != lastParentCompositeID) {
						orderNumber = 1;
						entry.ORDER_NUMBER = orderNumber;
						lastParentCompositeID = parentCompositeID;
					} else {
						orderNumber++;
						entry.ORDER_NUMBER = orderNumber;
					}
				}
				
				// WHERE clause
				var whereClauseBody = LSImportWindow.clauseBody(keyFields, entry);
				selectQueryCount++;
				
				DB.query("SELECT [" + this.tableKeys[tableName].join('], [') + "] FROM " + tableName + " WHERE " + whereClauseBody, rows => {
					
					htmlTable.style.display = 'table';
					var changed = false;
					var oldRecord = rows.length > 0 ? rows[0] : null;
					if (!oldRecord) changed = true;
					
					this.tableKeys[tableName].forEach(key => {
						var td = AC.create('td', htmlRow);
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
					if (!changed) return;
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
						var updateClauseBody = LSImportWindow.clauseBody(fieldsToUpdate, entry, UPDATE_CLAUSE);
						var query = "UPDATE " + tableName + "\r\nSET " + updateClauseBody + "\r\nWHERE " + whereClauseBody;
						checkCtrl.title = query;
					} else {
						htmlRow.style.backgroundColor = 'LightSkyBlue';
						textCtrl.textContent = "INSERT";
						var fieldsToInsert = Object.keys(entry);
						if (keyFields.includes('VERSION') && !fieldsToInsert.includes('VERSION')) fieldsToInsert.push('VERSION');
						if (tableName in this.tablePresets) for (var defaultValueKey in this.tablePresets[tableName]) {
							if (defaultValueKey in entry) continue;
							var defaultValue = this.tablePresets[tableName][defaultValueKey];
							fieldsToInsert.push(defaultValueKey);
							entry[defaultValueKey] = defaultValue;
						}
						var insertClauseBody = LSImportWindow.clauseBody(fieldsToInsert, entry, INSERT_CLAUSE);
						var query = "INSERT INTO " + tableName + insertClauseBody;
						if (this.versionedMainTables.includes(tableName) && entry.NAME) 
							query += ";\r\nINSERT INTO versions (table_name, name, version) VALUES('"+ tableName +"', '"+ entry.NAME +"', 1)";
						checkCtrl.title = query;
					}
				}, null, e => {
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
	
	static clauseBody(fieldNames, entry, isInsert)
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
			bits.push(!isInsert || isInsert == UPDATE_CLAUSE ? "[" + fieldName + "] = " + valueBit : valueBit);
		});
		return !isInsert ? 
			bits.join(" AND "): (
				isInsert == INSERT_CLAUSE ? "([" + fieldNames.join("], [") + "])\r\nVALUES (" + bits.join(", ") + ")":
				bits.join(", ")
			);
	}
}