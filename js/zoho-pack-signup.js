(function () {
  const ZOHO_ACTION = 'https://zgnp-zngp.maillist-manage.com/weboptin.zc';
  const FRAME_NAME = '_npZohoPackSignup';
  const FORM_FIELDS = {
    submitType: 'optinCustomView',
    formType: 'QuickForm',
    zx: '137579d3f',
    zcvers: '3.0',
    oldListIds: '',
    mode: 'OptinCreateView',
    zcld: '11751fe88eb26a386',
    zctd: '11751fe88eb25ff71',
    zc_trackCode: 'ZCFORMVIEW',
    zc_formIx: '3zd421f8326a310cfb35d893930f06c2604ed1d72d7b0250057c008c62051a53d8',
    scriptless: 'yes'
  };

  function getResponseFrame() {
    let frame = document.querySelector(`iframe[name="${FRAME_NAME}"]`);
    if (!frame) {
      frame = document.createElement('iframe');
      frame.name = FRAME_NAME;
      frame.title = 'Nomadic Paws signup response';
      frame.hidden = true;
      document.body.appendChild(frame);
    }
    return frame;
  }

  function addField(form, name, value) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value || '';
    form.appendChild(input);
  }

  function submit({ email, firstName = '' }) {
    if (!email) return Promise.reject(new Error('Please enter your email address.'));

    const frame = getResponseFrame();
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = ZOHO_ACTION;
    form.target = FRAME_NAME;
    form.hidden = true;

    addField(form, 'CONTACT_EMAIL', email);
    addField(form, 'FIRSTNAME', firstName);
    Object.entries(FORM_FIELDS).forEach(([name, value]) => addField(form, name, value));
    document.body.appendChild(form);

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        form.remove();
        reject(new Error('The signup is taking longer than expected. Please try again.'));
      }, 15000);

      frame.addEventListener('load', () => {
        window.clearTimeout(timeout);
        form.remove();
        resolve({
          message: 'Almost there! Check your inbox and confirm your email to officially join the Pack.'
        });
      }, { once: true });

      form.submit();
    });
  }

  window.NomadicPawsPackSignup = { submit };
})();
