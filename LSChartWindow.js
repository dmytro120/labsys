'use strict';

class LSChartWindow extends ACController
{
	constructor(rootNode)
	{
		super(rootNode);
		
		this.grid = new ACFlexGrid(this.rootNode);
		this.grid.setLayout(['98%', '2%'], ['98%', '2%']);
		
		google.charts.load('current', {'packages':['corechart']});
		google.charts.setOnLoadCallback(evt => {
			var query = '';
			var statuses = ['U', 'I', 'P', 'C', 'A', 'R', 'X'];
			for (var o = 0; o < statuses.length; o++) {
				if (o != 0) query += "UNION ";
				query += "SELECT '" + statuses[o] + "' status, " + o + " ord, COUNT(*) count FROM sample WHERE status = '" + statuses[o] + "' ";
			}
			query += "ORDER BY ord";
			
			DB.query(query,
			rows => {
				this.data = google.visualization.arrayToDataTable([
					['Status', 'Sample Count'],
					['Unreceived (U)', rows[0].count],
					['Incomplete (I)', rows[1].count],
					['In Progress (P)', rows[2].count],
					['Complete (C)', rows[3].count],
					['Authorised (A)', rows[4].count],
					['Rejected (R)', rows[5].count],
					['Cancelled (X)', rows[6].count]
				]);

				var options = {
					title: 'Sample Statuses'
				};

				this.chart = new google.visualization.PieChart(this.grid.cell(0,0));
				google.visualization.events.addListener(this.chart, 'select', this.browseSamples.bind(this));
				this.chart.draw(this.data, options);
			});
		});
	}
	
	onAttached()
	{
		this.rootNode.appendChild(this.grid);
	}
	
	browseSamples()
	{
		var selectedItem = this.chart.getSelection()[0];
		if (selectedItem) {
			var value = this.data.getValue(selectedItem.row, 0);
			var matches = value.match(/\([A-Z]\)/);
			if (!matches || matches[0].length != 3) return;
			var sampleStatus = matches[0][1];
			
			DB.query("\
				SELECT sample_number, text_id, status \
				FROM sample \
				WHERE status = '"+sampleStatus+"' \
				ORDER BY 1 DESC "
			, rows => {
				var browser = new ACBrowseDialog(document.body);
				browser.setTitle('Samples');
				browser.setHeadings(['Sample №', 'Text ID', 'Status']);
				
				rows.forEach(row => {
					var item = browser.addItem(row);
					item.onclick = evt => {
						browser.close();
						//var app = document.body.getElementsByTagName('ls-labsys')[0]; //document.body.firstChild;
						//app.initMode(LSSampleWindow, {fromCode: true, sample: row.sample_number});
					};
				});
				
				browser.addEventListener('close', evt => {
					this.chart.setSelection();
				});
				
				browser.display();
			});
		}
	}
	
	onAppCommand(command)
	{
		switch (command) {
			case 'eof': this.exit(); break;
		}
	}
	
	exit()
	{
		this.dispatchEvent('quit');
	}
}