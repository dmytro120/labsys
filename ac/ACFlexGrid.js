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
		this.type = type;
		this.classList.add(type == AC_DIR_VERTICAL ? 'lr' : 'ud');
		this.setAttribute('draggable', true);
		this.blankImage = document.createElement('img');
		
		this.addEventListener('drop', e => {});
		this.addEventListener('dragover', evt => {evt.preventDefault();});
		
		this.addEventListener('dragstart', e => {
			if (type == AC_DIR_VERTICAL) {
				this.cellToResize = this.parentNode.previousSibling;
				this.smallOffset = this.cellToResize.getBoundingClientRect().width + this.getOffset() - e.x;
			} else {
				this.cellToResize = this.parentNode.parentNode.previousSibling.firstChild;
				this.smallOffset = this.cellToResize.getBoundingClientRect().height + this.getOffset() - e.y;
			}
			e.dataTransfer.setDragImage(this.blankImage, 0, 0);
		});
		
		this.addEventListener('dragend', e => {
			this.dispatchEvent(new CustomEvent('resized'));
		});
		
		this.addEventListener('drag', this.resize.bind(this));
	}
	
	getOffset()
	{
		var gridRect = this.parentElement.parentElement.parentElement.getBoundingClientRect();
		return this.type == AC_DIR_VERTICAL ? gridRect.x : gridRect.y;
	}
	
	resize(e)
	{
		if (!this.cellToResize || !e.clientX || !e.clientY) return;
		if (this.type == AC_DIR_VERTICAL) this.cellToResize.style.width = (e.clientX + this.smallOffset - this.getOffset()) + 'px';
		else this.cellToResize.style.height = (e.clientY + this.smallOffset - this.getOffset()) + 'px';
	}
}

window.customElements.define('ac-flexgrid', ACFlexGrid);
window.customElements.define('ac-flexgridrow', ACFlexGridRow);
window.customElements.define('ac-flexgridcell', ACFlexGridCell);
window.customElements.define('ac-flexgridsizer', ACFlexGridSizer);