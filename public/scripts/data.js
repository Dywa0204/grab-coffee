const loadingDialog = document.getElementById('loadingDialog');
const qrTableContainer = document.getElementById('qrTableContainer');
const showModalButton = document.getElementById('showModalButton');
const downloadAllButton = document.getElementById('downloadAllButton');
const modal = document.getElementById('modal');
const modalCloseButton = document.getElementById('modalCloseButton');
const modalGenerateButton = document.getElementById('modalGenerateButton');
const modalPasswordInput = document.getElementById('modalPasswordInput');
const modalNumberInput = document.getElementById('modalNumberInput');
const editNameModal = document.getElementById('editNameModal');
const editNameCloseButton = document.getElementById('editNameCloseButton');
const saveNameButton = document.getElementById('saveNameButton');
const editNameInput = document.getElementById('editNameInput');
const editNameLoading = document.getElementById('editNameLoading');

let currentEditId = '';

function showLoadingDialog() {
    loadingDialog.style.display = 'flex';
}

function hideLoadingDialog() {
    loadingDialog.style.display = 'none';
}

function showEditNameLoading() {
    editNameLoading.style.display = 'block';
}

function hideEditNameLoading() {
    editNameLoading.style.display = 'none';
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function loadQRCodeList() {
    showLoadingDialog()
    firestore.collection("qr_codes").get().then((querySnapshot) => {
        const tableBody = document.querySelector('#qrTable tbody');
        tableBody.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const id_pengguna = doc.id;
            const status = data.state === 0 ? 'Belum diambil' : 'Sudah diambil';
            const nama = data.name ? data.name : '-';
            const qrItem = document.createElement('tr');
            qrItem.innerHTML = `
                <td>${id_pengguna}</td>
                <td><span class="${ data.state === 1 ? 'take' : 'not-take' }">${status}</span></td>
                <td>${nama}</td>
                <td>
                    <button class="btn" onclick="viewQRCode('${id_pengguna}')">View</button>
                    <button class="btn" onclick="deleteQRCode('${id_pengguna}')">Hapus Data</button>
                    <button class="btn" onclick="editName('${id_pengguna}')">Edit Nama</button>
                </td>
            `;
            tableBody.appendChild(qrItem);
        });
        hideLoadingDialog()
    }).catch((error) => {
        hideLoadingDialog()
        console.error("Error getting QR codes: ", error);
    });
}

showModalButton.addEventListener('click', () => {
    modal.style.display = 'flex';
});

modalCloseButton.addEventListener('click', () => {
    modal.style.display = 'none';
});

modalGenerateButton.addEventListener('click', () => {
    const password = modalPasswordInput.value;
    const number = parseInt(modalNumberInput.value, 10);

    if (password === 'test') {
        if (number > 0) {
            showLoadingDialog();
            let promises = [];
            for (let i = 0; i < number; i++) {
                const id_pengguna = generateRandomString(16);
                const qrCodeURL = `https://quickchart.io/qr?text=${id_pengguna}`;
                const storageRef = storage.ref().child(`${id_pengguna}.png`);

                const uploadPromise = fetch(qrCodeURL)
                    .then(response => response.blob())
                    .then(blob => storageRef.put(blob))
                    .then(() => storageRef.getDownloadURL())
                    .then(url => {
                        return firestore.collection("qr_codes").doc(id_pengguna).set({
                            url: url,
                            state: 0
                        });
                    })
                    .catch((error) => {
                        console.error("Error saving QR code data: ", error);
                    });
                
                promises.push(uploadPromise);
            }

            Promise.all(promises).then(() => {
                hideLoadingDialog();
                modal.style.display = 'none';
                loadQRCodeList();
            }).catch(() => {
                hideLoadingDialog();
                modal.style.display = 'none';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Number',
                text: 'Please enter a valid number of QR codes.'
            });
        }
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Password',
            text: 'The password you entered is incorrect.'
        });
    }
});

function viewQRCode(id_pengguna) {
    firestore.collection("qr_codes").doc(id_pengguna).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            Swal.fire({
                title: 'QR Code',
                imageUrl: data.url,
                imageWidth: 400,
                imageHeight: 400,
                imageAlt: 'QR Code'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'QR code not found.'
            });
        }
    }).catch((error) => {
        console.error("Error getting QR code: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while retrieving the QR code.'
        });
    });
}

function deleteQRCode(id_pengguna) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            firestore.collection("qr_codes").doc(id_pengguna).delete().then(() => {
                Swal.fire('Deleted!', 'The QR code has been deleted.', 'success');
                loadQRCodeList();
            }).catch((error) => {
                console.error("Error deleting QR code: ", error);
                Swal.fire('Error!', 'An error occurred while deleting the QR code.', 'error');
            });
        }
    });
}

function editName(id_pengguna) {
    currentEditId = id_pengguna;
    editNameModal.style.display = 'flex';
}

editNameCloseButton.addEventListener('click', () => {
    editNameModal.style.display = 'none';
});

saveNameButton.addEventListener('click', () => {
    const name = editNameInput.value;
    if (name.trim() === '') {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Name',
            text: 'Please enter a valid name.'
        });
        return;
    }

    showEditNameLoading();
    firestore.collection("qr_codes").doc(currentEditId).update({ name: name })
        .then(() => {
            hideEditNameLoading();
            Swal.fire('Updated!', 'The name has been updated.', 'success');
            editNameModal.style.display = 'none';
            loadQRCodeList();
        })
        .catch((error) => {
            hideEditNameLoading();
            console.error("Error updating name: ", error);
            Swal.fire('Error!', 'An error occurred while updating the name.', 'error');
        });
});

downloadAllButton.addEventListener('click', () => {
    firestore.collection("qr_codes").get().then((querySnapshot) => {
        const urls = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            urls.push({
                url: data.url,
                id: doc.id,
                name: data.name
            });
        });

        if (urls.length > 0) {
            Swal.fire({
                title: 'Downloading...',
                text: 'Mempersiapkan unduhan, harap tunggu sebentar.',
                allowOutsideClick: false
            });
            Swal.showLoading();

            // Fetch all QR codes and add to ZIP
            Promise.all(urls.map(({ url, id, name }) => 
                fetch(url).then(response => response.blob()).then(blob => ({ blob, id }))
            ))
            .then(results => {
                const zip = new JSZip();
                results.forEach(({ blob, id }) => {
                    zip.file(`${id}.png`, blob);
                });
                return zip.generateAsync({ type: 'blob' });
            })
            .then(content => {
                Swal.close();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'qr_codes.zip';
                link.click();
            })
            .catch((error) => {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Download Error',
                    text: 'An error occurred while downloading the QR codes.'
                });
                console.error("Error during QR code download: ", error);
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'No QR Codes',
                text: 'No QR codes available to download.'
            });
        }
    }).catch((error) => {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while retrieving QR codes for download.'
        });
        console.error("Error getting QR codes for download: ", error);
    });
});

window.onload = loadQRCodeList;