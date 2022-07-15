//--------------------------------------預覽上傳圖片資訊--------------------------------------
window.onload = function () {
  $('#image_uploads').fileinput({
    allowedFileExtensions: ['jpg', 'gif', 'png', 'jpeg'],
  });
  const form = document.getElementById('uploadImageForm');
  form.addEventListener('submit', submitForm);
  $('#image_uploads').on('filebatchselected', function (event, files) {
    document.getElementById('squarcheck').innerHTML = getCheckBoxGroups(files);
  });
};
//-------------------------------------------------------------------------------------
//--------------------------------------square image checkbox list--------------------------------------
function getCheckBoxGroups(files) {
  let innerHTML = '';
  for (const file of files) {
    const filename = getFilename(file.name);
    innerHTML += `<div class="form-check form-check-inline">
       <input class="form-check-input" type="checkbox" id='' value="${
         file.name
       }" ${filename.split('.').pop().toLowerCase() == 'main' ? 'checked' : ''}>
       <label class="form-check-label">${file.name}</label>
     </div>`;
  }
  return innerHTML;
}
function getFilename(fullPath) {
  return fullPath
    .replace(/^.*[\\\/]/, '')
    .split('.')
    .slice(0, -1)
    .join('.');
}
//-------------------------------------------------------------------------------------
//---------------------------------------multer上傳圖片---------------------------------------
function submitForm(e) {
  e.preventDefault();
  let squareList = [];

  console.info(squareList);
  const pid = document.getElementById('pid').value;
  const files = document.getElementById('image_uploads');
  const formData = new FormData();
  const url = `/product/images/` + pid;
  for (let i = 0; i < files.files.length; i++) {
    formData.append('files', files.files[i]);
  }
  $('input:checkbox:checked').each(function () {
    squareList.push($(this).val());
  });
  formData.append('squareList', squareList);
  fetch(url, {
    method: 'POST',
    body: formData,
  })
    .then((response) => response.json())
    .then((response) => {
      alert(response.message);
      if (response.success) {
        location.href = response.url;
      }
    })
    .catch((error) => console.error('Error:', error));
}
