import * as XLSX from 'xlsx';
const monthName = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

export const formatDate = (
  date: Date | number | string = new Date(),
  format: string = 'yyyy-MM-dd', // based on C# date/time formatting
  timeOffset: number = 0, // in milliseconds
) => {
  date = new Date(date);
  if (timeOffset) date = new Date(date.getTime() + timeOffset);
  const pad = (num: number) => ('0' + num).slice(-2);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hr24 = date.getUTCHours();
  const hr12 = hr24 > 12 ? hr24 - 12 : hr24;
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  return (
    format
      .replace(/yyyy/gi, year.toString())
      .replace(/yy/gi, year.toString().slice(-2))
      .replace(/MMMM/g, monthName[month])
      .replace(/MMM/g, monthName[month].slice(0, 3))
      .replace(/MM/g, pad(month))
      .replace(/M/g, month.toString())
      // .replace(/dddd/g, WEEKDAY) // TODO
      // .replace(/ddd/g, ABBREVIATED WEEKDAY) // TODO
      .replace(/dd/gi, pad(day))
      .replace(/d/gi, day.toString())
      .replace(/hh/g, pad(hr12))
      .replace(/h/g, hr12.toString())
      .replace(/HH/g, pad(hr24))
      .replace(/H/g, hr24.toString())
      .replace(/mm/g, pad(minute))
      .replace(/m/g, minute.toString())
      .replace(/ss/gi, pad(second))
      .replace(/s/gi, second.toString())
  );
};

export const imageFileFilter = (req, file, callback) => {
  if (
    file.mimetype.slice(0, 5) !== 'image' ||
    !file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
  ) {
    callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};
export const JSONToExcelConvertor = (JSONData, ReportTitle) => {
  const arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;

  //Initialize a workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(arrData);
  autofitColumns(arrData, ws);
  //let ws;
  //ws = await this.ecshipFormatValue(arrData);
  XLSX.utils.book_append_sheet(wb, ws, ReportTitle);
  return wb;
};
export const autofitColumns = (json: any[], worksheet: XLSX.WorkSheet) => {
  const objectMaxLength: number[] = [];

  json.map((jsonData) => {
    Object.entries(jsonData).map(([, v], idx) => {
      const columnValue = v as string;
      if (columnValue != null) {
        objectMaxLength[idx] =
          objectMaxLength[idx] >= columnValue.length
            ? objectMaxLength[idx]
            : columnValue.length;
      }
    });
  });
  const wscols = objectMaxLength.map((w: number) => ({ width: w }));
  worksheet['!cols'] = wscols;
};
