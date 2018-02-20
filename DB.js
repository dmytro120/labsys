class DB
{
	static query(query, okFn, failFn, thenFn, id)
	{
		var xhr = new XMLHttpRequest();
		xhr.addEventListener('load', this.onLoad.bind(this, xhr, okFn, failFn, thenFn, id));
		xhr.onerror = this.onError.bind(this, thenFn, id);
		xhr.open('GET', 'http://localhost:7000' + '/'+encodeURIComponent(query));
		xhr.send();
	}
	
	static onLoad(xhr, okFn, failFn, thenFn, id)
	{
		if (xhr.status != 200) {
			if (failFn) failFn.call(this, xhr.responseText, id);
			else alert(xhr.responseText);
			if (thenFn) thenFn.call(this, id);
			return;
		}
		try {
			var rows = JSON.parse(xhr.responseText);
		} catch (e) {
			if (failFn) failFn.call(this, xhr.responseText, id);
			else alert(xhr.responseText);
			if (thenFn) thenFn.call(this, id);
			return;
		}
		if (rows && okFn) {
			if ('rows' in rows) okFn.call(this, rows.rows, rows.metaData, id); // DDBC
			else okFn.call(this, rows, rows.length > 0 ? Object.keys(rows[0]) : [], id); // LDBC
			if (thenFn) thenFn.call(this, id);
		}
	}
	
	static onError(thenFn, id)
	{
		alert('LSE1000: No connexion to LDBC.')
		if (thenFn) thenFn.call(this, id);
	}
}