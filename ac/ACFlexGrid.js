'use strict';

class ACFlexGrid extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
		this.cells = [];
	}
	
	empty()
	{
		this.cells = [];
		this.clear();
	}
	
	setSize(width, height)
	{
		if (width) this.style.width = width;
		if (height) this.style.height = height;
	}
	
	setLayout(rowSizes, colSizes, debug)
	{
		if ((!rowSizes || rowSizes.constructor !== Array) || (!colSizes || colSizes.constructor !== Array)) {
			console.log('[FlexGrid setLayout] Wrong input parameters, expecting: Array rowSizes, Array colSizes.');
			return false;
		}
		this.empty();
		for (var r = 0, rA = 0; r < rowSizes.length; r++) {
			var row = new ACFlexGridRow(this);
			var cellHeight = rowSizes[r];
			this.cells[r] = [];
			for (var c = 0, cA = 0; c < colSizes.length; c++) {
				var cell = new ACFlexGridCell(row);
				var cellWidth = colSizes[c];
				cell.style.width = cellWidth;
				cell.style.height = cellHeight;
				if (debug) {
					cell.textContent = r.toString() + ', ' + c.toString();
					var c1 = Math.random()*256|0;
					var c2 = Math.random()*256|0;
					var c3 = Math.random()*256|0;
					cell.style.backgroundColor = 'rgb('+c1+','+c2+','+c3+')';
				}
				this.cells[rA][cA] = cell;
				cA++;
			}
			rA++;
		}
	}
	
	addSizer(pos, type)
	{
		var cell = type == AC_DIR_VERTICAL ? this.cell(0, pos + 1) : this.cell(pos + 1, 0);
		if (!cell) return;
		
		var sizer = new ACFlexGridSizer(null, type);
		sizer.addEventListener('resized', e => {
			this.dispatchEvent(new CustomEvent('layoutChanged'));
		});
		cell.prepend(sizer);
		return sizer;
	}
	
	cell(row, col)
	{
		if ((typeof row === 'undefined' || row.constructor !== Number) || (typeof col === 'undefined' || col.constructor !== Number)) {
			console.log('[FlexGrid cell] Wrong input parameters, expecting: Number row, Number col.');
			return false;
		}
		if (!this.cells[row] || !this.cells[row][col]) {
			console.log('[FlexGrid cell] Cell '+row+','+col+' does not exist.');
			return false;
		}
		return this.cells[row][col];
	}
}

class ACFlexGridRow extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
	}
}

class ACFlexGridCell extends ACControl
{
	constructor(parentNode)
	{
		super(parentNode);
	}
}

class ACFlexGridSizer extends ACControl
{
	constructor(parentNode, type)
	{
		super(parentNode);
		this.setAttribute('draggable', true);
		this.blankImage = document.createElement('img');
		this.addEventListener('drop', e => {});
		
		this.addEventListener('dragstart', e => {
			e.dataTransfer.setDragImage(this.blankImage, 0, 0);
		});
		
		this.addEventListener('dragend', e => {
			this.dispatchEvent(new CustomEvent('resized'));
		});
		
		if (type == AC_DIR_VERTICAL) {
			this.classList.add('lr');
			this.addEventListener('drag', e => {
				if (!this.cellToResize && this.parentNode && this.parentNode.previousSibling) {
					this.cellToResize = this.parentNode.previousSibling;
				}
				if (e.clientX && this.cellToResize) this.cellToResize.style.width = (e.clientX - 3) + 'px';
			});
		} else {
			this.classList.add('ud');
			
			this.addEventListener('drag', e => {
				if (!this.cellToResize && this.parentNode && this.parentNode.parentNode.previousSibling) {
					this.cellToResize = this.parentNode.parentNode.previousSibling.firstChild;
				}
				if (e.clientY && this.cellToResize) this.cellToResize.style.height = (e.clientY - 3 - 85) + 'px';
			});
		}
	}
}

window.customElements.define('ac-flexgrid', ACFlexGrid);
window.customElements.define('ac-flexgridrow', ACFlexGridRow);
window.customElements.define('ac-flexgridcell', ACFlexGridCell);
window.customElements.define('ac-flexgridsizer', ACFlexGridSizer);