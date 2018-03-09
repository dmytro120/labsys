'use strict';

class LSImportWindow extends ACFlexGrid
{
	constructor(parentNode)
	{
		super(parentNode);
		this.setLayout(['10px', 'auto'], ['100%']);
		
		var tb = new ACToolBar(this.cell(0,0));
		tb.classList.add('lighter');
		tb.setIconSize('20x20');
		tb.setStyle(ST_BORDER_BOTTOM);
		tb.style.borderBottomColor = 'gray';
		tb.setItems([
			{caption: 'Exit', icon: 'quit.png', action: this.exit.bind(this) },
			{caption: 'Open Workbook', icon: 'open.png', action: this.browseForWorkbook.bind(this) }
		]);
		
		// this.cell(1,0)
	}
	
	onAttached()
	{
		
	}
	
	onDetached()
	{
		
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
		this.dispatchEvent(new Event('quit'));
	}
	
	browseForWorkbook()
	{
		
	}
}

window.customElements.define('ls-importwindow', LSImportWindow);