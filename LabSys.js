'use strict';

class LabSys
{
	constructor(rootNode)
	{
		this.rootNode = rootNode || document.body;
		
		this.name = document.title = 'LabSys';
		this.version = '0.0.5';
		
		this.grid = new ACFlexGrid(this.rootNode);
		this.grid.setLayout(['70px', 'auto'], ['100%']);
		
		this.mainCell = this.grid.cell(1,0);
		this.mainCell.style.verticalAlign = 'middle';
		
		/*var nb = new ACMenuBar(this.grid.cell(0,0));
		nb.setStyle(ST_BORDER_BOTTOM);
		//nb.setHeading(this.name, this.initialUI.bind(this));
		nb.setItems({
			[this.name]: {
				'About...': this.settings.bind(this),
				'Restart': this.restart.bind(this)
			},
			'Mode': {
				'Null Active Mode': this.setMode.bind(this, null),
				'Instantiated Mode Instances...': this.settings.bind(this)
			},
			'Configure': {
				'Manage Tables...': this.initMode.bind(this, LSTableManager)
			},
			'Run': {
				'Samples': this.initMode.bind(this, LSSampleWindow)
			},
			'Utilities': {
				'Query Window': this.initMode.bind(this, LSQueryWindow),
				'Script Window': this.initMode.bind(this, LSScriptWindow),
				'Map View': this.initMode.bind(this, ACMapView),
				'Chart Window': this.initMode.bind(this, LSChartWindow)
			}
			//'LabStation': {
			//	'Job Manager': null
			//},
			//'Options': {
			//	'Empower Interface': null
			//},
			//'Search': {
			//	'Run Code Search': null
			//},
		});*/
		
		this.tb = new ACToolBar(this.grid.cell(0,0), { type: 'primary' });
		this.tb.classList.add('ls-modebar');
		this.tb.setStyle(ST_BORDER_BOTTOM);
		this.tb.setRadio(true);
		this.tb.setItems([
			{caption: 'Tables', icon: 'tables-w.png', action: this.initMode.bind(this, LSTableManager), dataset: {mode: 'LSTableManager'} },
			{caption: 'Samples', icon: 'samples-w2.png', action: this.initMode.bind(this, LSSampleWindow), dataset: {mode: 'LSSampleWindow'} },
			{caption: 'Query', icon: 'query-w.png', action: this.initMode.bind(this, LSQueryWindow), dataset: {mode: 'LSQueryWindow'} },
			{caption: 'Scripts', icon: 'scripts-w.png', action: this.initMode.bind(this, LSScriptWindow), dataset: {mode: 'LSScriptWindow'} },
			{caption: 'Import', icon: 'import-w.png', action: this.initMode.bind(this, LSImportWindow), dataset: {mode: 'LSImportWindow'} },
			{caption: 'Charts', icon: 'charts-w.png', action: this.initMode.bind(this, LSChartWindow), dataset: {mode: 'LSChartWindow'} }/*,
			{caption: 'Map', icon: 'map-w.png', action: this.initMode.bind(this, ACMapView), dataset: {mode: 'ACMapView'} }*/
		]);
		
		var captionCtrl = this.tb.setCaption(this.name.toLowerCase());
		captionCtrl.style.fontFamily = 'FuturaO';
		captionCtrl.addEventListener('click', e => {
			this.settings();
		});
		
		/*var versionCtrl = new ACStaticCell(captionCtrl);
		versionCtrl.style.position = 'absolute';
		versionCtrl.style.fontSize = '8pt';
		versionCtrl.style.top = '63px';
		versionCtrl.style.right = '5px';
		versionCtrl.style.lineHeight = '8pt';
		versionCtrl.style.fontWeight = 'bold';
		versionCtrl.textContent = this.version;*/
		
		this.activeMode = null;
		this.modes = {};
		
		this.drawAtom();
		
		document.addEventListener('keydown', evt => {
			if ((evt.metaKey || evt.ctrlKey) && evt.key != 'Control') {
				var doPropagate = false;
				switch(evt.key) {
					case 'Enter': this.onAppCommand.call(this, 'enter'); break;
					case 'd': this.onAppCommand.call(this, 'eof'); break;
					case 'l': this.onAppCommand.call(this, 'layout'); break;
					case 'm': this.onAppCommand.call(this, 'move'); break;
					case 'n': this.onAppCommand.call(this, 'new'); break;
					case 'o': this.onAppCommand.call(this, 'open'); break;
					case 'p': this.onAppCommand.call(this, 'print'); break;
					case 's': this.onAppCommand.call(this, 'save'); break;
					default: doPropagate = true;
				}
				if (!doPropagate) evt.preventDefault();
			}
		}, false);
		
		window.onbeforeunload = e => {
			if (this.activeMode && this.activeMode.onDetached) this.activeMode.onDetached.call(this.activeMode);
		};
	}
	
	drawAtom()
	{
		var p = AC.create('p', this.mainCell);
		p.style.fontSize = '288pt';
		p.style.textAlign = 'center';
		p.style.color = '#ddd';
		p.textContent = '⚛'; //this.name + ' ' + this.version;
		p.style.userSelect = 'none';
	}
	
	onAppCommand(command)
	{
		if (this.activeMode && this.activeMode.onAppCommand) this.activeMode.onAppCommand(command);
	}
	
	initMode(modeClass, params)
	{
		var mode = this.modes[modeClass.name];	
		if (!mode) {
			mode = this.modes[modeClass.name] = new modeClass(this.mainCell);
			mode.addEventListener('quit', evt => {
				this.deleteModeByClassName(modeClass.name);
			});
		}
		this.setMode(mode, params);
	}
	
	setMode(mode, params)
	{
		if (mode == this.activeMode) {
			return;
		}
		
		if (this.activeMode && this.activeMode.onDetached) this.activeMode.onDetached.call(this.activeMode);
		
		if (!mode) {
			this.activeMode = null;
			this.mainCell.clear();
			this.drawAtom();
			this.tb.setActiveItem();
			return;
		}
		
		this.mainCell.clear();
		
		this.activeMode = mode;
		
		if (params && 'fromCode' in params && params.fromCode) {
			var toolbarItem = this.tb.querySelector('li[data-mode^="'+mode.constructor.name+'"]');
			if (toolbarItem) this.tb.setActiveItem(toolbarItem);
		}
		
		//this.mainCell.appendChild(mode);
		var modeAttachedFn = mode.onAttached;
		if (modeAttachedFn) modeAttachedFn.call(mode, params);
	}
	
	deleteModeByClassName(className)
	{
		var mode = this.modes[className];
		if (this.activeMode == mode) this.setMode();
		delete this.modes[className];
	}
	
	settings()
	{
		// Basic Modal Setup with header, content cell, and footer
		var modal = new ACModal(document.body);
		modal.contentArea.style.borderRadius = '0';
		
		var mh = new ACStaticCell(modal.contentArea);
		mh.classList.add('modal-header');
		mh.style.padding = '0';
		
		var contentCell = new ACStaticCell(modal.contentArea);
		contentCell.classList.add('modal-body');
		contentCell.style.padding = '0';
		
		// Radio Bar
		var radioBar = new ACToolBar(mh, { type: 'primary' });
		radioBar.setRadio(true);
		
		// Modes Sheet
		var modesSheet = new ACStaticCell(contentCell);
		var lastActiveSheet = modesSheet;
		
		var modeBtn = radioBar.addItem({
			caption: 'Modes', icon: 'switch.png', targetNode: modesSheet
		});
		radioBar.setActiveItem(modeBtn);
		
		var notice = new ACStaticCell(modesSheet);
		notice.textContent = 'No modes instantiated';
		notice.style.padding = '12px';
		
		if (Object.keys(this.modes).length > 0) {
			notice.style.display = 'none';
			var lb = new ACListBox(modesSheet);
			for (var className in this.modes) {
				var li = lb.addItem(className, className);
				li.targetMode = this.modes[className];
				li.ondblclick = event => {
					this.setMode(event.target.targetMode, {fromCode: true});
					modal.close();
				};
			}
		}
		
		var modesToolbar = new ACToolBar(modesSheet, { type: 'secondary' });
		modesToolbar.setStyle(ST_BORDER_BOTTOM);
		modesToolbar.style.borderTop = '1px solid #ddd';
		
		modesToolbar.addItem({
			caption: 'None', icon: 'sweep.png', action: evt => {
				this.setMode(null, {fromCode: true});
				modal.close();
			}
		});
		
		modesToolbar.addItem({
			caption: 'Destroy', icon: 'bin.png', action: evt => {
				if (!lb) return;
				var si = lb.getSelectedItem();
				if (si) {
					this.deleteModeByClassName(si.dataset.id);
					si.remove();
					if (lb.itemCount() < 1) {
						notice.style.display = 'block';
					}
				}
			}
		});
		
		modesToolbar.addItem({
			caption: 'Go To', icon: 'goto.png', action: evt => {
				if (!lb) return;
				var si = lb.getSelectedItem();
				if (si) {
					this.setMode(si.targetMode, {fromCode: true});
					modal.close();
				}
			} 
		});
		
		// About Sheet
		var aboutSheet = new ACStaticCell(contentCell);
		aboutSheet.style.padding = '12px';
		aboutSheet.style.display = 'none';
		var aboutBtn = radioBar.addItem({
			caption: 'About', icon: 'info.png', targetNode: aboutSheet
		});
		
		var hCell = new ACStaticCell(aboutSheet);
		hCell.textContent = this.name + ' ' + this.version;
		hCell.style.fontSize = 'x-large';
		
		var infoCell = new ACStaticCell(aboutSheet);
		infoCell.textContent = 'Laboratory informatics software';
		
		var a = AC.create('a', aboutSheet);
		a.target = '_blank';
		a.href = a.textContent = 'http://dmytro.malikov.us/labsys/';
		
		modal.display();
	}
	
	quit()
	{
		//document.body.clear();
	}
	
	restart()
	{
		document.body.clear();
		new LabSys();
	}
}

















