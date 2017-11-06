'use strict';

class ACApp extends ACFlexGrid
{
	constructor(parentNode)
	{
		super(parentNode);

		// remove empty text node that WebKit inputs when document.body is blank
		/*var observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (mutation.previousSibling) mutation.previousSibling.remove();
				observer.disconnect();
			});    
		});
		observer.observe(document.body, { attributes: true, childList: true, characterData: true });*/
		
		document.addEventListener('keydown', evt => {
			if (evt.ctrlKey && evt.key != 'Control') {
				var doPropagate = false;
				switch(evt.key) {
					case 'Enter': this.onAppCommand.call(this, 'enter'); break;
					case 'd': this.onAppCommand.call(this, 'eof'); break;
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
	}
	
	setName(name)
	{
		this.name = document.title = name;
	}
	
	setVersion(version)
	{
		this.version = version;
	}
	
	onAppCommand(command)
	{
		console.log('App command issued: ' + command);
	}
}

window.customElements.define('ac-app', ACApp);