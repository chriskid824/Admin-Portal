// modify date range picker to handle separate input elements for start and end
// expects end input id assigned to data-enddateinput attribute on start input
(function () {
  if (!(window.$ && $.fn && $.fn.daterangepicker)) return;

  const orig = $.fn.daterangepicker;

  $.fn.daterangepicker = function (options, callback) {
    orig.bind(this)(options, callback);
    this.each(function () {
      const start = $(this);
      const endId = start.data('enddateinput');
      const end = $('#' + endId);
      if (endId && end) {
        const dp = start.data('daterangepicker');
        if (dp.autoUpdateInput) {
          const update = dp.updateElement = function () {
            if (this.element.is('input') && this.autoUpdateInput) {
              if (!start.val() &&
                this.startDate.isSame(this.oldStartDate) &&
                this.endDate.isSame(this.oldEndDate) &&
                (this.singleDatePicker || !end.val())
              ) return;

              var newValue = this.startDate.format(this.locale.format);
              if (newValue !== start.val()) {
                start.val(newValue).trigger('change');
              }
              if (!this.singleDatePicker) {
                newValue = this.endDate.format(this.locale.format);
                if (newValue !== end.val()) {
                  end.val(newValue).trigger('change');
                }
              }
            }
          }.bind(dp);
          if (options.defaultEmpty && !start.attr('val') && !end.attr('val'))
            start.add(end).val('');
          else
            update();
        }
        end.on('focus', () => { dp.element = end; dp.show(); })
          .on('hide.daterangepicker', () => dp.element = start);
      }
    });
    return this;
  };
})();


// form functions
function clearFormControl(el) {
  switch (el.tagName.toLowerCase()) {
    case 'select':
      for (let i = 0; i < el.options.length; i++) {
        el.options[i].selected = false;
      }
      return true;

    case 'input':
      switch (el.type) {
        case 'button':
        case 'hidden':
        case 'image':
        case 'reset':
        case 'submit':
          return false;
        case 'checkbox':
        case 'radio':
          el.checked = false;
          return true;
      }
    case 'textarea':
      el.value = '';
      return true;
  }
}

function clearForm(formElem) {
  for (let i = 0; i < formElem.elements.length; i++) {
    const el = formElem.elements[i];
    clearFormControl(el) && el.dispatchEvent(new Event('change'));
  }
  return false;
}

(function () {
  document.querySelectorAll('form').forEach((formElem) => {
    formElem.onreset = function (e) {
      for (let i = 0; i < e.target.elements.length; i++) {
        const el = e.target.elements[i];
        el.dispatchEvent(new Event('change'));
      }
    };
  });
})();

function getFetchPromiseByForm(formElem) {
  const data = new URLSearchParams();
  for (const pair of new FormData(formElem)) {
    data.append(pair[0], pair[1]);
  }
  return fetch(formElem.action, {
    method: formElem.method,
    body: data,
  })
    .then((res) => res.json())
    .finally(() => formElem.reset());
}


// link / <a> functions
(function () {
  // use fetch api instead of navigating directly to link
  document.querySelectorAll('a.fetch-link').forEach((el) => {
    el.dataset.defaultClass = el.getAttribute('class');
    el.dataset.defaultText = el.innerHTML;
    el.onclick = function (e) {
      const defaultCls = el.dataset.defaultClass;
      const loadingCls = el.dataset.loadingClass ?? (defaultCls + ' loading disabled');
      const loadedCls = el.dataset.loadedClass ?? defaultCls;
      const defaultTxt = el.dataset.defaultText;
      const loadingTxt = el.dataset.loadingText ?? (defaultTxt + ' ...');
      const loadedTxt = el.dataset.loadedText ?? defaultTxt;
      el.setAttribute('class', loadingCls);
      el.innerHTML = loadingTxt;
      fetch(el.href)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            el.setAttribute('class', loadedCls);
            el.innerHTML = loadedTxt;
          } else {
            el.setAttribute('class', defaultCls);
            el.innerHTML = defaultTxt;
            alert(`Error occurred: ${data.message}`);
          }
        });
      e.preventDefault();
    };
  });
})();


// comment functions
(function () {
  function updateCount(update) {
    const el = document.querySelector('#comment-count');
    if (!el) return;
    const count = parseInt(el.textContent);
    el.textContent = (isNaN(count) ? 0 : count) + (update ?? 1);
  }

  function onClickDelete(e) {
    const el = e.target;
    if (el.classList.contains('loading')) return false;
    el.classList.add('loading');
    el.classList.add('disabled');
    fetch('/comment/api/delete', {
      method: 'post',
      body: JSON.stringify({ id: el.dataset.id }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res) => res.json())
      .then(({ success }) => {
        let removeEl;
        if (success) {
          removeEl = el.closest('.list-group-item');
          updateCount(-1);
        }
        else
          removeEl = el;
        removeEl.remove()
      });
  }

  document.querySelectorAll('#comment-list .btn-delete').forEach(
    (btn) => btn.onclick = onClickDelete
  );

  const form = document.querySelector('#comment-form');
  form && (form.onsubmit = function (e) {
    getFetchPromiseByForm(e.target)
      .then(({ comment }) => {
        if (!comment) window.location.href = form.dataset.redirect;
        const el = document.querySelector('#comment-template')
          .content.firstElementChild.cloneNode(true);
        el.querySelector('.card-subtitle').textContent = comment.prettifiedCreateDate;
        el.querySelector('.card-text').textContent = comment.body;
        const btn = el.querySelector('.btn');
        btn.dataset.id = comment.id;
        btn.onclick = onClickDelete;
        document.querySelector('#comment-list').appendChild(el);
        updateCount();
      });
    e.preventDefault();
    return false;
  });
})();

function formatDate(date) {
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + (date.getUTCDate())).slice(-2);
  return date.getUTCFullYear() + '-' + month + '-' + day;
}

// order ID search functions
(function () {
  const orderPath = pathMap.order.list + '/view/';
  const searchPath = pathMap.order.search + '/';
  const searchInputMap = {};

  function inputListener(e) {
    const el = e.target;
    const wrapper = el.parentElement;
    const dropdown = searchInputMap[el.id].dropdown;
    const loadingCls = 'loading';
    window.clearTimeout(el.dataset.timeout);
    dropdown.hide();
    dropdown._element.innerHTML = '';

    let ctrl = searchInputMap[el.id].abortController;
    ctrl && ctrl.abort();

    if (!el.value) {
      wrapper.classList.remove(loadingCls);
      return;
    }

    wrapper.classList.add(loadingCls);

    el.dataset.timeout = window.setTimeout(() => {
      let ctrl = searchInputMap[el.id].abortController = new AbortController();

      fetch(searchPath + 'api/' + el.value, { signal: ctrl.signal })
        .then((res) => res.json())
        .then(({ orders }) => {
          dropdown._element.innerHTML = orders.length
            ? orders.reduce((html, { ref, name, email, amount, currency, status }) => {
              let refHtml = ref.toString().replace(el.value, `<strong>${el.value}</strong>`);
              return html +
                `<li><a class="dropdown-item" href="${orderPath}${ref}" tabindex="0">
                  ${refHtml} | 
                  ${name || '<span class="fw-lighter fst-italic">No name</span>'} / 
                  ${email || '<span class="fw-lighter fst-italic">No email</span>'} / 
                  ${currency}${amount} / 
                  ${status || '<span class="fw-lighter fst-italic">No status</span>'}
                </a></li>`;
            }, '<li><h6 class="dropdown-header">Suggested results</h6></li>')
            : '<li><span class="dropdown-item disabled">No orders found</span></li>';
          wrapper.classList.remove(loadingCls);
          (el.dataset.bsAutoClose !== 'true' || document.activeElement === el) && dropdown.show();
        })
        .catch((e) => {
          if (e.name !== 'AbortError' && !ctrl.signal.aborted) {
            console.error(e);
            wrapper.classList.remove(loadingCls);
          }
        });
    }, 500);
  }

  function blurListener(e) {
    const el = e.target;
    const dropdown = searchInputMap[el.id].dropdown;
    if (!e.relatedTarget || e.relatedTarget.closest('.dropdown-menu') !== dropdown._element)
      dropdown.hide();
  }

  function focusListener(e) {
    const el = e.target;
    const dropdown = searchInputMap[el.id].dropdown;
    if (!el.value || !dropdown._element.innerHTML) return;
    dropdown.show();
  }

  const clsName = 'order-id-search-input';
  const inputs = document.querySelectorAll('.' + clsName);
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const form = input.closest('form');
    // expects form element
    if (!form) {
      input.hidden = true;
      continue;
    }
    form.onsubmit = function (e) {
      window.location = searchPath + e.target.elements.search.value;
      e.preventDefault();
      return false;
    };
    const dropdown = new bootstrap.Dropdown(input.nextElementSibling);
    // force _inNavbar=true for correct position calculation
    dropdown._inNavbar = true;
    // force _menu=_element
    dropdown._menu = dropdown._element;
    input.id = input.id || (clsName + i);
    searchInputMap[input.id] = { dropdown };
    if (input.value) inputListener({ target: input });
    input.oninput = inputListener;
    if (input.dataset.bsAutoClose === 'true') {
      input.onblur = blurListener;
      input.onfocus = focusListener;
    }
  }
})();
