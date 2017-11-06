'use strict';

class ACMapView extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		
		this.style.height = '100%';
		navigator.geolocation.getCurrentPosition(function(pos) {
			this.drawMap.call(this, pos.coords.latitude, pos.coords.longitude);
		}.bind(this), function(e) {
			this.drawMap.call(this, 44.540, -78.546);
		}.bind(this));
	}
	
	drawMap(cLat, cLng)
	{
		this.map = new google.maps.Map(this, {
			center: {lat: cLat, lng: cLng},
			zoom: 8
		});
	}
}

window.customElements.define('ac-mapview', ACMapView);