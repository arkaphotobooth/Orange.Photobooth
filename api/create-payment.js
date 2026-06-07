const axios = require('axios');
const crypto = require('crypto');

export default async function handler(req, res) {
    // Hanya menerima komunikasi via metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // ⚠️ PENTING: Ganti dengan VA dan API Key SANDBOX Anda
    const va = process.env.IPAYMU_VA || '0000005727374098';
    const apiKey = process.env.IPAYMU_APIKEY || 'SANDBOXB039F314-2092-422A-BFC9-679C9C17AEA9';

    // Menggunakan URL Sandbox iPaymu untuk testing
    const url = 'https://sandbox.ipaymu.com/api/v2/payment';

    // Menyiapkan data keranjang sesuai dokumentasi iPaymu
    const body = {
        product: ['Cetak Kiosk Generasi Pertama'], // Nama produk
        qty: ['1'], // Jumlah
        price: ['10000'], // Harga Rp 10.000
        returnUrl: 'https://orange-photobooth-zeta.vercel.app/success', // URL jika sukses
        cancelUrl: 'https://orange-photobooth-zeta.vercel.app/cancel',   // URL jika batal
        notifyUrl: 'https://orange-photobooth-zeta.vercel.app/api/webhook', // URL target untuk Webhook nanti
        referenceId: 'TRX-' + Date.now(), // Membuat ID Transaksi unik otomatis
        paymentMethod: 'qris' // Memaksa halaman pembayaran langsung menampilkan QRIS
    };

    // Proses meracik Signature Kriptografi (Keamanan iPaymu)
    const jsonBody = JSON.stringify(body);
    const bodyEncrypt = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${va}:${bodyEncrypt}:${apiKey}`;
    const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');

    try {
        // Mengirim permintaan ke server iPaymu
        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) // Format waktu YYYYMMDDHHMMSS
            }
        });

        // Jika sukses, iPaymu akan membalas dengan link pembayaran
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error dari iPaymu:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Gagal membuat tagihan iPaymu' });
    }
}