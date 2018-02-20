'use strict';

class LabSys extends ACApp
{
	constructor()
	{
		super(document.body);
		
		this.setName('LabSys');
		this.setVersion('0.0.4');
		this.setLayout(['82px', 'auto'], ['100%']);
		
		this.mainCell = this.cell(1,0);
		this.mainCell.style.verticalAlign = 'middle';
		
		/*var nb = new ACMenuBar(this.cell(0,0));
		nb.setStyle(ST_BORDER_BOTTOM);
		//nb.setHeading(this.name, this.initialUI.bind(this));
		nb.setItems({
			[this.name]: {
				'About...': this.about.bind(this),
				'Restart': this.restart.bind(this)
			},
			'Mode': {
				'Null Active Mode': this.setMode.bind(this, null),
				'Instantiated Mode Instances...': this.displayModeInstances.bind(this)
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
		
		var tb = new ACToolBar(this.cell(0,0));
		tb.setStyle(ST_BORDER_BOTTOM);
		tb.setItems([
			{caption: 'Clear', icon: 'sweep.png', action: this.setMode.bind(this, null) },
			{caption: 'Modes', icon: 'switch.png', action: this.displayModeInstances.bind(this) },
			{caption: 'Tables', icon: 'table-edit.png', action: this.initMode.bind(this, LSTableManager) },
			{caption: 'Samples', icon: 'beaker.png', action: this.initMode.bind(this, LSSampleWindow) },
			{caption: 'Query', icon: 'db.png', action: this.initMode.bind(this, LSQueryWindow) },
			{caption: 'Scripts', icon: 'script2.png', action: this.initMode.bind(this, LSScriptWindow) },
			{caption: 'Charts', icon: 'chart.png', action: this.initMode.bind(this, LSChartWindow) },
			{caption: 'Map', icon: 'globe.png', action: this.initMode.bind(this, ACMapView) }/*,
			{caption: 'Info', icon: 'info.png', action: this.about.bind(this) }*/
		]);
		
		var captionCtrl = tb.setCaption(this.name.toLowerCase());
		captionCtrl.style.fontFamily = 'FuturaO';
		captionCtrl.addEventListener('click', e => {
			this.about();
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
			return;
		}
		
		this.mainCell.clear();
		
		this.activeMode = mode;
		
		this.mainCell.appendChild(mode);
		var modeAttachedFn = mode.onAttached;
		if (modeAttachedFn) modeAttachedFn.call(mode, params);
	}
	
	deleteModeByClassName(className)
	{
		var mode = this.modes[className];
		if (this.activeMode == mode) this.setMode();
		delete this.modes[className];
	}
	
	displayModeInstances()
	{
		var modal = new ACDialog(document.body);
		modal.setTitle('Instantiated Mode Instances');
		
		if (Object.keys(this.modes).length > 0) {
			modal.contentCell.style.padding = '0';
			var lb = new ACListBox(modal.contentCell);
			for (var className in this.modes) {
				var li = lb.addItem(className, className);
				li.targetMode = this.modes[className];
				li.ondblclick = event => {
					this.setMode(event.target.targetMode);
					modal.close();
				};
			}
			modal.addButton('Go To', evt => {
				var si = lb.getSelectedItem();
				if (si) {
					this.setMode(si.targetMode);
					modal.close();
				}
			});
			modal.addButton('Release', evt => {
				var si = lb.getSelectedItem();
				if (si) {
					this.deleteModeByClassName(si.dataset.id);
					lb.removeItemById(si.dataset.id);
					if (lb.itemCount() < 1) {
						modal.contentCell.remove();
						modal.footerCell.style.borderTopWidth = '0';
					}
				}
			});
		} else {
			modal.contentCell.remove();
			modal.footerCell.style.borderTopWidth = '0';
		}
		
		modal.display();
	}
	
	about()
	{
		var modal = new ACAboutModal(document.body);
		modal.setTitle(this.name + ' ' + this.version);
		modal.setImagePath('rsrc/about.jpg');
		modal.setURL('http://dmytro.malikov.us/labsys/');
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

window.customElements.define('ls-labsys', LabSys);