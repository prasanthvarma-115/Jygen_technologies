const MAX_TEXT_LENGTHS = {
  name: 181,
  email: 180,
  company: 150,
  service: 120,
  message: 5000,
};

function clean(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeContact(body = {}) {
  const firstName = clean(body.first_name, 90);
  const lastName = clean(body.last_name, 90);
  const name = clean(body.name || `${firstName} ${lastName}`.trim(), MAX_TEXT_LENGTHS.name);
  return {
    name,
    email: clean(body.email, MAX_TEXT_LENGTHS.email),
    company: clean(body.company, MAX_TEXT_LENGTHS.company),
    service: clean(body.service, MAX_TEXT_LENGTHS.service),
    message: clean(body.message ?? body.details, MAX_TEXT_LENGTHS.message),
    status: 'New',
  };
}

function validateContact(contact) {
  if (!contact.name || !contact.email || !contact.service || !contact.message) {
    return 'Name, email, service and message are required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    return 'Please enter a valid email address.';
  }
  if (contact.message.length < 10) {
    return 'Please provide at least 10 characters about your project.';
  }
  return null;
}

async function saveContact(body) {
  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseSecretKey = String(process.env.SUPABASE_SECRET_KEY || '');

  if (!supabaseUrl || !supabaseSecretKey) {
    const error = new Error('Supabase is not configured.');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }

  const contact = normalizeContact(body);
  const validationError = validateContact(contact);
  if (validationError) {
    const error = new Error(validationError);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/contacts`, {
    method: 'POST',
    headers: {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(contact),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Supabase insert failed: ${response.status} ${detail}`);
    error.code = 'SUPABASE_ERROR';
    throw error;
  }

  return contact;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    await saveContact(body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ ok: false, error: error.message });
    }
    if (error.code === 'NOT_CONFIGURED') {
      console.error(error.message);
      return res.status(500).json({ ok: false, error: 'Contact form is not configured yet.' });
    }
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Unable to send your inquiry right now.' });
  }
}

module.exports = handler;
module.exports.saveContact = saveContact;
