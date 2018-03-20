'use strict';

class LSSampleWindow extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		this.grid = new ACFlexGrid(this.rootNode, { rowHeights:['10px', 'auto'], colWidths:['100%'] });
		
		var tb = new ACToolBar(this.grid.cell(0,0), { type: 'secondary' });
		tb.classList.add('ls-toolbar');
		tb.setStyle(ST_BORDER_BOTTOM);
		tb.style.borderBottomColor = '#17817b';
		tb.setItems([
			{caption: 'Exit', icon: 'quit.png', tooltip: 'Exit (⌘D)', action: this.exit.bind(this) },
			{caption: 'Open Sample', icon: 'open.png', tooltip: 'Open (⌘O)', action: this.promptForSample.bind(this) }
		]);
		
		var grid = new ACFlexGrid(this.grid.cell(1,0), { rowHeights:['auto'], colWidths:['20%', 'auto'] });
		grid.addSizer(0, AC_DIR_VERTICAL);
		
		//grid.cell(0,1).style.backgroundColor = 'red';
		grid.cell(0,1).style.verticalAlign = 'top';
		this.infoPane = new ACStaticCell(grid.cell(0,1));
		this.infoPane.style.height = '100%';
		this.infoPane.style.overflow = 'auto';
		
		//grid.cell(0,0).style.backgroundColor = 'blue';
		grid.cell(0,0).style.verticalAlign = 'top';
		this.tv = new ACTreeView(grid.cell(0,0));
		this.tv.style.borderRight = '1px solid #ddd';
	}
	
	onAttached(params)
	{
		this.rootNode.appendChild(this.grid);
		if (params && params.sample) {
			this.openSample(params.sample, e => {
				this.tv.firstChild.lastChild.select();
				this.setObject('sample', params.sample);
			});
		} else if (!this.tv.firstChild.firstChild) {
			// this is how it works in LW but it was frustrating the hell out of me when switching back and forth between modes
			//this.promptForSample();
		}
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'open': this.promptForSample(); break;
			case 'eof': this.exit(); break;
		}
	}
	
	promptForSample()
	{
		var modal = new ACDialog(document.body);
		modal.setTitle('Open Sample');
		modal.searchQuery = '';
		
		var inputBox = new ACBrowseInput(modal.contentCell);
		inputBox.style.width = '100%';
		
		inputBox.addEventListener('browse', evt => {
			var control = evt.srcElement;
			
			DB.query("\
				SELECT sample_number, text_id, status \
				FROM sample \
				ORDER BY 1 DESC "
			, rows => {
				var browser = new ACBrowseDialog(document.body);
				browser.setTitle('Samples');
				browser.setHeadings(['Sample №', 'Text ID', 'Status']);
				
				rows.forEach(row => {
					var item = browser.addItem(row);
					item.onclick = evt => {
						control.value = row.sample_number;
						browser.close();
						control.dispatchEvent(new Event('enter'));
					};
				});
				
				browser.display();
			});
		});
		
		inputBox.addEventListener('enter', evt => {
			// numeric sample no. filter
			var inputSampleNo = inputBox.value.match(/[0-9]+/g);
			if (!inputSampleNo) {
				inputBox.value = '';
				return;
			}
			inputSampleNo = inputSampleNo[0];
			inputBox.value = inputSampleNo;
			this.openSample(inputSampleNo, e => {
				modal.close();
			}, e => {
				inputBox.value = '';
			});
		});
		
		modal.display();
		inputBox.focus();
	}
	
	openSample(sampleNo, okFn, failFn)
	{
		DB.query("\
			SELECT sample_number, text_id, status \
			FROM sample \
			WHERE sample_number = " + sampleNo, 
		samples => {
			if (samples.length < 1) {
				if (failFn) failFn.call(this);
				return;
			}
			var sample = samples[0];
			var sampleNode = this.tv.add(
				sample.sample_number + '  ' + sample.text_id, 
				null,//'sample ' + sample.status, 
				this.setObject.bind(this, 'sample', sample.sample_number)
			);
			DB.query("\
				SELECT test_number, analysis, reported_name, replicate_count, status \
				FROM test \
				WHERE sample_number = " + sampleNo + " \
				ORDER BY analysis", 
			tests => {
				tests.forEach(test => {
					var testNode = sampleNode.add(
						test.analysis + ' [' + test.reported_name + ']' + ' / ' + test.replicate_count, 
						null,//'test ' + test.status, 
						this.setObject.bind(this, 'test', test.test_number)
					);
					DB.query("\
						SELECT result_number, name, replicate_count, status \
						FROM result \
						WHERE test_number = " + test.test_number, 
					results => {
						results.forEach(result => {
							testNode.add(
								result.name + ' / ' + result.replicate_count, 
								null,//'result ' + result.status, 
								this.setObject.bind(this, 'result', result.result_number)
							);
						});
					});
				});
				if (okFn) okFn.call(this);
			});
		});
	}
	
	setObject(type, objectNo)
	{
		this.infoPane.textContent = '';
		DB.query("SELECT * FROM "+type+" WHERE "+type+"_number = " + objectNo, objects => {
			DB.query("\
				SELECT fm.field_name, fm.link_table, fm.data_type, fm.hidden, fm.list_key, (CASE WHEN ft.field_name IS NOT NULL THEN 'T' ELSE 'F' END) FT_EXISTS, \
					ft.group_title, ft.field_label \
				FROM field_master fm \
				LEFT JOIN table_template tt ON tt.template_table = fm.table_name \
				LEFT JOIN table_temp_fields ft ON tt.name = ft.template AND fm.field_name = ft.field_name AND ft.entry_mode = 'USERENTRY' \
				WHERE fm.table_name = '" + type.toUpperCase() + "' AND fm.hidden = 'F' AND fm.field_name NOT IN ('NAME', 'CHANGED_BY', 'CHANGED_ON', 'REMOVED') \
				ORDER BY (CASE WHEN ft.group_title IS NULL THEN 0 ELSE 1 END), ft.group_title, ft.order_number \
			", schemaRows => {
				objects.forEach(object => {
					this.infoPane.clear();
					var kvv = new ACKeyValueView(this.infoPane);
					for (var s = 0; s < schemaRows.length; s++) {
						var field = kvv.addField(type + ' ' + objectNo, schemaRows[s].field_label ? schemaRows[s].field_label : schemaRows[s].field_name);
						var value = object[schemaRows[s].field_name.toLowerCase()] ? object[schemaRows[s].field_name.toLowerCase()] : '';
						switch (schemaRows[s].data_type) {
							case 'Boolean':
								var control = new ACOnOffSwitch(field);
								control.name = schemaRows[s].field_name;
								control.value = (value == 'T');
							break;
							case 'Text':
							case 'Integer':
							default:
								//if (!schemaRows[s].link_table) {
									var control = schemaRows[s].data_type == 'Integer' ? new ACNumberInput(field) : new ACTextInput(field);
									control.name = schemaRows[s].field_name;
									control.value = value;
								/*} else {
									var control = new ACBrowseInput(field);
									control.name = schemaRows[s].field_name;
									control.value = value;
									control.table = schemaRows[s].link_table;
									control.addEventListener('focusout', this.verifyField.bind(this));
									control.addEventListener('browse', this.browseLinkedItem.bind(this, {
										type: schemaRows[s].link_table, 
										keyFields: schemaRows[s].key_fields, 
										descFields:schemaRows[s].description_fields
									}));
								}*/
							break;
						}
					}
				});
				if (objects.length < 1) {
					this.infoPane.clear();
					var sc = new ACStaticCell(this.infoPane);
					sc.textContent = type + ' ' + objectNo + ' not found in current database';
					sc.style.color = 'red';
				}
			});
		});
	}
	
	exit()
	{
		this.dispatchEvent('quit');
	}
}