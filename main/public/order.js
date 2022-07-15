const tableToExcel = (function () {
  let uri = 'data:application/vnd.ms-excel;base64,'
    , template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="https://www.w3.org/TR/html40/"><meta charset="utf-8"/><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>'
    , base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) }
    , format = function (s, c) { return s.replace(/{(\w+)}/g, function (m, p) { return c[p]; }) }
  return function (table, name, filename) {
    if (!table.nodeType) table = document.getElementById(table)
    let ctx = { worksheet: name || 'Worksheet', table: table.innerHTML }

    document.getElementById("dlink").href = uri + base64(format(template, ctx));
    document.getElementById("dlink").download = filename;
    document.getElementById("dlink").click();

  }
})()

function getListedOrderIds() {
  orderIds = [];
  document.querySelectorAll('#ordersTable tbody tr').forEach((el) => {
    const id = el.dataset['id'];
    id && orderIds.push(id);
  });
  return orderIds;
}

function downloadCSV(query, ReportTitle) {
  fetch(`/order/export?${query}&exportExcel=${ReportTitle}`)
    .then(response => response.json())
    .then(data => {
      XLSX.writeFile(data, 'KC' + ReportTitle + new Date().getTime() + '.xlsx');
    });
}

function printAwb(trigger, courier, orderIds) {
  let wrapper = trigger.closest('.dropdown-menu');
  if (wrapper) {
    wrapper = wrapper.closest('.btn-group');
  } else {
    wrapper = trigger.closest('.btn-group');
  }
  const btns = wrapper.querySelectorAll('button');
  
  if (btns[0].classList.contains('loading')) {
    return false;
  }

  if (!orderIds) {
    orderIds = getListedOrderIds();
  }
  if (!orderIds.length) {
    return false;
  }
  
  btns[0].classList.add('loading');
  btns.forEach((btn) => btn.classList.add('disabled'));

  const data = {};
  data.orderFilter = { order_id: orderIds.join(',') };
  if (courier) {
    data.courier = courier;
  }

  fetch('/shipping/create', {
    method: 'post',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    }
  })
    .then(async (res) => {
      const data = await res.blob();
      if (!data.size) {
        alert(
`unable to generate AWB, please try again later
possible reasons:
- order already has Tracking Number
- order status is not "Success2"`
        );
        return;
      }
      const file = new Blob([data], { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      
      const labelsPopup = window.open(fileUrl);
      labelsPopup.onload = (e) => {
        labelsPopup.print();
      };
    })
    .finally(() => {
      btns[0].classList.remove('loading');
      btns.forEach((btn) => btn.classList.remove('disabled'));
    });
}

function printLabel(type, orderIds) {
  if (!orderIds) {
    orderIds = getListedOrderIds();
  }

  let params = new URLSearchParams();
  params.append('labelType', type);
  params.append('orderIds', orderIds.toString());
  window.open('/order/exportLabels?' + params.toString());
}

if (typeof(jQuery) !== 'undefined') {
  // select2 init & bootsrap tooltip init
  $(document).ready(function () {
    $(".js-example-basic-multiple").select2();
  });
}
