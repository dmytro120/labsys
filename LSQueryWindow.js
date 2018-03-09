'use strict';

class LSQueryWindow extends ACFlexGrid
{
	constructor(parentNode)
	{
		super(parentNode);
		this.setLayout(['auto', '39px', 'auto'], ['100%']);
		
		var sizer = this.addSizer(0, AC_DIR_HORIZONTAL);
		sizer.style.height = '100%';
		sizer.style.marginTop = '0';
		sizer.style.paddingTop = '4px';
		
		var topCell = this.cell(0,0);
		this.queryCtrl = ace.edit(topCell);
		this.queryCtrl.$blockScrolling = Infinity;
		this.queryCtrl.setTheme("ace/theme/xcode");
		this.queryCtrl.getSession().setMode("ace/mode/sql");
		this.queryCtrl.renderer.setShowGutter(false);
		this.queryCtrl.setShowPrintMargin(false);
		this.queryCtrl.setHighlightActiveLine(false);
		this.queryCtrl.setFontSize(14);
		this.queryCtrl.getSession().setUseSoftTabs(false);
		this.queryCtrl.onPaste = (e,t) => {
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
			this.queryCtrl.commands.exec("paste",this.queryCtrl,n);
		}
		//this.queryCtrl.style.borderBottom = '1px solid #ddd';
		this.addEventListener('layoutChanged', e => {
			this.queryCtrl.resize(true);
		});
		var preText = localStorage.getItem("LSQueryWindowText");
		if (preText) this.queryCtrl.setValue(preText, -1);
		this.queryCtrl.on("input", evt => {
			localStorage.setItem("LSQueryWindowText", this.queryCtrl.getValue());
		});
		
		var middleCell = this.cell(1,0);
		middleCell.style.verticalAlign = 'middle';
		middleCell.style.backgroundColor = '#f8f8f8';
		middleCell.style.borderTop = '1px solid #ddd';
		//middleCell.style.borderBottom = '1px solid #ddd';
		middleCell.style.textAlign = 'center';
		
		this.runButton = AC.create('button', sizer);
		this.runButton.classList.add('btn', 'btn-default', 'btn-sm');
		this.runButton.textContent = 'Run Current';
		this.runButton.onclick = this.runQuery.bind(this);
		
		var spacer = new ACStaticCell(sizer);
		spacer.style.display = 'inline-block';
		spacer.style.width = '12px';
		spacer.textContent = '  ';
		
		this.xlsxButton = AC.create('button', sizer);
		this.xlsxButton.classList.add('btn', 'btn-default', 'btn-sm');
		this.xlsxButton.textContent = 'Run All to XLSX';
		this.xlsxButton.onclick = this.prepareXLSX.bind(this);
		
		var spacer = new ACStaticCell(sizer);
		spacer.style.display = 'inline-block';
		spacer.style.width = '12px';
		spacer.textContent = '  ';
		
		this.copyButton = AC.create('button', sizer);
		this.copyButton.classList.add('btn', 'btn-default', 'btn-sm');
		this.copyButton.textContent = 'Copy Table';
		this.copyButton.onclick = this.copyResults.bind(this);
		
		this.resultContainer = AC.create('div', this.cell(2,0));
		this.resultContainer.style.width = '100%';
		this.resultContainer.style.maxWidth = '100%';
		this.resultContainer.style.height = '100%';
		this.resultContainer.style.overflow = 'auto';
		this.resultContainer.style.borderTop = '1px solid #ddd';
	}
	
	onAttached()
	{
		if (this.resultContainerScrollTop) this.resultContainer.scrollTop = this.resultContainerScrollTop;
		this.queryCtrl.focus();
	}
	
	onDetached()
	{
		this.resultContainerScrollTop = this.resultContainer.scrollTop;
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'enter': this.runQuery(); break;
			case 'eof': this.exit(); break;
		}
	}
	
	runQuery()
	{
		var queriesString = (typeof ace !== 'undefined' ? this.queryCtrl.getValue() : this.queryCtrl.value);
		var queries = queriesString.split(';');
		var curPos = this.queryCtrl.session.doc.positionToIndex(this.queryCtrl.getCursorPosition());
		var strPos = 0;
		for (var q = 0; queries.length > 1 && q < queries.length; q++) {
			var strPos = queriesString.indexOf(';', strPos + 1);
			if (strPos < 0) strPos = queriesString.length;
			if (curPos <= strPos) break;
		}
		var query = queries[q];
		if (!query) {
			this.setResult();
			return;
		}
		
		this.runButton.disabled = this.xlsxButton.disabled = this.copyButton.disabled = true;
		
		// fix control jump issue
		var cr = this.cell(0,0).getBoundingClientRect();
		this.cell(0,0).style.minHeight = this.cell(0,0).style.height = cr.height + 'px';
		
		DB.query(query, result => {
			if ((result.length && result.length > 0) || Object.keys(result).length > 0) { 
				var table = document.createElement('table');
				table.classList.add('table', 'table-hover', 'table-condensed');
				table.style.width = 'auto';
				table.style.margin = '0 auto';
				var tbody = document.createElement('tbody');
				table.appendChild(tbody);
			} else {
				var table = document.createElement('div');
				table.style.color = 'grey';
				table.style.textAlign = 'center';
				table.textContent = 'nothing found';
				table.style.padding = '8px';
			}
			
			if (result instanceof Array) {
				for (var i = 0; i < result.length; i++) {
					var row = result[i];
					if (i == 0) {
						var headerRow = document.createElement('tr');
						tbody.appendChild(headerRow);
					}
					var normalRow = document.createElement('tr');
					for (var key in row) {
						if (i == 0) {
							var th = document.createElement('th');
							var keyText = document.createTextNode(key);
							th.appendChild(keyText);
							headerRow.appendChild(th);
						}
						var value = row[key];
						if (value == null) value = "";
						var td = document.createElement('td');
						var valueText = document.createTextNode(value);
						td.appendChild(valueText);
						normalRow.appendChild(td);
					}
					tbody.appendChild(normalRow);
				}
			} else if (result instanceof Object) {
				var headerRow = document.createElement('tr');
				tbody.appendChild(headerRow);
				var normalRow = document.createElement('tr');
				tbody.appendChild(normalRow);
				for (var key in result) {
					var th = document.createElement('th');
					var keyText = document.createTextNode(key);
					th.appendChild(keyText);
					headerRow.appendChild(th);
					var value = result[key];
					if (value == null) value = "";
					var td = document.createElement('td');
					var valueText = document.createTextNode(value);
					td.appendChild(valueText);
					normalRow.appendChild(td);
				}
			}
			this.setResult(table);
		}, null, evt => {
			this.runButton.disabled = this.xlsxButton.disabled = this.copyButton.disabled = false;
		});
	}
	
	setResult(node)
	{
		//this.resultsCtrl.value = result;
		if (this.resultContainer.firstChild) this.resultContainer.firstChild.remove();
		if (node) this.resultContainer.appendChild(node);
	}
	
	prepareXLSX()
	{
		var queries = ((typeof ace !== 'undefined' ? this.queryCtrl.getValue() : this.queryCtrl.value).split(';')).filter(function(value) {
			return value.trim().length > 0;
		});
		var queryCount = queries.length;
		if (queryCount < 1) return;
		
		this.runButton.disabled = this.xlsxButton.disabled = this.copyButton.disabled = true;
		this.xlsxButton.textContent = '0/'+queryCount;
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
			DB.query(query, function(dataset, metaData, q) {
				datasets[q] = dataset;
				colInfo[q] = metaData;
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
				this.xlsxButton.textContent = counter+'/'+queryCount;
				if (counter == queryCount) {
					this.runButton.disabled = this.xlsxButton.disabled = this.copyButton.disabled = false;
					this.xlsxButton.textContent = 'XLSX';
					if (errorCount > 0) alert(errorCount + ' ' + (errorCount > 1 ? 'errors' : 'error') + ' encountered. See export file for more info.');
					this.generateXLSX(datasets, colInfo);
				}
			}, q);
		}
	}
	
	generateXLSX(datasets, colInfo)
	{
		function Workbook() {
			if(!(this instanceof Workbook)) return new Workbook();
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
					headerRow.push(colInfo[d][m]);
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
		var outputFileName = Math.floor(Date.now() / 1000).toString();
		saveAs(new Blob([LSQueryWindowTools.arrayBufferFromString(wbout)],{type:"application/octet-stream"}), outputFileName + ".xlsx");
	}
	
	copyResults()
	{
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
	
	exit()
	{
		this.dispatchEvent(new Event('quit'));
	}
}

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
}

window.customElements.define('ls-querywindow', LSQueryWindow);