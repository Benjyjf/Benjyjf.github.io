/**
 * Supersolution Verification Table - Pagination and Filtering
 * Loads data from CSV and provides interactive table navigation
 */

// Global state
let allData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 50;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCSVData();
});

/**
 * Load CSV data from file
 */
function loadCSVData() {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '<tr><td colspan="8" class="loading">Loading verification data...</td></tr>';

    fetch('VERIFIED_BETA_TABLE.csv')
        .then(response => response.text())
        .then(csvText => {
            allData = parseCSV(csvText);
            filteredData = allData;
            currentPage = 1;
            renderTable();
            updatePaginationControls();
        })
        .catch(error => {
            console.error('Error loading CSV:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Error loading data. Please refresh the page.</td></tr>';
        });
}

/**
 * Parse CSV text into array of objects
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index].trim();
            });
            data.push(row);
        }
    }

    // Sort by n numerically (not alphabetically)
    data.sort((a, b) => {
        const nA = parseInt(a.n);
        const nB = parseInt(b.n);
        if (nA !== nB) return nA - nB;
        // If n is the same, sort by k
        return parseInt(a.k) - parseInt(b.k);
    });

    return data;
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

/**
 * Format number for display
 */
function formatNumber(value, decimals = 6) {
    const num = parseFloat(value);
    if (isNaN(num)) return value;

    // Use scientific notation for very small/large numbers
    if (Math.abs(num) < 0.001 || Math.abs(num) > 1000) {
        return num.toExponential(2);
    }

    return num.toFixed(decimals);
}

/**
 * Render current page of table
 */
function renderTable() {
    const tableBody = document.getElementById('table-body');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);

    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No data matches the selected filter.</td></tr>';
        return;
    }

    let html = '';
    for (let i = startIndex; i < endIndex; i++) {
        const row = filteredData[i];

        // Highlight non-integer beta (only case is n=7, k=2, beta=-2.5)
        const betaClass = row.beta === '-2.5' ? 'highlight-value' : '';

        html += `
            <tr>
                <td>${row.n}</td>
                <td>${row.k}</td>
                <td class="${betaClass}">${row.beta}</td>
                <td>${formatNumber(row.rbar_minus_A, 4)}</td>
                <td>${formatNumber(row.max_Q_hat, 2)}</td>
                <td>${formatNumber(row.max_K0, 2)}</td>
                <td>${formatNumber(row.max_K1, 2)}</td>
                <td>${formatNumber(row.min_P, 2)}</td>
            </tr>
        `;
    }

    tableBody.innerHTML = html;
    updateShowingInfo(startIndex + 1, endIndex, filteredData.length);
}

/**
 * Update pagination controls
 */
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);

    document.getElementById('page-info').textContent =
        `Page ${currentPage} of ${totalPages}`;

    document.getElementById('first-btn').disabled = currentPage === 1;
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage >= totalPages;
    document.getElementById('last-btn').disabled = currentPage >= totalPages;
}

/**
 * Update showing info text
 */
function updateShowingInfo(start, end, total) {
    document.getElementById('showing-info').textContent =
        `Showing ${start}-${end} of ${total} entries`;
}

/**
 * Navigation functions
 */
function firstPage() {
    currentPage = 1;
    renderTable();
    updatePaginationControls();
    scrollToTop();
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
        updatePaginationControls();
        scrollToTop();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
        updatePaginationControls();
        scrollToTop();
    }
}

function lastPage() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    currentPage = totalPages;
    renderTable();
    updatePaginationControls();
    scrollToTop();
}

/**
 * Change rows per page
 */
function changeRowsPerPage() {
    const select = document.getElementById('rows-per-page');
    rowsPerPage = parseInt(select.value);
    currentPage = 1;
    renderTable();
    updatePaginationControls();
}

/**
 * Filter by n value range
 */
function filterByN() {
    const select = document.getElementById('n-filter');
    const value = select.value;

    if (value === 'all') {
        filteredData = allData;
    } else {
        const [min, max] = value.split('-').map(Number);
        filteredData = allData.filter(row => {
            const n = parseInt(row.n);
            return n >= min && n <= max;
        });
    }

    currentPage = 1;
    renderTable();
    updatePaginationControls();
    scrollToTop();
}

/**
 * Scroll to table top
 */
function scrollToTop() {
    document.getElementById('beta-table').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Export filtered data to CSV
 */
function exportFilteredData() {
    const csvContent = generateCSV(filteredData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_verification_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Generate CSV from data
 */
function generateCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';

    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escape values with commas or quotes
            if (value.includes(',') || value.includes('"')) {
                return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });

    return csv;
}
