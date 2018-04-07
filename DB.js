class DB
{
	static query(query, okFn, failFn, thenFn, id)
	{
		var xhr = new XMLHttpRequest();
		
		var xhrID;
		while (!xhrID || xhrID in DB.XHRs) xhrID = this.generateGUID();
		xhr.LSXHRID = xhrID;
		DB.XHRs[xhrID] = xhr;
		
		xhr.addEventListener('load', this.onLoad.bind(this, xhr, okFn, failFn, thenFn, id));
		xhr.addEventListener('error', this.onError.bind(this, xhr, thenFn, id));
		xhr.addEventListener('abort', this.onAbort.bind(this, xhr));
		
		if (query.slice(-1) != '/') query = encodeURIComponent(query);
		xhr.open('GET', 'http://localhost:7000' + '/' + query);
		xhr.send();
	}
	
	static onLoad(xhr, okFn, failFn, thenFn, id)
	{
		delete DB.XHRs[xhr.LSXHRID];
		if (xhr.status != 200) {
			if (failFn) failFn.call(this, xhr.responseText, id);
			else alert(xhr.responseText);
			if (thenFn) thenFn.call(this, id);
			return;
		}
		try {
			var response = JSON.parse(xhr.responseText);
		} catch (e) {
			if (failFn) failFn.call(this, xhr.responseText, id);
			else alert(xhr.responseText);
			if (thenFn) thenFn.call(this, id);
			return;
		}
		if (response && okFn) {
			if ('rows' in response && 'info' in response) okFn.call(this, response.rows, response.info, id);
			else okFn.call(this, response, {}, id);
			if (thenFn) thenFn.call(this, id);
		}
	}
	
	static onError(xhr, thenFn, id)
	{
		delete DB.XHRs[xhr.LSXHRID];
		DB.abortAll();
		alert('LSE1000: No connexion to LDBC.')
		if (thenFn) thenFn.call(this, id);
	}
	
	static onAbort(xhr)
	{
		delete DB.XHRs[xhr.LSXHRID];
	}
	
	static abortAll()
	{
		for (var id in DB.XHRs) DB.XHRs[id].abort();
	}
	
	static generateGUID()
	{
		var S4 = function() {
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		};
		return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	}
}
DB.XHRs = [];