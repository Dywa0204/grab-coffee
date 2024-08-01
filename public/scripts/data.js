const loadingDialog = document.getElementById('loadingDialog');
const qrTableContainer = document.getElementById('qrTableContainer');
const showModalButton = document.getElementById('showModalButton');
const downloadAllButton = document.getElementById('downloadAllButton');
const modal = document.getElementById('modal');
const modalCloseButton = document.getElementById('modalCloseButton');
const modalGenerateButton = document.getElementById('modalGenerateButton');
const modalPasswordInput = document.getElementById('modalPasswordInput');
const modalNumberInput = document.getElementById('modalNumberInput');
const editModal = document.getElementById('editModal');
const editCloseButton = document.getElementById('editCloseButton');
const saveEditButton = document.getElementById('saveEditButton');
const editNameInput = document.getElementById('editNameInput');
const editBadgeNumberInput = document.getElementById('editBadgeNumberInput');
const editDepartementInput = document.getElementById('editDepartementInput');
const editLoading = document.getElementById('editLoading');

let currentEditId = '';

function showLoadingDialog() {
    loadingDialog.style.display = 'flex';
}

function hideLoadingDialog() {
    loadingDialog.style.display = 'none';
}

function showEditLoading() {
    editLoading.style.display = 'block';
}

function hideEditLoading() {
    editLoading.style.display = 'none';
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
        let i = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const id_pengguna = doc.id;
            const status = data.state === 0 ? 'Belum diambil' : 'Sudah diambil';
            const nama = data.name ? data.name : '-';
            const badgeNumber = data.badgeNumber ? data.badgeNumber : '-';
            const departement = data.departement ? data.departement : '-';
            const qrItem = document.createElement('tr');
            qrItem.innerHTML = `
                <td>${i}</td>
                <td>${id_pengguna}</td>
                <td><span class="${ data.state === 1 ? 'take' : 'not-take' }">${status}</span></td>
                <td>${nama}</td>
                <td>${badgeNumber}</td>
                <td>${departement}</td>
                <td>
                    <button class="btn btn-view" onclick="viewQRCode('${id_pengguna}')">Lihat</button>
                    <button class="btn btn-edit" onclick="editData('${id_pengguna}')">Edit</button>
                    <button class="btn btn-delete" onclick="deleteQRCode('${id_pengguna}')">Hapus</button>
                </td>
            `;
            tableBody.appendChild(qrItem);
            i++;
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
                text: 'Please enter a valid number of QR codes to generate.'
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

editCloseButton.addEventListener('click', () => {
    editModal.style.display = 'none';
});

saveEditButton.addEventListener('click', () => {
    const newName = editNameInput.value;
    const newBadgeNumber = editBadgeNumberInput.value;
    const newDepartement = editDepartementInput.value;

    if (newName && newBadgeNumber && newDepartement) {
        showEditLoading();

        firestore.collection('qr_codes').doc(currentEditId).update({
            name: newName,
            badgeNumber: newBadgeNumber,
            departement: newDepartement
        }).then(() => {
            hideEditLoading();
            editModal.style.display = 'none';
            loadQRCodeList();
        }).catch((error) => {
            hideEditLoading();
            console.error('Error updating document: ', error);
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Incomplete Data',
            text: 'Please fill all the fields before saving.'
        });
    }
});

function editData(id) {
    currentEditId = id;
    firestore.collection('qr_codes').doc(id).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            editNameInput.value = data.name || '';
            editBadgeNumberInput.value = data.badgeNumber || '';
            editDepartementInput.value = data.departement || '';
            editModal.style.display = 'flex';
        } else {
            console.error('No such document!');
        }
    }).catch((error) => {
        console.error('Error getting document:', error);
    });
}

function viewQRCode(id) {
    firestore.collection('qr_codes').doc(id).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const qrCodeURL = data.url;
            Swal.fire({
                title: 'QR Code',
                imageUrl: qrCodeURL,
                imageHeight: 400
            });
        } else {
            console.error('No such document!');
        }
    }).catch((error) => {
        console.error('Error getting document:', error);
    });
}

function deleteQRCode(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: 'You won\'t be able to revert this!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            showLoadingDialog();
            firestore.collection('qr_codes').doc(id).delete().then(() => {
                hideLoadingDialog();
                loadQRCodeList();
            }).catch((error) => {
                hideLoadingDialog();
                console.error('Error removing document: ', error);
            });
        }
    });
}

downloadAllButton.addEventListener('click', () => {
    showLoadingDialog();
    firestore.collection("qr_codes").get().then((querySnapshot) => {
        let promises = [];
        let zip = new JSZip();
        let qrFolder = zip.folder("qr_codes");
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const id_pengguna = doc.id;
            const qrCodeURL = data.url;
            const filename = `${id_pengguna}.png`;

            const downloadPromise = fetch(qrCodeURL)
                .then(response => response.blob())
                .then(blob => {
                    qrFolder.file(filename, blob);
                })
                .catch((error) => {
                    console.error("Error downloading QR code: ", error);
                });

            promises.push(downloadPromise);
        });

        Promise.all(promises).then(() => {
            zip.generateAsync({ type: "blob" }).then((content) => {
                saveAs(content, "qr_codes.zip");
                hideLoadingDialog();
            });
        }).catch(() => {
            hideLoadingDialog();
        });
    }).catch((error) => {
        hideLoadingDialog();
        console.error("Error getting QR codes: ", error);
    });
});

loadQRCodeList();
