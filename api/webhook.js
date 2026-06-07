const crypto = require('crypto');

export default async function handler(req, res) {
    // Webhook iPaymu selalu mengirim data menggunakan metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // ⚠️ PENTING: Untuk validasi Webhook, iPaymu menggunakan Nomor VA sebagai Secret Key
    const secretKey = process.env.IPAYMU_VA || '1179005727374098';

    // 1. Ambil data yang dikirim oleh iPaymu
    const data = req.body;

    // 2. Pisahkan signature bawaan dari iPaymu
    const receivedSignature = data.signature;
    delete data.signature; // Hapus signature dari data sebelum diurutkan

    try {
        // 3. Urutkan data berdasarkan key (Ascending A-Z) sesuai syarat iPaymu
        const sortedKeys = Object.keys(data).sort();
        const sortedData = {};
        sortedKeys.forEach(key => {
            sortedData[key] = data[key];
        });

        // 4. Konversi menjadi string JSON dan gabungkan dengan rumus HMAC-SHA256
        const jsonString = JSON.stringify(sortedData);
        const generatedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(jsonString)
            .digest('hex');

        // 5. Bandingkan! Jika beda, berarti itu hacker. Jika sama, berarti resmi dari iPaymu.
        if (generatedSignature !== receivedSignature) {
            console.error('Peringatan: Ada percobaan Webhook palsu (Signature Meleset).');
            return res.status(401).json({ message: 'Unauthorized signature' });
        }

        console.log('Validasi Berhasil! Laporan dari iPaymu:', data);

        // Cek apakah status transaksinya 'berhasil' atau kodenya '1'
        if (data.status === 'berhasil' || data.status === '1' || data.status_code === '1') {
            const referenceId = data.reference_id; // Ini adalah TRX-xxxx yang kita buat di create-payment.js

            // ==========================================
            // RUANG KOSONG UNTUK DATABASE FIREBASE ANDA
            // Nanti kode untuk update status dari "pending" 
            // menjadi "paid" akan kita letakkan di sini.
            // ==========================================

            console.log(`Mantap! Pembayaran untuk ${referenceId} LUNAS. Sinyal dikirim ke Firebase!`);
        }

        // Wajib merespons dengan HTTP 200 agar iPaymu tahu pesan sudah diterima. 
        // Jika tidak direspons, iPaymu akan mengirim ulang (spam) terus-menerus.
        res.status(200).send('OK');

    } catch (error) {
        console.error('Terjadi kesalahan saat memproses Webhook:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}