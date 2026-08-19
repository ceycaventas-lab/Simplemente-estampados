module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Falta MERCADOPAGO_ACCESS_TOKEN en Vercel.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const title = String(body.title || 'Gorra personalizada').slice(0, 120);
    const description = String(body.description || '').slice(0, 250);
    const unitPrice = Number(body.unit_price);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return res.status(400).json({ error: 'Precio inválido.' });
    }

    const origin = `https://${req.headers.host}`;
    const preference = {
      items: [{
        id: `gorra-${Date.now()}`,
        title,
        description,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: unitPrice
      }],
      external_reference: `SE-${Date.now()}`,
      back_urls: {
        success: `${origin}/?pago=aprobado`,
        pending: `${origin}/?pago=pendiente`,
        failure: `${origin}/?pago=fallido`
      },
      auto_return: 'approved'
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', data);
      return res.status(mpResponse.status).json({ error: 'Mercado Pago rechazó la preferencia.', details: data });
    }

    return res.status(200).json({ id: data.id, init_point: data.init_point });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno al crear la preferencia.' });
  }
};
