async function modelNumberAvailability(modelNumber) {
  let data = await fetch(`/product/modelNumberAvailability/${modelNumber}`)
    .then((response) => response.json())
    .then((data) => {
      return data;
    });
  return data;
}

$(document).ready(function () {
  $('#model_no').blur(async function () {
    // Trim model_no
    const modelNumber = $(this)
      .val()
      .toUpperCase()
      .replace(/[^0-9A-Z]+/g, ' ')
      .trim()
      .replace(/[\s-]+/g, '-');
    $(this).val(modelNumber);
    const parent = $(this).parent();
    if (modelNumber) {
      const availability = await modelNumberAvailability($(this).val());
      let svgName, message, colourType = '';
      if (availability) {
        $(this).removeClass('is-invalid').addClass('is-valid');
        svgName = `check-circle-fill`;
        message = 'Can use';
        colourType = 'Success';
      } else {
        $(this).removeClass('is-valid').addClass('is-invalid');
        svgName = `exclamation-triangle-fill`;
        message = 'This model number is already in use';
        colourType = 'Danger';
      }
      parent.children('div.alert').remove();
      $(this).after(
        `<div class='alert alert-${colourType.toLowerCase()} py-1 my-2 px-2'>
          <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="${colourType}:"><use xlink:href="#${svgName}"/></svg>
          ${message}
        </div>`,
      );
    } else {
      $(this).removeClass('is-invalid is-valid');
      parent.children('div.alert').remove();
    }
  });

  $('#createProductForm').submit(function (e) {
    if (!$('#model_no').hasClass('is-valid')) {
      return false;
    }
  });
});
