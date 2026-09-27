const demoData = {
  customers: [
    { id: 'C-001', name: 'CV. Bangun Jaya', address: 'Jl. Soekarno Hatta 88', phone: '0812-1111-2222', creditLimit: 150000000, status: 'Aktif' },
    { id: 'C-002', name: 'PT. Maju Makmur', address: 'Jl. Gatsu 12', phone: '0812-3333-4444', creditLimit: 120000000, status: 'Aktif' },
    { id: 'C-003', name: 'Toko Sinar Baru', address: 'Jl. Merdeka 45', phone: '0812-5555-6666', creditLimit: 90000000, status: 'Waspada' },
    { id: 'C-004', name: 'UD. Karya Abadi', address: 'Jl. Riau 9', phone: '0812-7777-8888', creditLimit: 80000000, status: 'Aktif' }
  ],
  invoices: [
    { id: 'INV-1001', customerId: 'C-001', invoiceDate: '2026-08-01', dueDate: '2026-08-30', total: 24000000, items: [{ name: 'Semen Portland', qty: 400, unitPrice: 45000 }, { name: 'Besi WF 8', qty: 100, unitPrice: 180000 }] },
    { id: 'INV-1002', customerId: 'C-002', invoiceDate: '2026-08-15', dueDate: '2026-09-14', total: 18000000, items: [{ name: 'Cat Tembok', qty: 150, unitPrice: 70000 }, { name: 'Bata Merah', qty: 5000, unitPrice: 2600 }] },
    { id: 'INV-1003', customerId: 'C-003', invoiceDate: '2026-07-10', dueDate: '2026-08-09', total: 32000000, items: [{ name: 'Pipa PVC', qty: 200, unitPrice: 90000 }, { name: 'Keramik', qty: 600, unitPrice: 42000 }] },
    { id: 'INV-1004', customerId: 'C-004', invoiceDate: '2026-09-02', dueDate: '2026-10-02', total: 12500000, items: [{ name: 'Bata Ringan', qty: 3000, unitPrice: 3200 }] }
  ],
  payments: [
    { id: 'PAY-1', invoiceId: 'INV-1001', paymentDate: '2026-08-08', amount: 12000000 },
    { id: 'PAY-2', invoiceId: 'INV-1002', paymentDate: '2026-08-25', amount: 18000000 },
    { id: 'PAY-3', invoiceId: 'INV-1003', paymentDate: '2026-07-22', amount: 10000000 }
  ]
};

(function () {
  const state = JSON.parse(JSON.stringify(demoData));

  function getCustomerById(id) {
    return state.customers.find((customer) => customer.id === id) || null;
  }

  function getPaymentsByInvoice(invoiceId) {
    return state.payments.filter((payment) => payment.invoiceId === invoiceId);
  }

  function getTotalPaid(invoiceId) {
    return getPaymentsByInvoice(invoiceId).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  function getInvoiceStatus(invoice) {
    const totalPaid = getTotalPaid(invoice.id);
    const remaining = invoice.total - totalPaid;

    if (remaining <= 0) return { text: 'Lunas', className: 'status-lunas' };
    if (totalPaid > 0) return { text: 'Sebagian Dibayar', className: 'status-sebagian' };

    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    if (today > dueDate) return { text: 'Overdue', className: 'status-overdue' };

    return { text: 'Belum Dibayar', className: 'status-belum' };
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function getCompanyDebtAlerts() {
    return state.customers
      .map((customer) => {
        const totalInvoice = state.invoices
          .filter((invoice) => invoice.customerId === customer.id)
          .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

        const totalPaid = state.payments
          .map((payment) => {
            const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
            if (!invoice || invoice.customerId !== customer.id) return 0;
            return Number(payment.amount || 0);
          })
          .reduce((sum, amount) => sum + amount, 0);

        const debtAmount = Math.max(totalPaid - totalInvoice, 0);

        return {
          customer,
          debtAmount,
          hasDebt: debtAmount > 0
        };
      })
      .filter((entry) => entry.hasDebt);
  }

  function downloadReceivablesLedger() {
    const records = state.invoices
      .map((invoice) => {
        const customer = getCustomerById(invoice.customerId);
        const totalPaid = getTotalPaid(invoice.id);
        const outstanding = Math.max(invoice.total - totalPaid, 0);
        const status = getInvoiceStatus(invoice);
        return {
          invoice,
          customer,
          totalPaid,
          outstanding,
          status
        };
      })
      .filter((entry) => entry.outstanding > 0)
      .sort((a, b) => new Date(a.invoice.dueDate) - new Date(b.invoice.dueDate));

    const totalOutstanding = records.reduce((sum, entry) => sum + entry.outstanding, 0);
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const html = `
      <html>
        <head>
          <title>Laporan Buku Besar Pembantu Piutang</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #10213b; }
            h1 { margin-bottom: 6px; }
            .meta { color: #53657e; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #dfe7f5; padding: 10px 12px; text-align: left; vertical-align: top; }
            th { background: #edf2ff; }
            .totals { font-weight: 700; background: #f7faff; }
            .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; }
            .status { background: #e7f7ee; color: #0f6b42; }
          </style>
        </head>
        <body>
          <h1>Buku Besar Pembantu Piutang</h1>
          <div class="meta">Tanggal: ${today}</div>
          <div class="meta">Total sisa piutang: <strong>${formatCurrency(totalOutstanding)}</strong></div>

          <table>
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th>No. Invoice</th>
                <th>Tgl Invoice</th>
                <th>Jatuh Tempo</th>
                <th>Total Invoice</th>
                <th>Sudah Bayar</th>
                <th>Sisa Piutang</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(({ invoice, customer, totalPaid, outstanding, status }) => `
                <tr>
                  <td>${customer ? customer.name : '-'}</td>
                  <td>${invoice.id}</td>
                  <td>${invoice.invoiceDate}</td>
                  <td>${invoice.dueDate}</td>
                  <td>${formatCurrency(invoice.total)}</td>
                  <td>${formatCurrency(totalPaid)}</td>
                  <td>${formatCurrency(outstanding)}</td>
                  <td><span class="pill ${status.className === 'status-overdue' ? 'status overdue' : 'status'}">${status.text}</span></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="totals">
                <td colspan="6">Total</td>
                <td colspan="2">${formatCurrency(totalOutstanding)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'laporan-buku-besar-piutang.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function renderDashboard() {
    const outstanding = state.invoices.reduce((sum, invoice) => sum + (invoice.total - getTotalPaid(invoice.id)), 0);
    const overdue = state.invoices
      .filter((invoice) => getInvoiceStatus(invoice).text === 'Overdue')
      .reduce((sum, invoice) => sum + (invoice.total - getTotalPaid(invoice.id)), 0);

    const dueSoon = state.invoices
      .filter((invoice) => {
        const remaining = Math.max(invoice.total - getTotalPaid(invoice.id), 0);
        return remaining > 0 && new Date(invoice.dueDate) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      })
      .reduce((sum, invoice) => sum + (invoice.total - getTotalPaid(invoice.id)), 0);

    const cards = [
      { label: 'Total Piutang', value: outstanding, type: 'currency' },
      { label: 'Belum Jatuh Tempo', value: dueSoon, type: 'currency' },
      { label: 'Piutang Overdue', value: overdue, type: 'currency' },
      { label: 'Jumlah Pelanggan', value: state.customers.length, type: 'number' }
    ];

    const statsEl = document.getElementById('dashboardStats');
    if (!statsEl) return;

    statsEl.innerHTML = cards.map((card) => {
      const displayValue = card.type === 'currency' ? formatCurrency(card.value) : new Intl.NumberFormat('id-ID').format(card.value);
      return `
        <article class="stat-card">
          <div class="stat-label">${card.label}</div>
          <p class="stat-value">${displayValue}</p>
          <div class="stat-meta">Update real-time</div>
        </article>
      `;
    }).join('');

    const companyDebtPanel = document.getElementById('companyDebtPanel');
    const companyDebtList = getCompanyDebtAlerts();
    if (companyDebtPanel) {
      if (companyDebtList.length > 0) {
        companyDebtPanel.classList.remove('hidden');
        companyDebtPanel.innerHTML = `
          <h4>Peringatan utang perusahaan</h4>
          <div class="company-debt-list">
            ${companyDebtList.map(({ customer, debtAmount }) => `
              <div class="company-debt-item">
                <strong>${customer.name}</strong>
                <span>Perusahaan kita memiliki utang kepada ${customer.name} sebesar ${formatCurrency(debtAmount)}.</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        companyDebtPanel.classList.add('hidden');
        companyDebtPanel.innerHTML = '';
      }
    }

    const cashflowChart = document.getElementById('cashflowChart');
    if (cashflowChart) {
      const monthLabels = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        return {
          label: date.toLocaleDateString('id-ID', { month: 'short' }),
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        };
      });

      const maxChartValue = Math.max(
        ...monthLabels.map(({ key }) => {
          const invoiceTotal = state.invoices
            .filter((invoice) => invoice.invoiceDate.startsWith(key))
            .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
          const paymentTotal = state.payments
            .filter((payment) => payment.paymentDate && payment.paymentDate.startsWith(key))
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          return Math.max(invoiceTotal, paymentTotal, 1);
        }),
        1
      );

      cashflowChart.innerHTML = monthLabels.map(({ label, key }) => {
        const invoiceTotal = state.invoices
          .filter((invoice) => invoice.invoiceDate.startsWith(key))
          .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
        const paymentTotal = state.payments
          .filter((payment) => payment.paymentDate && payment.paymentDate.startsWith(key))
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const invoiceHeight = Math.max((invoiceTotal / maxChartValue) * 100, 8);
        const paymentHeight = Math.max((paymentTotal / maxChartValue) * 100, 8);

        return `
          <div class="bar-group">
            <div class="bar-stack">
              <span class="bar invoice-bar" style="height:${invoiceHeight}%"></span>
              <span class="bar paid-bar" style="height:${paymentHeight}%"></span>
            </div>
            <label>${label}</label>
          </div>
        `;
      }).join('');
    }

    const attentionBody = document.getElementById('attentionTableBody');
    if (attentionBody) {
      const rows = state.invoices
        .map((invoice) => {
          const customer = getCustomerById(invoice.customerId);
          const remaining = Math.max(invoice.total - getTotalPaid(invoice.id), 0);
          const status = getInvoiceStatus(invoice);
          return {
            invoice,
            customer,
            remaining,
            status
          };
        })
        .filter((entry) => entry.remaining > 0)
        .slice(0, 5);

      attentionBody.innerHTML = rows.map(({ invoice, customer, remaining, status }) => `
        <tr>
          <td>${invoice.id}<br><small>${invoice.invoiceDate}</small></td>
          <td>${customer ? customer.name : '-'}</td>
          <td>${invoice.dueDate}</td>
          <td>${formatCurrency(invoice.total)}</td>
          <td>${formatCurrency(remaining)}</td>
          <td><span class="attention-status">${status.text}</span></td>
        </tr>
      `).join('');
    }
  }

  function renderCustomers() {
    const body = document.getElementById('customerTableBody');
    if (!body) return;

    body.innerHTML = state.customers.map((customer) => `
      <tr>
        <td>${customer.id}</td>
        <td>${customer.name}</td>
        <td>${customer.address}</td>
        <td>${customer.phone}</td>
        <td>${formatCurrency(customer.creditLimit)}</td>
        <td><span class="status-pill ${customer.status === 'Waspada' ? 'status-sebagian' : 'status-lunas'}">${customer.status}</span></td>
        <td>
          <div class="table-actions">
            <button class="action-btn primary" data-detail="customer" data-id="${customer.id}">Detail</button>
            <button class="action-btn" data-edit="customer" data-id="${customer.id}">Edit</button>
            <button class="action-btn danger" data-delete="customer" data-id="${customer.id}">Hapus</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function getInvoiceSequence(customerId, invoiceId) {
    const customerInvoices = state.invoices
      .filter((invoice) => invoice.customerId === customerId)
      .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate) || a.id.localeCompare(b.id));

    const index = customerInvoices.findIndex((invoice) => invoice.id === invoiceId);
    return index >= 0 ? index + 1 : 1;
  }

  function getFilteredInvoices() {
    const customerFilter = document.getElementById('invoiceCustomerFilter')?.value || 'all';
    const dateFilter = document.getElementById('invoiceDateFilter')?.value || '';

    return state.invoices.filter((invoice) => {
      const matchesCustomer = customerFilter === 'all' || invoice.customerId === customerFilter;
      const matchesDate = !dateFilter || invoice.invoiceDate === dateFilter;
      return matchesCustomer && matchesDate;
    });
  }

  function populateInvoiceFilters() {
    const customerFilter = document.getElementById('invoiceCustomerFilter');
    if (!customerFilter) return;

    const selected = customerFilter.value || 'all';
    const options = ['<option value="all">Semua perusahaan</option>']
      .concat(state.customers.map((customer) => `
        <option value="${customer.id}" ${selected === customer.id ? 'selected' : ''}>${customer.name}</option>
      `));

    customerFilter.innerHTML = options.join('');
  }

  function updateInvoiceSequencePreview() {
    const customerSelect = document.getElementById('invoiceCustomerId');
    const sequenceInput = document.getElementById('invoiceSequencePreview');
    if (!customerSelect || !sequenceInput) return;

    const customerId = customerSelect.value;
    const customerInvoices = state.invoices
      .filter((invoice) => invoice.customerId === customerId)
      .sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate) || a.id.localeCompare(b.id));

    const nextSequence = customerInvoices.length + 1;
    sequenceInput.value = String(nextSequence);
  }

  function renderInvoices() {
    populateInvoiceFilters();
    const body = document.getElementById('invoiceTableBody');
    if (!body) return;

    const filteredInvoices = getFilteredInvoices();

    body.innerHTML = filteredInvoices.map((invoice) => {
      const customer = getCustomerById(invoice.customerId);
      const status = getInvoiceStatus(invoice);
      const sequence = getInvoiceSequence(invoice.customerId, invoice.id);
      return `
        <tr>
          <td>${invoice.id}</td>
          <td>${sequence}</td>
          <td>${customer ? customer.name : '-'}</td>
          <td>${invoice.invoiceDate}</td>
          <td>${invoice.dueDate}</td>
          <td>${formatCurrency(invoice.total)}</td>
          <td><span class="status-pill ${status.className}">${status.text}</span></td>
          <td>
            <div class="table-actions">
              <button class="action-btn primary" data-detail="invoice" data-id="${invoice.id}">Detail</button>
              <button class="action-btn success" data-download="invoice" data-id="${invoice.id}">Unduh</button>
              <button class="action-btn danger" data-delete="invoice" data-id="${invoice.id}">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function populateInvoiceSelect() {
    const invoiceSelect = document.getElementById('invoiceSelect');
    const paymentModalInvoiceSelect = document.getElementById('paymentModalInvoiceSelect');

    const options = state.invoices.map((invoice) => `
      <option value="${invoice.id}">${invoice.id} - ${getCustomerById(invoice.customerId)?.name || 'Pelanggan'}</option>
    `).join('');

    if (invoiceSelect) {
      invoiceSelect.innerHTML = options;
      if (state.invoices.length > 0) {
        invoiceSelect.value = state.invoices[0].id;
      }
    }

    if (paymentModalInvoiceSelect) {
      paymentModalInvoiceSelect.innerHTML = options;
      if (state.invoices.length > 0) {
        paymentModalInvoiceSelect.value = state.invoices[0].id;
      }
    }

    updatePaymentMeta();
    updatePaymentModalMeta();
  }

  function getDiscountOnPayment(invoiceId, paymentDate) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice || !paymentDate) return 0;

    const invoiceDate = new Date(invoice.invoiceDate);
    const paymentDay = new Date(paymentDate);
    const daysFromInvoice = (paymentDay - invoiceDate) / (1000 * 60 * 60 * 24);

    if (daysFromInvoice <= 10 && paymentDay >= invoiceDate) {
      return invoice.total * 0.02;
    }

    return 0;
  }

  function getInvoiceRemaining(invoiceId) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return 0;
    return Math.max(invoice.total - getTotalPaid(invoiceId), 0);
  }

  function updatePaymentMeta() {
    const invoiceSelect = document.getElementById('invoiceSelect');
    const discountInput = document.getElementById('discountDisplay');
    const remainingInput = document.getElementById('remainingDisplay');
    const policyPaymentInput = document.getElementById('policyPaymentDisplay');
    const paymentDateInput = document.getElementById('paymentDate');

    if (!invoiceSelect || !discountInput || !remainingInput || !policyPaymentInput || !paymentDateInput) return;

    const invoiceId = invoiceSelect.value;
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      discountInput.value = formatCurrency(0);
      remainingInput.value = formatCurrency(0);
      policyPaymentInput.value = formatCurrency(0);
      return;
    }

    const paymentDate = paymentDateInput.value ? new Date(`${paymentDateInput.value}T00:00:00`) : null;
    const invoiceDate = new Date(`${invoice.invoiceDate}T00:00:00`);
    const discount = paymentDate ? getDiscountOnPayment(invoiceId, paymentDateInput.value) : 0;
    const remaining = getInvoiceRemaining(invoiceId);
    const days = paymentDate ? Math.floor((paymentDate - invoiceDate) / (1000 * 60 * 60 * 24)) : -1;
    const isWithinDiscountWindow = paymentDate && days >= 0 && days <= 10;
    const payableAmount = isWithinDiscountWindow ? Math.max(remaining - discount, 0) : remaining;

    discountInput.value = formatCurrency(discount);
    remainingInput.value = formatCurrency(remaining);
    policyPaymentInput.value = formatCurrency(payableAmount);
  }

  function updatePaymentModalMeta() {
    const invoiceSelect = document.getElementById('paymentModalInvoiceSelect');
    const discountInput = document.getElementById('paymentModalDiscountDisplay');
    const remainingInput = document.getElementById('paymentModalRemainingDisplay');
    const policyPaymentInput = document.getElementById('paymentModalPolicyPaymentDisplay');
    const paymentDateInput = document.getElementById('paymentModalDate');

    if (!invoiceSelect || !discountInput || !remainingInput || !policyPaymentInput || !paymentDateInput) return;

    const invoiceId = invoiceSelect.value;
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      discountInput.value = formatCurrency(0);
      remainingInput.value = formatCurrency(0);
      policyPaymentInput.value = formatCurrency(0);
      return;
    }

    const paymentDate = paymentDateInput.value ? new Date(`${paymentDateInput.value}T00:00:00`) : null;
    const invoiceDate = new Date(`${invoice.invoiceDate}T00:00:00`);
    const discount = paymentDate ? getDiscountOnPayment(invoiceId, paymentDateInput.value) : 0;
    const remaining = getInvoiceRemaining(invoiceId);
    const days = paymentDate ? Math.floor((paymentDate - invoiceDate) / (1000 * 60 * 60 * 24)) : -1;
    const isWithinDiscountWindow = paymentDate && days >= 0 && days <= 10;
    const payableAmount = isWithinDiscountWindow ? Math.max(remaining - discount, 0) : remaining;

    discountInput.value = formatCurrency(discount);
    remainingInput.value = formatCurrency(remaining);
    policyPaymentInput.value = formatCurrency(payableAmount);
  }

  function renderPaymentDebtList() {
    const paymentDebtList = document.getElementById('paymentDebtList');
    if (!paymentDebtList) return;

    const debtList = state.invoices
      .map((invoice) => {
        const customer = getCustomerById(invoice.customerId);
        const remaining = Math.max(invoice.total - getTotalPaid(invoice.id), 0);
        return {
          invoice,
          customer,
          remaining
        };
      })
      .filter((entry) => entry.remaining > 0)
      .slice(0, 6);

    if (debtList.length === 0) {
      paymentDebtList.innerHTML = `
        <div class="payment-debt-card">
          <h4>Tidak ada piutang</h4>
          <p class="summary-meta">Belum ada invoice aktif yang menunggak.</p>
        </div>
      `;
      return;
    }

    paymentDebtList.innerHTML = debtList.map(({ invoice, customer, remaining }) => `
      <div class="payment-debt-card">
        <h4>${customer ? customer.name : '-'}</h4>
        <div class="meta-row"><span>Invoice</span><strong>${invoice.id}</strong></div>
        <div class="meta-row"><span>Tempo</span><strong>${invoice.dueDate}</strong></div>
        <div class="meta-row"><span>Sisa</span><strong>${formatCurrency(remaining)}</strong></div>
        <div class="value-amount">${formatCurrency(invoice.total)}</div>
        <button class="primary-btn small-btn" type="button" data-select-invoice="${invoice.id}">Pilih</button>
      </div>
    `).join('');
  }

  function renderPaymentSummary() {
    const summary = document.getElementById('paymentSummary');
    if (!summary) return;

    const rows = state.payments.slice(-4).reverse();
    summary.innerHTML = rows.map((payment) => {
      const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
      const customer = invoice ? getCustomerById(invoice.customerId) : null;
      const method = payment.method || 'Tunai';
      return `
        <div class="summary-item">
          <div class="summary-header">
            <strong>${invoice ? invoice.id : payment.invoiceId}</strong>
            <button class="action-btn danger" data-delete="payment" data-id="${payment.id}">Hapus</button>
          </div>
          <div class="summary-meta">${customer ? customer.name : '-'} • ${payment.paymentDate} • ${method}</div>
          <div class="summary-amount">Bayar: ${formatCurrency(payment.amount)}</div>
          <div class="summary-actions">
            <button class="action-btn primary" data-detail="payment" data-id="${payment.id}">Detail</button>
          </div>
        </div>
      `;
    }).join('');
  }

  const invoiceItemPricing = {
    'Semen Portland': 85000,
    'Besi Beton': 75000,
    'Cat Tembok': 250000,
    'Pipa PVC': 45000
  };

  function buildInvoiceRow(item = { name: '', qty: 1, unitPrice: 0 }) {
    const selectedValue = item.name || '';
    const defaultPrice = invoiceItemPricing[selectedValue] ?? Number(item.unitPrice || 0);
    return `
      <tr>
        <td>
          <select class="item-name" aria-label="Nama item">
            <option value="">Pilih item</option>
            <option value="Semen Portland" ${selectedValue === 'Semen Portland' ? 'selected' : ''}>Semen Portland</option>
            <option value="Besi Beton" ${selectedValue === 'Besi Beton' ? 'selected' : ''}>Besi Beton</option>
            <option value="Cat Tembok" ${selectedValue === 'Cat Tembok' ? 'selected' : ''}>Cat Tembok</option>
            <option value="Pipa PVC" ${selectedValue === 'Pipa PVC' ? 'selected' : ''}>Pipa PVC</option>
          </select>
        </td>
        <td><input type="number" class="item-qty" min="1" step="1" value="${item.qty || 1}" /></td>
        <td><input type="number" class="item-price" min="0" step="1000" value="${defaultPrice}" /></td>
        <td class="item-subtotal">${formatCurrency((Number(item.qty || 0) || 0) * defaultPrice)}</td>
        <td><button type="button" class="action-btn danger remove-item-row">Hapus</button></td>
      </tr>
    `;
  }

  function updateInvoiceItemRows() {
    const tableBody = document.getElementById('invoiceItemsTableBody');
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr');
    let total = 0;
    const shippingCost = Number(document.getElementById('shippingCost')?.value || 0);

    rows.forEach((row) => {
      const nameInput = row.querySelector('.item-name');
      const qtyInput = row.querySelector('.item-qty');
      const priceInput = row.querySelector('.item-price');
      const subtotalEl = row.querySelector('.item-subtotal');
      const qty = Number(qtyInput?.value || 0);
      const price = Number(priceInput?.value || 0);
      const subtotal = qty * price;
      total += subtotal;

      if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
      if (nameInput && !nameInput.value && (qty > 0 || price > 0)) {
        nameInput.value = '';
      }
    });

    total += shippingCost;

    const preview = document.getElementById('invoiceTotalPreview');
    if (preview) preview.textContent = formatCurrency(total);
  }

  function ensureInvoiceItems() {
    const tableBody = document.getElementById('invoiceItemsTableBody');
    if (!tableBody) return;

    if (tableBody.children.length === 0) {
      tableBody.innerHTML = buildInvoiceRow({ name: 'Semen Portland', qty: 1, unitPrice: invoiceItemPricing['Semen Portland'] });
      tableBody.insertAdjacentHTML('beforeend', buildInvoiceRow({ name: 'Besi Beton', qty: 2, unitPrice: invoiceItemPricing['Besi Beton'] }));
      updateInvoiceItemRows();
    }
  }

  function renderAging() {
    const dashboardAgingEl = document.getElementById('dashboardAgingList');
    const reportAgingCardsEl = document.getElementById('agingSummaryCards');
    const reportAgingTableBody = document.getElementById('agingTableBody');

    const today = new Date();
    const bucketConfig = [
      { label: 'Belum jatuh tempo', key: 'upcoming', threshold: 0, count: 0, total: 0 },
      { label: '1-30 hari', key: '0_30', threshold: 30, count: 0, total: 0 },
      { label: '31-60 hari', key: '31_60', threshold: 60, count: 0, total: 0 },
      { label: '61-90 hari', key: '61_90', threshold: 90, count: 0, total: 0 },
      { label: '> 90 hari', key: 'over_90', threshold: Infinity, count: 0, total: 0 }
    ];

    const agingRows = [];

    state.invoices.forEach((invoice) => {
      const remaining = Math.max(invoice.total - getTotalPaid(invoice.id), 0);
      if (remaining <= 0) return;

      const dueDate = new Date(invoice.dueDate);
      const ageDays = Math.max(0, Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)));

      let matchedBucket = bucketConfig[0];
      if (ageDays > 0 && ageDays <= 30) matchedBucket = bucketConfig[1];
      else if (ageDays > 30 && ageDays <= 60) matchedBucket = bucketConfig[2];
      else if (ageDays > 60 && ageDays <= 90) matchedBucket = bucketConfig[3];
      else if (ageDays > 90) matchedBucket = bucketConfig[4];

      matchedBucket.count += 1;
      matchedBucket.total += remaining;

      agingRows.push({
        invoice,
        remaining,
        ageDays,
        bucket: matchedBucket.label,
        status: getInvoiceStatus(invoice)
      });
    });

    const totalOutstanding = bucketConfig.reduce((sum, bucket) => sum + bucket.total, 0) || 1;
    const agingMarkup = bucketConfig.map((bucket) => {
      const width = totalOutstanding ? (bucket.total / totalOutstanding) * 100 : 0;
      return `
        <div class="aging-summary-card">
          <h4>${bucket.label}</h4>
          <p class="value">${formatCurrency(bucket.total)}</p>
          <p class="count">${bucket.count} invoice</p>
          <div class="progress"><span class="progress-bar" style="width:${Math.max(width, 8)}%"></span></div>
        </div>
      `;
    }).join('');

    if (reportAgingCardsEl) {
      reportAgingCardsEl.innerHTML = agingMarkup;
    }

    if (dashboardAgingEl) {
      dashboardAgingEl.innerHTML = bucketConfig.map((bucket) => `
        <div class="aging-row">
          <div class="aging-label">${bucket.label}</div>
          <div class="aging-bar"><span class="aging-fill" style="width:${Math.max((bucket.total / totalOutstanding) * 100, 8)}%"></span></div>
          <div class="aging-value">${formatCurrency(bucket.total)}</div>
        </div>
      `).join('');
    }

    if (reportAgingTableBody) {
      reportAgingTableBody.innerHTML = agingRows.map(({ invoice, remaining, ageDays, bucket, status }) => {
        const customer = getCustomerById(invoice.customerId);
        return `
          <tr>
            <td>${bucket}</td>
            <td>${invoice.id}</td>
            <td>${customer ? customer.name : '-'}</td>
            <td>${formatCurrency(remaining)}</td>
            <td><span class="status-pill ${status.className}">${status.text}</span></td>
            <td><button class="action-btn primary" data-detail="invoice" data-id="${invoice.id}">Hapus</button></td>
          </tr>
        `;
      }).join('');
    }
  }

  function getNextCustomerId() {
    const numericIds = state.customers
      .map((customer) => Number(String(customer.id).replace(/\D/g, '')))
      .filter((number) => !Number.isNaN(number));

    const nextNumber = numericIds.length ? Math.max(...numericIds) + 1 : 1;
    return `C-${String(nextNumber).padStart(3, '0')}`;
  }

  function getNextInvoiceId() {
    const numericIds = state.invoices
      .map((invoice) => Number(String(invoice.id).replace(/\D/g, '')))
      .filter((number) => !Number.isNaN(number));

    const nextNumber = numericIds.length ? Math.max(...numericIds) + 1 : 1001;
    return `INV-${nextNumber}`;
  }

  function populateCustomerOptions() {
    const invoiceCustomerSelect = document.getElementById('invoiceCustomerId');
    if (invoiceCustomerSelect) {
      invoiceCustomerSelect.innerHTML = state.customers.map((customer) => `
        <option value="${customer.id}">${customer.id} - ${customer.name}</option>
      `).join('');

      if (state.customers.length > 0) {
        invoiceCustomerSelect.value = state.customers[0].id;
      }
    }

    const customerIdInput = document.getElementById('customerId');
    if (customerIdInput) {
      customerIdInput.value = getNextCustomerId();
    }
  }

  function calculateDueDate(invoiceDateValue, termDays) {
    if (!invoiceDateValue) return '';

    const date = new Date(`${invoiceDateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';

    const days = Number(termDays || 0);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function syncInvoiceDueDate() {
    const invoiceDate = document.getElementById('invoiceDate');
    const invoiceTerm = document.getElementById('invoiceTerm');
    const invoiceDueDate = document.getElementById('invoiceDueDate');

    if (!invoiceDate || !invoiceTerm || !invoiceDueDate) return;
    if (!invoiceDate.value) return;

    invoiceDueDate.value = calculateDueDate(invoiceDate.value, invoiceTerm.value);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function showDetail(modalType, id) {
    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('detailContent');
    if (!detailTitle || !detailContent) return;

    if (modalType === 'customer') {
      const customer = getCustomerById(id);
      if (!customer) return;
      detailTitle.textContent = `Detail Pelanggan - ${customer.name}`;
      detailContent.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><label>ID</label><strong>${customer.id}</strong></div>
          <div class="detail-item"><label>Status</label><strong>${customer.status}</strong></div>
          <div class="detail-item"><label>Nama</label><strong>${customer.name}</strong></div>
          <div class="detail-item"><label>Telepon</label><strong>${customer.phone}</strong></div>
          <div class="detail-item"><label>Alamat</label><strong>${customer.address}</strong></div>
          <div class="detail-item"><label>Limit Kredit</label><strong>${formatCurrency(customer.creditLimit)}</strong></div>
        </div>
      `;
    }

    if (modalType === 'invoice') {
      const invoice = state.invoices.find((item) => item.id === id);
      if (!invoice) return;
      const customer = getCustomerById(invoice.customerId);
      const status = getInvoiceStatus(invoice);
      const totalPaid = getTotalPaid(invoice.id);
      detailTitle.textContent = `Detail Invoice - ${invoice.id}`;
      detailContent.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><label>No. Invoice</label><strong>${invoice.id}</strong></div>
          <div class="detail-item"><label>Invoice ke</label><strong>${getInvoiceSequence(invoice.customerId, invoice.id)}</strong></div>
          <div class="detail-item"><label>Status</label><strong>${status.text}</strong></div>
          <div class="detail-item"><label>Pelanggan</label><strong>${customer ? customer.name : '-'}</strong></div>
          <div class="detail-item"><label>Tanggal Invoice</label><strong>${invoice.invoiceDate}</strong></div>
          <div class="detail-item"><label>Jatuh Tempo</label><strong>${invoice.dueDate}</strong></div>
          <div class="detail-item"><label>Total</label><strong>${formatCurrency(invoice.total)}</strong></div>
          <div class="detail-item"><label>Sudah Dibayar</label><strong>${formatCurrency(totalPaid)}</strong></div>
          <div class="detail-item"><label>Sisa Piutang</label><strong>${formatCurrency(Math.max(invoice.total - totalPaid, 0))}</strong></div>
        </div>
      `;
    }

    if (modalType === 'payment') {
      const payment = state.payments.find((item) => item.id === id);
      if (!payment) return;
      const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
      const customer = invoice ? getCustomerById(invoice.customerId) : null;
      detailTitle.textContent = `Detail Pembayaran - ${payment.id}`;
      detailContent.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><label>ID Pembayaran</label><strong>${payment.id}</strong></div>
          <div class="detail-item"><label>Invoice</label><strong>${payment.invoiceId}</strong></div>
          <div class="detail-item"><label>Pelanggan</label><strong>${customer ? customer.name : '-'}</strong></div>
          <div class="detail-item"><label>Tanggal</label><strong>${payment.paymentDate}</strong></div>
          <div class="detail-item"><label>Nominal</label><strong>${formatCurrency(payment.amount)}</strong></div>
          <div class="detail-item"><label>Diskon</label><strong>${formatCurrency(getDiscountOnPayment(payment.invoiceId, payment.paymentDate))}</strong></div>
        </div>
      `;
    }

    openModal('detailModal');
  }

  function downloadInvoice(invoiceId) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;

    const customer = getCustomerById(invoice.customerId);
    const totalPaid = getTotalPaid(invoice.id);
    const remaining = Math.max(invoice.total - totalPaid, 0);
    const html = `
      <html>
        <head>
          <title>Invoice ${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            .header { display: flex; justify-content: space-between; margin-bottom: 28px; }
            .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 9px 8px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>Invoice ${invoice.id}</h2>
              <div>Distributor Bahan Bangunan</div>
            </div>
            <div>
              <div>Tanggal: ${invoice.invoiceDate}</div>
              <div>Jatuh Tempo: ${invoice.dueDate}</div>
            </div>
          </div>

          <div class="box">
            <strong>Pelanggan:</strong><br />
            ${customer ? customer.name : '-'}<br />
            ${customer ? customer.address : '-'}<br />
            ${customer ? customer.phone : '-'}
          </div>

          <div class="box">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Harga</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.qty}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency(item.qty * item.unitPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="box">
            <div>Total Tagihan: <strong>${formatCurrency(invoice.total)}</strong></div>
            <div>Sudah Dibayar: <strong>${formatCurrency(totalPaid)}</strong></div>
            <div>Sisa Piutang: <strong>${formatCurrency(remaining)}</strong></div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function setActiveSection(targetId) {
    document.querySelectorAll('.page-section').forEach((section) => {
      section.classList.toggle('hidden', section.id !== targetId);
    });

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.target === targetId);
    });

    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setCustomerFormMode(customer = null) {
    const form = document.getElementById('customerForm');
    const hiddenInput = document.getElementById('customerEditId');
    const modalTitle = document.getElementById('customerModalTitle');
    if (!form || !hiddenInput) return;

    if (!customer) {
      hiddenInput.value = '';
      if (modalTitle) modalTitle.textContent = 'Tambah Pelanggan Baru';
      form.reset();
      document.getElementById('customerId').value = getNextCustomerId();
      return;
    }

    hiddenInput.value = customer.id;
    if (modalTitle) modalTitle.textContent = 'Edit Pelanggan';
    document.getElementById('customerId').value = customer.id;
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerAddress').value = customer.address;
    document.getElementById('customerPhone').value = customer.phone;
    document.getElementById('customerNwp').value = customer.npwp || '';
    document.getElementById('customerLimit').value = customer.creditLimit;
    document.getElementById('customerStatus').value = customer.status;
  }

  function openPaymentEntryModal(invoiceId = null) {
    const modal = document.getElementById('paymentModal');
    const invoiceSelect = document.getElementById('paymentModalInvoiceSelect');
    const paymentDate = document.getElementById('paymentModalDate');

    if (!modal || !invoiceSelect || !paymentDate) return;

    populateInvoiceSelect();

    if (invoiceId) {
      invoiceSelect.value = invoiceId;
    }

    if (!paymentDate.value) {
      paymentDate.value = new Date().toISOString().slice(0, 10);
    }

    updatePaymentModalMeta();
    openModal('paymentModal');
  }

  function bindGlobalActions() {
    document.querySelectorAll('.nav-item').forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        if (targetId) {
          setActiveSection(targetId);
        }
      });
    });

    document.querySelectorAll('[data-target]').forEach((button) => {
      if (button.classList.contains('nav-item')) return;
      button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        if (targetId) {
          setActiveSection(targetId);
        }
      });
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.close;
        if (target) closeModal(target);
      });
    });

    document.body.addEventListener('click', (event) => {
      const detailButton = event.target.closest('[data-detail]');
      if (detailButton) {
        showDetail(detailButton.dataset.detail, detailButton.dataset.id);
      }

      const editButton = event.target.closest('[data-edit]');
      if (editButton) {
        const customer = getCustomerById(editButton.dataset.id);
        if (customer) {
          setCustomerFormMode(customer);
          openModal('customerModal');
        }
      }

      const deleteButton = event.target.closest('[data-delete]');
      if (deleteButton) {
        const type = deleteButton.dataset.delete;
        const id = deleteButton.dataset.id;

        if (type === 'customer') {
          const customer = getCustomerById(id);
          if (!customer) return;
          const confirmed = window.confirm(`Hapus pelanggan ${customer.name}?`);
          if (!confirmed) return;
          state.customers = state.customers.filter((item) => item.id !== id);
        }

        if (type === 'invoice') {
          const invoice = state.invoices.find((item) => item.id === id);
          if (!invoice) return;
          const confirmed = window.confirm(`Hapus invoice ${invoice.id}?`);
          if (!confirmed) return;
          state.invoices = state.invoices.filter((item) => item.id !== id);
          state.payments = state.payments.filter((payment) => payment.invoiceId !== id);
        }

        if (type === 'payment') {
          const payment = state.payments.find((item) => item.id === id);
          if (!payment) return;
          const confirmed = window.confirm(`Hapus pembayaran ${payment.id}?`);
          if (!confirmed) return;
          state.payments = state.payments.filter((item) => item.id !== id);
        }

        renderCustomers();
        renderInvoices();
        renderDashboard();
        renderAging();
        renderPaymentDebtList();
        renderPaymentSummary();
        populateInvoiceSelect();
        populateCustomerOptions();
      }

      const downloadButton = event.target.closest('[data-download]');
      if (downloadButton) {
        downloadInvoice(downloadButton.dataset.id);
      }
    });

    const addCustomerBtn = document.getElementById('addCustomerBtn');
    if (addCustomerBtn) {
      addCustomerBtn.addEventListener('click', () => {
        populateCustomerOptions();
        setCustomerFormMode();
        openModal('customerModal');
      });
    }

    const addInvoiceBtn = document.getElementById('addInvoiceBtn');
    if (addInvoiceBtn) {
      addInvoiceBtn.addEventListener('click', () => {
        populateCustomerOptions();
        ensureInvoiceItems();
        const invoiceDate = document.getElementById('invoiceDate');
        const invoiceTerm = document.getElementById('invoiceTerm');
        const invoiceDueDate = document.getElementById('invoiceDueDate');
        const today = new Date();
        const iso = today.toISOString().slice(0, 10);
        if (invoiceDate) invoiceDate.value = iso;
        if (invoiceTerm) invoiceTerm.value = '30';
        if (invoiceDueDate) {
          invoiceDueDate.value = calculateDueDate(iso, invoiceTerm?.value || 30);
        }
        openModal('invoiceModal');
      });
    }

    const togglePaymentFormBtn = document.getElementById('togglePaymentFormBtn');
    const paymentForm = document.getElementById('paymentForm');
    if (togglePaymentFormBtn && paymentForm) {
      togglePaymentFormBtn.addEventListener('click', () => {
        paymentForm.classList.add('hidden');
        openPaymentEntryModal();
      });
    }

    document.body.addEventListener('click', (event) => {
      const selectInvoiceButton = event.target.closest('[data-select-invoice]');
      if (selectInvoiceButton) {
        const invoiceId = selectInvoiceButton.dataset.selectInvoice;
        const invoiceSelect = document.getElementById('invoiceSelect');
        if (invoiceSelect) {
          invoiceSelect.value = invoiceId;
          if (paymentForm) {
            paymentForm.classList.add('hidden');
          }
          if (togglePaymentFormBtn) {
            togglePaymentFormBtn.textContent = 'Buka form';
          }
          updatePaymentMeta();
        }
        openPaymentEntryModal(invoiceId);
      }
    });

    const invoiceCustomerFilter = document.getElementById('invoiceCustomerFilter');
    const invoiceDateFilter = document.getElementById('invoiceDateFilter');
    const clearInvoiceFiltersBtn = document.getElementById('clearInvoiceFilters');

    if (invoiceCustomerFilter) {
      invoiceCustomerFilter.addEventListener('change', () => {
        renderInvoices();
      });
    }

    if (invoiceDateFilter) {
      invoiceDateFilter.addEventListener('change', () => {
        renderInvoices();
      });
    }

    if (clearInvoiceFiltersBtn) {
      clearInvoiceFiltersBtn.addEventListener('click', () => {
        if (invoiceCustomerFilter) invoiceCustomerFilter.value = 'all';
        if (invoiceDateFilter) invoiceDateFilter.value = '';
        renderInvoices();
      });
    }

    const quickAddInvoiceBtn = document.getElementById('quickAddInvoiceBtn');
    if (quickAddInvoiceBtn) {
      quickAddInvoiceBtn.addEventListener('click', () => {
        addInvoiceBtn?.click();
      });
    }

    const downloadReceivablesLedgerBtn = document.getElementById('downloadReceivablesLedgerBtn');
    if (downloadReceivablesLedgerBtn) {
      downloadReceivablesLedgerBtn.addEventListener('click', () => {
        downloadReceivablesLedger();
      });
    }

    const addInvoiceItemBtn = document.getElementById('addInvoiceItemBtn');
    if (addInvoiceItemBtn) {
      addInvoiceItemBtn.addEventListener('click', () => {
        const tableBody = document.getElementById('invoiceItemsTableBody');
        if (tableBody) {
          tableBody.insertAdjacentHTML('beforeend', buildInvoiceRow());
          const lastRow = tableBody.lastElementChild;
          if (lastRow) {
            lastRow.querySelector('.item-name')?.focus();
          }
          updateInvoiceItemRows();
        }
      });
    }

    const invoiceDateInput = document.getElementById('invoiceDate');
    const invoiceTermInput = document.getElementById('invoiceTerm');
    const invoiceCustomerInput = document.getElementById('invoiceCustomerId');

    if (invoiceDateInput) {
      invoiceDateInput.addEventListener('change', syncInvoiceDueDate);
    }
    if (invoiceTermInput) {
      invoiceTermInput.addEventListener('change', syncInvoiceDueDate);
    }
    if (invoiceCustomerInput) {
      invoiceCustomerInput.addEventListener('change', updateInvoiceSequencePreview);
    }

    document.body.addEventListener('input', (event) => {
      if (event.target.closest('.item-qty, .item-price, .item-name')) {
        updateInvoiceItemRows();
      }
    });

    document.body.addEventListener('change', (event) => {
      const nameInput = event.target.closest('.item-name');
      if (nameInput) {
        const selectedName = nameInput.value;
        const priceInput = nameInput.closest('tr')?.querySelector('.item-price');
        if (selectedName && priceInput && invoiceItemPricing[selectedName]) {
          priceInput.value = invoiceItemPricing[selectedName];
        }
        updateInvoiceItemRows();
      }
    });

    document.body.addEventListener('click', (event) => {
      if (event.target.closest('.remove-item-row')) {
        const row = event.target.closest('tr');
        if (row && document.querySelectorAll('#invoiceItemsTableBody tr').length > 1) {
          row.remove();
          updateInvoiceItemRows();
        }
      }
    });

    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
      customerForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const customerId = document.getElementById('customerId').value.trim() || getNextCustomerId();
        const name = document.getElementById('customerName').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const npwp = document.getElementById('customerNwp').value.trim();
        const creditLimit = Number(document.getElementById('customerLimit').value || 0);
        const status = document.getElementById('customerStatus').value;
        const editId = document.getElementById('customerEditId').value.trim();

        if (!name || !address || !phone) {
          alert('Mohon lengkapi data pelanggan terlebih dahulu.');
          return;
        }

        if (editId) {
          const index = state.customers.findIndex((customer) => customer.id === editId);
          if (index >= 0) {
            state.customers[index] = { ...state.customers[index], id: customerId, name, address, phone, npwp, creditLimit, status };
            alert(`Pelanggan ${name} berhasil diperbarui.`);
          }
        } else {
          state.customers.push({
            id: customerId,
            name,
            address,
            phone,
            npwp,
            creditLimit,
            status
          });
          alert(`Pelanggan ${name} berhasil ditambahkan.`);
        }

        customerForm.reset();
        document.getElementById('customerEditId').value = '';
        document.getElementById('customerId').value = getNextCustomerId();
        renderCustomers();
        renderDashboard();
        populateCustomerOptions();
        populateInvoiceSelect();
        closeModal('customerModal');
      });
    }

    const invoiceForm = document.getElementById('invoiceForm');
    if (invoiceForm) {
      invoiceForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const customerId = document.getElementById('invoiceCustomerId').value;
        const customer = getCustomerById(customerId);
        const invoiceId = document.getElementById('invoiceNumber').value.trim() || getNextInvoiceId();
        const invoiceDate = document.getElementById('invoiceDate').value;
        const dueDate = document.getElementById('invoiceDueDate').value;
        const notes = document.getElementById('invoiceNotes').value.trim();
        const shippingCost = Number(document.getElementById('shippingCost')?.value || 0);

        const rows = Array.from(document.querySelectorAll('#invoiceItemsTableBody tr'));
        const items = rows.map((row) => {
          const name = row.querySelector('.item-name')?.value?.trim() || '';
          const qty = Number(row.querySelector('.item-qty')?.value || 0);
          const unitPrice = Number(row.querySelector('.item-price')?.value || 0);
          return { name, qty, unitPrice };
        }).filter((item) => item.name && item.qty > 0 && item.unitPrice >= 0);

        const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
        const total = subtotal + shippingCost;

        if (!customer || !invoiceDate || !dueDate || items.length === 0 || total <= 0) {
          alert('Mohon lengkapi item invoice dan total tagihan dengan benar.');
          return;
        }

        state.invoices.push({
          id: invoiceId,
          customerId,
          invoiceDate,
          dueDate,
          total,
          shippingCost,
          notes,
          items: items.length ? items : [{ name: notes || 'Barang Kredit', qty: 1, unitPrice: total }]
        });

        invoiceForm.reset();
        document.getElementById('shippingCost').value = 0;
        ensureInvoiceItems();
        renderInvoices();
        renderDashboard();
        renderAging();
        renderPaymentDebtList();
        populateInvoiceSelect();
        populateCustomerOptions();
        closeModal('invoiceModal');
        alert(`Invoice ${invoiceId} berhasil dibuat untuk ${customer.name}.`);
      });
    }

    const paymentModalForm = document.getElementById('paymentModalForm');
    if (paymentModalForm) {
      paymentModalForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const invoiceSelect = document.getElementById('paymentModalInvoiceSelect');
        const paymentDate = document.getElementById('paymentModalDate');
        const paymentAmount = document.getElementById('paymentModalAmount');
        const paymentMethod = document.getElementById('paymentModalMethod');

        if (!invoiceSelect || !paymentDate || !paymentAmount) {
          alert('Form pembayaran belum siap.');
          return;
        }

        const invoiceId = invoiceSelect.value;
        const invoice = state.invoices.find((item) => item.id === invoiceId);
        const amount = Number(paymentAmount.value || 0);
        const paymentDateValue = paymentDate.value;
        const method = paymentMethod ? paymentMethod.value : 'Tunai';

        if (!invoice || !paymentDateValue || amount <= 0) {
          alert('Mohon isi data pembayaran dengan benar.');
          return;
        }

        const discount = getDiscountOnPayment(invoiceId, paymentDateValue);
        const currentlyPaid = getTotalPaid(invoiceId);
        const remainingBefore = invoice.total - currentlyPaid;
        const finalPayment = Math.min(amount, remainingBefore);

        state.payments.push({
          id: `PAY-${state.payments.length + 1}`,
          invoiceId,
          paymentDate: paymentDateValue,
          amount: finalPayment,
          discount,
          method
        });

        renderDashboard();
        renderInvoices();
        renderPaymentDebtList();
        renderPaymentSummary();
        renderAging();
        updatePaymentMeta();
        updatePaymentModalMeta();
        paymentModalForm.reset();
        invoiceSelect.value = invoiceId;
        populateInvoiceSelect();
        closeModal('paymentModal');
        alert(`Pembayaran berhasil dicatat untuk ${invoiceId}.`);
      });
    }
  }

  function bindPaymentForm() {
    const invoiceSelect = document.getElementById('invoiceSelect');
    const paymentDate = document.getElementById('paymentDate');
    const paymentForm = document.getElementById('paymentForm');

    if (!invoiceSelect || !paymentDate || !paymentForm) return;

    invoiceSelect.addEventListener('change', updatePaymentMeta);
    paymentDate.addEventListener('change', updatePaymentMeta);

    const paymentModalInvoiceSelect = document.getElementById('paymentModalInvoiceSelect');
    const paymentModalDate = document.getElementById('paymentModalDate');
    if (paymentModalInvoiceSelect) {
      paymentModalInvoiceSelect.addEventListener('change', updatePaymentModalMeta);
    }
    if (paymentModalDate) {
      paymentModalDate.addEventListener('change', updatePaymentModalMeta);
    }

    paymentForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const invoiceId = invoiceSelect.value;
      const paymentDateValue = paymentDate.value;
      const amount = Number(document.getElementById('paymentAmount').value || 0);
      const paymentMethod = document.getElementById('paymentMethod')?.value || 'Tunai';
      const invoice = state.invoices.find((item) => item.id === invoiceId);

      if (!invoice || !paymentDateValue || amount <= 0) {
        alert('Mohon isi data pembayaran dengan benar.');
        return;
      }

      const discount = getDiscountOnPayment(invoiceId, paymentDateValue);
      const currentlyPaid = getTotalPaid(invoiceId);
      const remainingBefore = invoice.total - currentlyPaid;
      const finalPayment = Math.min(amount, remainingBefore);

      state.payments.push({
        id: `PAY-${state.payments.length + 1}`,
        invoiceId,
        paymentDate: paymentDateValue,
        amount: finalPayment,
        discount,
        method: paymentMethod
      });

      renderDashboard();
      renderInvoices();
      renderPaymentDebtList();
      renderPaymentSummary();
      renderAging();
      updatePaymentMeta();
      paymentForm.reset();
      invoiceSelect.value = invoiceId;
      populateInvoiceSelect();
      alert(`Pembayaran berhasil dicatat untuk ${invoiceId}.`);
    });
  }

  function initializeSupabaseIfAvailable() {
    if (typeof window === 'undefined') return;

    if (window.SUPABASE_CONFIG && window.supabase && window.supabase.createClient) {
      const { supabaseUrl, supabaseKey } = window.SUPABASE_CONFIG;
      if (supabaseUrl && supabaseKey) {
        window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
      }
    }

    if (window.SupabasePiutangApp && typeof window.SupabasePiutangApp.fetchSupabaseData === 'function') {
      window.SupabasePiutangApp.fetchSupabaseData()
        .then((result) => {
          if (!result) return;
          if (result.customers && result.customers.length) {
            state.customers = result.customers;
          }
          if (result.invoices && result.invoices.length) {
            state.invoices = result.invoices;
          }
          if (result.payments && result.payments.length) {
            state.payments = result.payments;
          }
          renderDashboard();
          renderCustomers();
          renderInvoices();
          renderPaymentDebtList();
          renderPaymentSummary();
          renderAging();
          populateInvoiceSelect();
        })
        .catch((error) => {
          console.warn('Supabase tidak tersedia atau data tidak dapat dimuat:', error);
        });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const paymentDateInput = document.getElementById('paymentDate');
    if (paymentDateInput) {
      paymentDateInput.value = new Date().toISOString().slice(0, 10);
    }

    ensureInvoiceItems();
    syncInvoiceDueDate();
    initializeSupabaseIfAvailable();
    bindGlobalActions();
    renderDashboard();
    renderCustomers();
    renderInvoices();
    populateInvoiceSelect();
    renderPaymentDebtList();
    renderPaymentSummary();
    renderAging();
    bindPaymentForm();
    updatePaymentMeta();
    updatePaymentModalMeta();
  });
})();
