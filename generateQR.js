const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Folder tempat menyimpan QR code
const outputDir = './qr-codes';

// Buat folder jika belum ada
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Fungsi untuk generate QR code
const generateQRCode = async (text, filePath) => {
    try {
        await QRCode.toFile(filePath, text);
        console.log(`Generated: ${filePath}`);
    } catch (err) {
        console.error(`Failed to generate QR code for ${text}:`, err);
    }
};

// Generate 200 QR codes
(async () => {
    for (let i = 1; i <= 200; i++) {
        const text = `Halo ${i}`;
        const filePath = path.join(outputDir, `qr_code_${i}.png`);
        await generateQRCode(text, filePath);
    }
})();
