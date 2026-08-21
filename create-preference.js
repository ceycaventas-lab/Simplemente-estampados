export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'Falta configurar MERCADOPAGO_ACCESS_TOKEN en Vercel' });
  }

  try {
    const { title, description, unit_price, quantity = 1 } = req.body || {};
    const price = Number(unit_price);
    const qty = Number(quantity);

    if (!title || !Number.isFinite(price) || price <= 0 || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Datos de pedido inválidos' });
    }

    const preference = {
      items: [
        {
          title: String(title).slice(0, 120),
          description: description ? String(description).slice(0, 250) : undefined,
          quantity: qty,
          currency_id: 'ARS',
          unit_price: price
        }
      ],
      statement_descriptor: 'SIMPLE ESTAMPADOS'
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', data);
      return res.status(mpResponse.status).json({ error: 'Mercado Pago rechazó la preferencia', details: data });
    }

    return res.status(200).json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
}
