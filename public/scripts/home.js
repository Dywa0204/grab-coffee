const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const loadingDialog = document.getElementById('loadingDialog');
const reloadCameraBtn = document.getElementById('reload-camera');

// Fungsi untuk menampilkan loading dialog
function showLoadingDialog() {
    loadingDialog.style.display = 'flex';
}

// Fungsi untuk menyembunyikan loading dialog
function hideLoadingDialog() {
    loadingDialog.style.display = 'none';
}

// Fungsi untuk menghentikan kamera
function stopCamera() {
    let stream = video.srcObject;
    if (stream) {
        let tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
}

reloadCameraBtn.addEventListener('click', (event) => {
    stopCamera();
    startCamera();
});

// Fungsi untuk memulai akses kamera
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
            video.srcObject = stream;
            video.play();
        })
        .catch((err) => {
            console.error('Error accessing camera: ', err);
            Swal.fire({
                icon: 'error',
                title: 'Camera Error',
                text: 'Failed to access the camera. Please check your camera settings.'
            });
        });
}

// Fungsi untuk memindai QR code
function scanQRCode() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
            const id_pengguna = code.data;
            stopCamera();
            showLoadingDialog();
            checkQRCode(id_pengguna);
        }
    }
    requestAnimationFrame(scanQRCode);
}

video.addEventListener('play', scanQRCode);

// Fungsi untuk memeriksa QR code di Firestore
function checkQRCode(id_pengguna) {
    const docRef = firestore.collection("qr_codes").doc(id_pengguna);
    docRef.get().then((doc) => {
        hideLoadingDialog();
        if (doc.exists) {
            const data = doc.data();
            if (data.state === 0) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'QR code telah berhasil dipindai dan status telah diperbarui.'
                }).then(() => {
                    startCamera()
                });
                docRef.update({ state: 1 }).then(() => {
                    console.log("State updated to 1.");
                    // Update daily report
                    updateDailyReport(id_pengguna);
                }).catch((error) => {
                    console.error("Error updating state: ", error);
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Telah diambil',
                    text: 'QR code ini sudah pernah digunakan.'
                }).then(() => {
                    startCamera()
                });
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'QR code tidak ditemukan di database.'
            }).then(() => {
                startCamera()
            });
        }
    }).catch((error) => {
        hideLoadingDialog();
        console.error("Error getting document: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Terjadi kesalahan internal server.'
        }).then(() => {
            startCamera()
        });
    });
}

// Fungsi untuk memperbarui laporan harian
function getWIBDate() {
    const date = new Date();
    const utcOffset = 7 * 60; // WIB adalah UTC+7
    const localDate = new Date(date.getTime() + utcOffset * 60000);
    return localDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
}

// Fungsi untuk memperbarui laporan harian
function updateDailyReport(id_pengguna) {
    const today = getWIBDate(); // Menggunakan WIB untuk tanggal hari ini
    const reportRef = firestore.collection("laporan").doc(today);

    console.log(`Updating daily report for ${today} with user ID ${id_pengguna}`);

    reportRef.get().then((doc) => {
        if (!doc.exists) {
            // Jika dokumen tidak ada, buat dokumen dengan array userIds kosong
            reportRef.set({
                userIds: [id_pengguna]
            }).then(() => {
                console.log("Daily report created and updated.");
            }).catch((error) => {
                console.error("Error creating daily report: ", error);
            });
        } else {
            // Jika dokumen sudah ada, tambahkan id_pengguna ke array userIds
            reportRef.update({
                userIds: firebase.firestore.FieldValue.arrayUnion(id_pengguna)
            }).then(() => {
                console.log("Daily report updated.");
            }).catch((error) => {
                console.error("Error updating daily report: ", error);
            });
        }
    }).catch((error) => {
        console.error("Error checking daily report: ", error);
    });
}

// Fungsi untuk memeriksa dan mereset state pengguna setiap hari
function checkAndResetState() {
    const docRef = firestore.collection("metadata").doc("last_reset");
    docRef.get().then((doc) => {
        const today = getWIBDate();
        if (doc.exists) {
            const lastReset = doc.data().date;
            if (lastReset !== today) {
                resetAllStates();
                docRef.set({ date: today });
            }
        } else {
            resetAllStates();
            docRef.set({ date: today });
        }
    }).catch((error) => {
        console.error("Error getting last reset date: ", error);
    });
}

// Fungsi untuk mereset semua state pengguna
function resetAllStates() {
    firestore.collection("qr_codes").get().then((querySnapshot) => {
        const batch = firestore.batch();
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { state: 0 });
        });
        batch.commit().then(() => {
            console.log("All states reset to 0.");
        }).catch((error) => {
            console.error("Error resetting states: ", error);
        });
    }).catch((error) => {
        console.error("Error getting QR codes: ", error);
    });
}

// Memeriksa dan mereset state pengguna saat halaman dimuat
window.addEventListener('load', () => {
    startCamera();
    checkAndResetState();
});