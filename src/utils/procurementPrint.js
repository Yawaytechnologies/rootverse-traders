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
