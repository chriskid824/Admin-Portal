$(document).ready(function () {
  // bootsrap tooltip init
  let tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  let setDateString = (startdateObj) => {
    const enddateinputObj = $(`#${$(startdateObj).data('enddateinput')}`);
    const startdateString = $(startdateObj).data('datestring');
    const enddateString = enddateinputObj.data('datestring');
    if (startdateString && enddateString) {
      $(startdateObj).data('daterangepicker').setStartDate(startdateString);
      $(startdateObj).data('daterangepicker').setEndDate(enddateString);
    }
  };
  // Daterangepicker init
  $(function () {
    $('input.datetimepicker').daterangepicker({
      showDropdowns: true,
      autoUpdateInput: true,
      autoApply: true,
      defaultEmpty: true,
      alwaysShowCalendars: true,
      locale: {
        cancelLabel: 'Clear',
        format: 'YYYY-MM-DD',
      },
    });
    const datetimepickerList = $('input.datetimepicker');
    if (datetimepickerList.length > 1) {
      datetimepickerList.each((index, startdateObj) => {
        setDateString(startdateObj);
      });
    } else {
      const startdateObj = $('input.datetimepicker');
      setDateString(startdateObj);
    }
  });

  // Resize textarea
  $('textarea')
    .each(function () {
      this.setAttribute(
        'style',
        'height:' + this.scrollHeight + 'px;overflow-y:hidden;',
      );
    })
    .on('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    })
    .focusout(function () {
      this.style.height = 'auto';
      // replace , ; space and new line including consecutive duplicate with comma
      this.value = this.value.replace(/[,;\s\n]+/g, ',').replace(/^,|,$/g, '');
    })
    .focusin(function () {
      this.style.height = this.scrollHeight + 'px';
    });
});
