const notAvailable = "Not available";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

export function unwrapProcurementList(response) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.procurements)) return data.procurements;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.procurements)) return response.procurements;

  return [];
}

export function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatCurrency(value) {
  return currencyFormatter.format(safeNumber(value));
}

export function valueOrNotAvailable(value) {
  if (value === undefined || value === null || value === "") {
    return notAvailable;
  }

  return String(value);
}

export function getFirstValue(item = {}, keys = []) {
  for (const key of keys) {
    const value = item[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

export function formatWeight(value) {
  if (value === notAvailable) return value;

  const text = String(value);

  if (text.toLowerCase().includes("kg")) {
    return text;
  }

  return `${text} kg`;
}

export function formatOptionalCurrency(value) {
  if (value === undefined || value === null || value === "") {
    return notAvailable;
  }

  return formatCurrency(value);
}

function normalizeStatus(value) {
  const status = String(value || "CONFIRMED").trim().toUpperCase();

  if (status === "PARTIAL" || status === "PARTIAL_PAID") {
    return "PARTIALLY_PAID";
  }

  if (status === "SETTLED") {
    return "PAID";
  }

  return status || "CONFIRMED";
}

export function normalizeProcurement(item = {}) {
  const harvest = item.harvest || item.harvest_request || item.harvestRequest || {};
  const producer =
    item.producer ||
    item.farmer ||
    item.farmer_details ||
    item.producer_details ||
    item.producerDetails ||
    item.farmerDetails ||
    harvest.producer ||
    harvest.farmer ||
    harvest.producer_details ||
    harvest.producerDetails ||
    harvest.farmer_details ||
    harvest.farmerDetails ||
    {};

  const totalValue = safeNumber(
    getFirstValue(item, [
      "total_value",
      "totalValue",
      "procurement_value",
      "procurementValue",
      "procurement_amount",
      "procurementAmount",
    ])
  );
  const totalPaid = safeNumber(
    getFirstValue(item, ["total_paid", "totalPaid", "paid_amount", "paidAmount"])
  );
  const outstandingBalance = safeNumber(
    getFirstValue(item, [
      "outstanding_balance",
      "outstandingBalance",
      "balance_amount",
      "balanceAmount",
    ])
  );

  const procurementNo = valueOrNotAvailable(
    getFirstValue(item, ["procurement_no", "procurementNo", "procurement_number"])
  );

  const harvestLabel = valueOrNotAvailable(
    getFirstValue(item, [
      "harvest_code",
      "harvestCode",
      "reference_code",
      "referenceCode",
      "harvest_reference",
      "harvestReference",
    ]) ||
      getFirstValue(harvest, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
      ])
  );

  const producerLabel = valueOrNotAvailable(
    getFirstValue(item, [
      "producer_name",
      "producerName",
      "farmer_name",
      "farmerName",
      "source_name",
      "sourceName",
      "supplier_name",
      "supplierName",
    ]) ||
      getFirstValue(producer, [
        "producer_name",
        "producerName",
        "farmer_name",
        "farmerName",
        "name",
        "full_name",
        "fullName",
        "source_name",
        "sourceName",
      ]) ||
      getFirstValue(harvest, [
        "producer_name",
        "producerName",
        "farmer_name",
        "farmerName",
        "source_name",
        "sourceName",
      ])
  );

  const harvestId = getFirstValue(item, ["harvest_id", "harvestId"]) ||
    getFirstValue(harvest, ["id", "harvest_id", "harvestId", "booking_id"]);

  return {
    raw: item,
    id: getFirstValue(item, ["id", "procurement_id", "procurementId"]),
    harvestId,
    procurementNo,
    harvest: harvestLabel,
    producer: producerLabel,
    actualWeight: valueOrNotAvailable(
      getFirstValue(item, [
        "actual_harvest_weight_kg",
        "actualHarvestWeightKg",
        "actual_weight_kg",
        "actualWeightKg",
      ]) ||
        getFirstValue(harvest, [
          "actual_harvest_weight_kg",
          "actualHarvestWeightKg",
          "actual_weight_kg",
          "actualWeightKg",
        ])
    ),
    totalValue,
    totalPaid,
    outstandingBalance,
    payments: Array.isArray(item.payments) ? item.payments : [],
    status: normalizeStatus(item.status),
    searchText: [
      procurementNo,
      harvestLabel,
      producerLabel,
      item.status,
      item.id,
    ]
      .filter((value) => value && value !== notAvailable)
      .join(" ")
      .toLowerCase(),
  };
}

function getNestedObject(item = {}, keys = []) {
  for (const key of keys) {
    const value = item[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
}

function firstObject(...items) {
  return items.find(
    (item) => item && typeof item === "object" && Object.keys(item).length > 0
  ) || {};
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatStatusLabel(status) {
  const value = String(status || "").trim();

  if (!value) return notAvailable;

  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) return notAvailable;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return notAvailable;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDocumentValue(value) {
  return escapeHtml(valueOrNotAvailable(value));
}

function getProcurementPrintModel(procurement = {}) {
  const raw = procurement.raw || {};
  const harvest = getNestedObject(raw, ["harvest", "harvest_request", "harvestRequest"]);
  const trader = getNestedObject(raw, [
    "trader",
    "trader_details",
    "traderDetails",
  ]);
  const pond = firstObject(
    getNestedObject(raw, ["pond", "pond_details", "pondDetails"]),
    getNestedObject(harvest, ["pond", "pond_details", "pondDetails"])
  );
  const farm = firstObject(
    getNestedObject(raw, ["farm", "farm_details", "farmDetails"]),
    getNestedObject(harvest, ["farm", "farm_details", "farmDetails"])
  );

  const harvestReference = valueOrNotAvailable(
    getFirstValue(raw, [
      "harvest_code",
      "harvestCode",
      "reference_code",
      "referenceCode",
      "harvest_reference",
      "harvestReference",
      "request_code",
      "requestCode",
      "booking_code",
      "bookingCode",
    ]) ||
      getFirstValue(harvest, [
        "harvest_code",
        "harvestCode",
        "reference_code",
        "referenceCode",
        "harvest_reference",
        "harvestReference",
        "request_code",
        "requestCode",
        "booking_code",
        "bookingCode",
      ])
  );

  const actualWeight =
    procurement.actualWeight !== notAvailable
      ? procurement.actualWeight
      : getFirstValue(raw, [
          "actual_harvest_weight_kg",
          "actualHarvestWeightKg",
          "actual_weight_kg",
          "actualWeightKg",
        ]) ||
        getFirstValue(harvest, [
          "actual_harvest_weight_kg",
          "actualHarvestWeightKg",
          "actual_weight_kg",
          "actualWeightKg",
        ]);

  return {
    procurementNo: procurement.procurementNo,
    procurementDate: getFirstValue(raw, ["procurement_date", "procurementDate", "created_at", "createdAt"]),
    status: procurement.status,
    harvestReference,
    producerName: procurement.producer,
    farmName:
      getFirstValue(raw, ["farm_name", "farmName"]) ||
      getFirstValue(farm, ["farm_name", "farmName", "name"]) ||
      getFirstValue(harvest, ["farm_name", "farmName"]),
    pond:
      getFirstValue(raw, ["pond_name", "pondName", "pond_code", "pondCode"]) ||
      getFirstValue(pond, ["pond_name", "pondName", "pond_code", "pondCode", "name"]) ||
      getFirstValue(harvest, ["pond_name", "pondName", "pond_code", "pondCode"]),
    species:
      getFirstValue(raw, ["species"]) ||
      getFirstValue(harvest, ["species"]),
    actualWeight,
    traderName:
      getFirstValue(raw, ["trader_name", "traderName"]) ||
      getFirstValue(trader, ["trader_name", "traderName", "name", "business_name", "businessName"]),
    traderCode:
      getFirstValue(raw, ["trader_code", "traderCode"]) ||
      getFirstValue(trader, ["trader_code", "traderCode", "code"]),
    traderGstin:
      getFirstValue(raw, ["trader_gstin", "traderGstin", "gstin"]) ||
      getFirstValue(trader, ["trader_gstin", "traderGstin", "gstin"]),
    authorizedSignatory: getFirstValue(raw, [
      "authorized_signatory",
      "authorizedSignatory",
    ]),
    ratePerKg: getFirstValue(raw, ["rate_per_kg", "ratePerKg"]),
    grossValue: getFirstValue(raw, [
      "gross_value",
      "grossValue",
      "gross_amount",
      "grossAmount",
    ]),
    adjustmentAmount: getFirstValue(raw, ["adjustment_amount", "adjustmentAmount"]),
    taxAmount: getFirstValue(raw, ["tax_amount", "taxAmount"]),
    totalValue: procurement.totalValue,
    totalPaid: procurement.totalPaid,
    outstandingBalance: procurement.outstandingBalance,
    paymentTerms: getFirstValue(raw, ["payment_terms", "paymentTerms"]),
  };
}

export function buildProcurementPrintHtml(procurement) {
  const model = getProcurementPrintModel(procurement);
  const title = `${model.procurementNo || "Procurement"} - Procurement Document`;
  const row = (label, value) => `
    <div class="field">
      <dt>${escapeHtml(label)}</dt>
      <dd>${value}</dd>
    </div>
  `;
  const currencyRow = (label, value) => row(label, formatDocumentValue(formatOptionalCurrency(value)));
  const section = (titleText, rows) => `
    <section>
      <h2>${escapeHtml(titleText)}</h2>
      <dl>${rows.join("")}</dl>
    </section>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .document {
      max-width: 780px;
      margin: 0 auto;
      padding: 28px;
    }
    header {
      border-bottom: 2px solid #111827;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .doc-title {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      color: #374151;
    }
    .doc-no {
      margin-top: 10px;
      font-size: 18px;
      font-weight: 800;
    }
    section {
      break-inside: avoid;
      border: 1px solid #d1d5db;
      margin: 0 0 16px;
      padding: 16px;
    }
    h2 {
      margin: 0 0 12px;
      color: #111827;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 18px;
      margin: 0;
    }
    .field {
      min-width: 0;
    }
    dt {
      color: #6b7280;
      font-size: 10px;
      font-weight: 800;
      margin: 0 0 3px;
      text-transform: uppercase;
    }
    dd {
      color: #111827;
      font-size: 13px;
      font-weight: 700;
      margin: 0;
      overflow-wrap: anywhere;
    }
    .full {
      grid-column: 1 / -1;
    }
    footer {
      border-top: 1px solid #d1d5db;
      color: #6b7280;
      font-size: 11px;
      margin-top: 18px;
      padding-top: 12px;
      text-align: center;
    }
    @media print {
      .document { padding: 0; max-width: none; }
    }
    @media screen and (max-width: 640px) {
      .document { padding: 18px; }
      dl { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="document">
    <header>
      <div class="brand">ROOTVERSE</div>
      <div class="doc-title">Procurement Document</div>
      <div class="doc-no">${formatDocumentValue(model.procurementNo)}</div>
    </header>

    ${section("Procurement Information", [
      row("Procurement No", formatDocumentValue(model.procurementNo)),
      row("Procurement Date", formatDocumentValue(formatDateTime(model.procurementDate))),
      row("Status", formatDocumentValue(formatStatusLabel(model.status))),
    ])}

    ${section("Producer / Harvest Information", [
      row("Harvest Reference", formatDocumentValue(model.harvestReference)),
      row("Producer / Farmer", formatDocumentValue(model.producerName)),
      row("Farm", formatDocumentValue(model.farmName)),
      row("Pond", formatDocumentValue(model.pond)),
      row("Species", formatDocumentValue(model.species)),
      row("Actual Harvest Weight", formatDocumentValue(formatWeight(valueOrNotAvailable(model.actualWeight)))),
    ])}

    ${section("Trader Information", [
      row("Trader Name", formatDocumentValue(model.traderName)),
      row("Trader Code", formatDocumentValue(model.traderCode)),
      row("Trader GSTIN", formatDocumentValue(model.traderGstin)),
      row("Authorized Signatory", formatDocumentValue(model.authorizedSignatory)),
    ])}

    ${section("Settlement", [
      row("Actual Harvest Weight", formatDocumentValue(formatWeight(valueOrNotAvailable(model.actualWeight)))),
      currencyRow("Rate / Kg", model.ratePerKg),
      currencyRow("Gross Value", model.grossValue),
      currencyRow("Adjustment", model.adjustmentAmount),
      currencyRow("Tax", model.taxAmount),
      currencyRow("Total Procurement Value", model.totalValue),
      currencyRow("Total Paid", model.totalPaid),
      currencyRow("Outstanding Balance", model.outstandingBalance),
      row("Payment Terms", formatDocumentValue(model.paymentTerms)),
      row("Status", formatDocumentValue(formatStatusLabel(model.status))),
    ])}

    <footer>Generated from RootVerse Trader Portal</footer>
  </main>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;
}
