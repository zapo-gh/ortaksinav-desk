const crypto = require('crypto');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const PRIVATE_KEY_HEX = '89ad8a0a1134f670d048215d7614e863aeda338406a5ca3feb2c395387f2483a';

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateLicense(expiryDate, isUniversal, schoolName, kurumKodu, machineId) {
    const dateCompact = expiryDate.replace(/-/g, '');
    const payload = {
        e: dateCompact,
    };
    if (!isUniversal) {
        payload.n = schoolName.trim();
        payload.k = kurumKodu.trim();
        payload.m = machineId.trim().toUpperCase();
    }

    const json = JSON.stringify(payload);
    const payloadHex = bytesToHex(new TextEncoder().encode(json)).toUpperCase();

    const pkcs8Header = '302e020100300506032b657004220420';
    const privDer = Buffer.from(pkcs8Header + PRIVATE_KEY_HEX, 'hex');
    const privateKey = crypto.createPrivateKey({
        key: privDer,
        format: 'der',
        type: 'pkcs8'
    });

    const sig = crypto.sign(null, Buffer.from(payloadHex), privateKey);
    const sigHex = sig.toString('hex').toUpperCase();

    const raw = payloadHex + sigHex;
    return raw.match(/.{1,4}/g).join('-');
}

console.log("=== Ortak Sınav Yerleşim Sistemi Lisans Anahtarı Üretici ===\n");
readline.question('Evrensel Lisans (Tüm cihazlarda geçerli) üretilsin mi? (e/h): ', isUni => {
    const isUniversal = isUni.toLowerCase() === 'e';
    readline.question('Bitiş Tarihi (YYYY-MM-DD): ', expiry => {
        if (isUniversal) {
            finish(expiry, true, "", "", "");
        } else {
            readline.question('Okul İsmi: ', schoolName => {
                readline.question('Kurum Kodu: ', kurumKodu => {
                    readline.question('Makine ID: ', machineId => {
                        finish(expiry, false, schoolName, kurumKodu, machineId);
                    });
                });
            });
        }
    });
});

function finish(expiry, isUniversal, schoolName, kurumKodu, machineId) {
    try {
        if (!isUniversal && (!schoolName || !kurumKodu || !machineId)) {
            console.error("\nHata: Evrensel olmayan lisanslarda Okul İsmi, Kurum Kodu ve Makine ID zorunludur!");
            readline.close();
            return;
        }
        const key = generateLicense(expiry, isUniversal, schoolName, kurumKodu, machineId);
        console.log("\n--- ÜRETİLEN LİSANS ANAHTARI ---");
        console.log(key);
        console.log("--------------------------------\n");
    } catch (err) {
        console.error("Hata oluştu:", err.message);
    }
    readline.close();
}
