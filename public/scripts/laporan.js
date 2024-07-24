const loadingDialog = document.getElementById('loadingDialog');
const loadReportButton = document.getElementById('loadReportButton');
const downloadReport = document.getElementById('downloadReport');
const printReport = document.getElementById('printReport');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const pdfProccess = document.getElementById('pdf-proccess');

function initializeDropdowns() {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < months.length; i++) {
        const option = document.createElement('option');
        option.value = i + 1;
        option.textContent = months[i];
        monthSelect.appendChild(option);
    }

    for (let year = currentYear - 5; year <= currentYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    const now = new Date();
    monthSelect.value = now.getMonth() + 1;
    yearSelect.value = now.getFullYear();

    loadReport();
}

function showLoadingDialog() {
    loadingDialog.style.display = 'flex';
}

function hideLoadingDialog() {
    loadingDialog.style.display = 'none';
}

function formatDateString(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

function loadReport() {
    const month = monthSelect.value.padStart(2, '0');
    const year = yearSelect.value;
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    showLoadingDialog();
    
    firestore.collection("laporan")
        .get()
        .then((querySnapshot) => {
            const tableBody = document.querySelector('#reportTable tbody');
            tableBody.innerHTML = '';

            let hasData = false;

            querySnapshot.forEach((doc) => {
                const docId = doc.id;
                const docDate = new Date(docId);
                const docMonth = (docDate.getMonth() + 1).toString().padStart(2, '0');
                const docYear = docDate.getFullYear();

                if (docMonth === month && docYear === parseInt(year, 10)) {
                    hasData = true;
                    const data = doc.data();
                    const userCount = (data.userIds || []).length;
                    const formattedDate = formatDateString(docId);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td>${userCount}</td>
                        <td><button onclick="viewDailyReport('${docId}')">Lihat</button></td>
                    `;
                    tableBody.appendChild(row);
                }
            });

            if (!hasData) {
                tableBody.innerHTML = '<tr><td colspan="3">Belum ada data</td></tr>';
            }

            hideLoadingDialog();
        })
        .catch((error) => {
            console.error("Error getting report: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while retrieving the report.'
            });
            hideLoadingDialog();
        });
}

let currentDocId = '';
function viewDailyReport(date) {
    showLoadingDialog();

    currentDocId = date;
    firestore.collection("laporan").doc(date).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const userIds = data.userIds || [];
            const userPromises = userIds.map(id => firestore.collection("qr_codes").doc(id).get());

            // Fetch user details for all userIds
            Promise.all(userPromises).then(userDocs => {
                const userList = userDocs.map(userDoc => {
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        return `<tr><td>${userDoc.id}</td><td>${userData.name != null ? userData.name : "Belum ada namanya"}</td></tr>`;
                    } else {
                        return `<tr><td>${userDoc.id}</td><td>User tidak ditemukan</td></tr>`;
                    }
                }).join('');

                document.querySelector('#dayReportTable tbody').innerHTML = userList.length ? userList : '<tr><td colspan="2">No data available</td></tr>';
                pdfProccess.style.display = 'table'
                hideLoadingDialog();
            }).catch(error => {
                console.error("Error fetching user details: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred while retrieving user details.'
                });
                hideLoadingDialog();
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'No Data',
                text: 'No report found for the selected date.'
            });
            hideLoadingDialog();
        }
    }).catch((error) => {
        console.error("Error getting daily report: ", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while retrieving the daily report.'
        });
        hideLoadingDialog();
    });
}

function downloadReports() {
    // Ambil tanggal dari docId
    const formattedDate = formatDateString(currentDocId);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set font size and style for the title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    
    // Centered title
    const title = 'Laporan Harian';
    const titleWidth = doc.getTextWidth(title);
    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 20);

    // Reset font size and style for the date
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Centered date
    const dateText = `Tanggal: ${formattedDate}`;
    const dateWidth = doc.getTextWidth(dateText);
    const dateX = (pageWidth - dateWidth) / 2;
    doc.text(dateText, dateX, 30);

    // Generate the table
    doc.autoTable({ html: '#dayReportTable', startY: 40 });

    // Save the PDF
    doc.save(`Laporan_Harian_${formattedDate}.pdf`);
}

function printReports() {
    // Ambil tanggal dari docId
    const formattedDate = formatDateString(currentDocId);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set font size and style for the title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    
    // Centered title
    const title = 'Laporan Harian';
    const titleWidth = doc.getTextWidth(title);
    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 20);

    // Reset font size and style for the date
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Centered date
    const dateText = `Tanggal: ${formattedDate}`;
    const dateWidth = doc.getTextWidth(dateText);
    const dateX = (pageWidth - dateWidth) / 2;
    doc.text(dateText, dateX, 30);

    // Generate the table
    doc.autoTable({ html: '#dayReportTable', startY: 40 });

    // Create a Blob from the PDF and open it in a new window
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl);
    if (printWindow) {
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
        };
    } else {
        alert("Unable to open the print window. Please check your browser's pop-up settings.");
    }
}

loadReportButton.addEventListener('click', loadReport);

downloadReport.addEventListener('click', downloadReports);
printReport.addEventListener('click', printReports);

window.addEventListener('load', initializeDropdowns);
