const axios = require('axios');
const crypto = require('crypto');

export default async function handler(req, res) {
    // Hanya menerima metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 1. Kunci Sandbox Katon Suryo Nugroho terpasang
    const va = process.env.IPAYMU_VA || '0000005727374098';
    const apiKey = process.env.IPAYMU_APIKEY || 'SANDBOXB039F314-2092-422A-BFC9-679C9C17AEA9';

    // 2. Menggunakan URL khusus Direct Payment[cite: 1]
    const url = 'https://sandbox.ipaymu.com/api/v2/payment/direct';

    // Menangkap harga dinamis dari layar tablet
    const { qty, totalPrice } = req.body;
    const finalPrice = totalPrice ? totalPrice.toString() : '10000';

    // 3. Merakit parameter khusus Direct Payment (Bebas Asuransi)[cite: 1]
    const body = {
        name: 'Pelanggan Orange Photobooth', // Nama pembeli wajib ada untuk Direct[cite: 1]
        phone: '081111111111',               // Telepon wajib ada untuk Direct[cite: 1]
        email: 'guest@orange.com',           // Email wajib ada untuk Direct[cite: 1]
        amount: finalPrice,                  // Total harga murni sesuai layar Kiosk[cite: 1]
        notifyUrl: 'https://orange-photobooth-zeta.vercel.app/api/webhook', // Endpoint penangkap sinyal Lunas[cite: 1]
        referenceId: 'TRX-' + Date.now(),    // ID Transaksi unik 
        paymentMethod: 'qris',               // Permintaan metode QRIS[cite: 1]
        paymentChannel: 'mpm'                // Saluran khusus QRIS Standar Nasional[cite: 1]
    };

    // 4. Meracik Tanda Tangan Kriptografi (Signature) sesuai standar iPaymu[cite: 1]
    const jsonBody = JSON.stringify(body);
    const bodyEncrypt = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${va}:${bodyEncrypt}:${apiKey}`;
    const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');

    try {
        // 5. Menembak server iPaymu secara diam-diam
        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
            }
        });

        // 6. Mengirim balasan teks QRIS kembali ke layar Kiosk Anda
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error dari iPaymu:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Gagal membuat tagihan iPaymu' });
    }
}