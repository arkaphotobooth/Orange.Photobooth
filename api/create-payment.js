const axios = require('axios');
const crypto = require('crypto');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const va = process.env.IPAYMU_VA || '0000005727374098';
    const apiKey = process.env.IPAYMU_APIKEY || 'SANDBOXB039F314-2092-422A-BFC9-679C9C17AEA9';
    const url = 'https://sandbox.ipaymu.com/api/v2/payment';

    // 1. Menangkap data dinamis yang dikirim dari kiosk.html
    const { qty, totalPrice } = req.body;

    const finalQty = qty ? qty.toString() : '1';
    const finalPrice = totalPrice ? totalPrice.toString() : '10000';

    // 3. Merakit keranjang murni digital/jasa
    const body = {
        // Info jumlah lembar diselipkan ke nama produk agar pembeli tetap tahu
        product: [`Cetak Kiosk Orange Photobooth (${finalQty} Lembar)`],

        // KUNCI UTAMA: Paksa qty menjadi 1 agar iPaymu tidak mengalikan harga lagi
        qty: ['1'],

        // Ini sudah total harga akhir yang dihitung di tablet (contoh: 15000)
        price: [finalPrice],

        returnUrl: 'https://orange-photobooth-zeta.vercel.app/success',
        cancelUrl: 'https://orange-photobooth-zeta.vercel.app/cancel',
        notifyUrl: 'https://orange-photobooth-zeta.vercel.app/api/webhook',
        referenceId: 'TRX-' + Date.now(),
        paymentMethod: 'qris',
        feeDirection: 'MERCHANT',
        escrow: '0'
    };

    const jsonBody = JSON.stringify(body);
    const bodyEncrypt = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${va}:${bodyEncrypt}:${apiKey}`;
    const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');

    try {
        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
            }
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error dari iPaymu:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Gagal membuat tagihan iPaymu' });
    }
}