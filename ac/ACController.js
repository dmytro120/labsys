class ACController
{
	constructor(rootNode)
	{
		this.eventListeners = {};
		this.rootNode = rootNode;
	}
	
	addEventListener(eventName, fn)
	{
		if (!this.eventListeners[eventName]) this.eventListeners[eventName] = [];
		this.eventListeners[eventName].push(fn);
	}
	
	dispatchEvent(eventName)
	{
		var listeners = this.eventListeners[eventName];
		if (!listeners) return;
		listeners.forEach(listener => listener());
	}
}