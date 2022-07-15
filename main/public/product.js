function getCategories(selectObject) {
  const value = selectObject.value;
  const parent = selectObject.parentElement;
  while (selectObject.nextSibling != null) {
    parent.removeChild(parent.lastChild);
  }
  if (value) {
    fetch(`/product/categories?id=${value}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          let id = selectObject.id.split('_');
          let new_id = id[0] + '_' + (parseInt(id[1]) + 1);

          selectObject.options[selectObject.selectedIndex];
          let display = `<select class="form-select" name="${new_id}" id="${new_id}" onchange="getCategories(this)"> 
        <option value>----</option>`;

          for (i = 0; i < data.length; i++) {
            display += `<option value=${data[i].id}>${data[i].name}</option>`;
          }
          display += '</select>';
          parent.insertAdjacentHTML('beforeend', display);
        }
      });
    if (selectObject.id == 'category_1') {
      document.getElementById(
        'size_range',
      ).innerHTML = `<option value>-- Please Select Size Range --</option>`;
      fetch(`/product/size?id=${value}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.length > 0) {
            data.forEach((element) => {
              const option = document.createElement('option');
              option.text = `${element.gender} ${element.displayName}`;
              option.value = element.gender;
              document.getElementById('size_range').appendChild(option);
            });
          }
        });
    }
  }
}

function getGenderAndType(selectObject) {
  /*
  Gender : {
      "9"     : "Mens",
      "10"    : "Womens",
      "226"   : "Kids",
      "848"   : "Baby",
      "861"   : "Unisex",
      "1873"  : "Others"
  }

  Type : {
      "7"     : "Shoes",
      "8"     : "Top",
      "49"    : "Bag",
      "50"    : "Accessories",
      "233"   : "Watch",
      "849"   : "Pants &amp; Shorts",
      "867"   : "Jackets &amp; Hoodie",
      "868"   : "Cap",
      "1870"  : "Other Apparel",
      "1871"  : "Set(Suit)",
      "1906"  : "Other Types"
  }
  */
  const sizeCode = selectObject.value.split(':')[0].substr(0, 1);
  //Size Baby K1 => Baby||Men||Kids?
  switch (sizeCode) {
    case 'M':
      genderID = '9';
      product_typeID = '7';
      break;
    case 'W':
      genderID = '10';
      product_typeID = '7';
      break;
    case 'B':
      genderID = '848';
      product_typeID = '7';
      break;
    case 'Y':
    case 'K': // Nike kids shoes
      genderID = '226';
      product_typeID = '7';
      break;
    case 'F':
      genderID = '861';
      product_typeID = '849';
      break;
    case 'U':
      genderID = '861';
      product_typeID = '849';
      break;
    case 'O':
      genderID = '861';
      product_typeID = '849';
      break;
    default:
      genderID = '9';
      product_typeID = '7';
      break;
  }

  document.getElementById('gender').value = genderID;
  document.getElementById('type').value = product_typeID;
}

function changeDate() {
  const input_releasedate = document.getElementById('releasedate');
  input_releasedate.value = formatDate(new Date());
}

function addImagePlaceholder(input, templateId) {
  const [file] = input.files;
  if (!file) return;

  const onClickDelete = (e) => {
    const itemCls = '.image-list-item';
    const el = e.target;
    const removeEl = el.closest(itemCls);
    removeEl.nextElementSibling.remove();
    removeEl.remove();

    const images = document.querySelectorAll(itemCls);
    if (!images.length) {
      const input = document.querySelector('#image-input');
      input.setAttribute('required', '');
    }
  };

  const wrapper = document.querySelector('#image-list');
  const link = URL.createObjectURL(file);
  const el = document
    .querySelector(`#${templateId}`)
    .content.firstElementChild.cloneNode(true);
  el.querySelector('a.image-link').href = link;
  el.querySelector('img.product-img').src = link;
  el.querySelector('.file-name').textContent = file.name;
  const btn = el.querySelector('.btn-delete');
  btn.onclick = onClickDelete;
  wrapper.appendChild(el);

  const parent = input.parentElement;
  const newInput = input.cloneNode();
  newInput.removeAttribute('required');
  newInput.value = '';
  parent.insertBefore(newInput, parent.querySelector('label.btn'));
  input.removeAttribute('id');
  input.removeAttribute('onchange');
  input.removeAttribute('required');
  input.setAttribute('class', 'd-none');
  wrapper.appendChild(input);
}

function downloadCSV(ReportTitle) {
  fetch(`/product/export/KC/${ReportTitle}`)
    .then((response) => response.json())
    .then((data) => {
      XLSX.writeFile(data, 'KC' + ReportTitle + new Date().getTime() + '.xlsx');
    });
}

function downloadShopify() {
  fetch(`/product/export/shopify`)
    .then((response) => response.json())
    .then((data) => {
      XLSX.writeFile(data, 'Shopify' + new Date().getTime() + '.xlsx');
    });
}
