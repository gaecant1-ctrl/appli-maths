
    const ROWS = 5, COLS = 5;
    const BASE_SIZE = 15;
    let BRICK_HEIGHT = 1;
    let lastSelection = null;




const sheets = jspreadsheet(document.getElementById('spreadsheet'), {
  worksheets: [{
    minDimensions: [COLS, ROWS],
columns: Array(COLS).fill({
  type: 'numeric',
  width: 30
}),
    rows: Array(ROWS).fill({ height: 30 }),
    data: Array(ROWS).fill().map(() => Array(COLS).fill('')),
    columnHeaders: false,
    rowHeaders: false,
    allowFill: true
  }],

  onselection: (ws, x1, y1, x2, y2) => {
    lastSelection = [x1,y1,x2,y2];
  },

  onafterchanges: (instance, records) => {
    if (!records || !records.length) return;
    requestAnimationFrame(() => {
  refreshColors();
})
  },
  onchange: (instance, cell, x, y, value) => {
  valider();
}
});

const ws = sheets[0];