import ExcelJS from 'exceljs';

const SRC = 'C:\\Users\\green\\Desktop\\定価価格と通常販売価格.xlsx';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(SRC);

for (const ws of wb.worksheets) {
  console.log(`\n=== Sheet: ${ws.name} (${ws.rowCount} rows x ${ws.columnCount} cols) ===`);
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      let v = cell.value;
      if (v && typeof v === 'object') {
        if ('result' in v) v = v.result;
        else if ('richText' in v) v = v.richText.map(r => r.text).join('');
        else if ('formula' in v) v = `=${v.formula}`;
        else v = JSON.stringify(v);
      }
      cells.push(v === null || v === undefined ? '' : String(v));
    });
    console.log(`R${rowNumber}: ${cells.map(c => `[${c}]`).join(' ')}`);
  });
}
