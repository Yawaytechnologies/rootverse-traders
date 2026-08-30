export function getResponseData(response) {
  return response?.data || response || {};
}

export function extractContractList(response, key) {
  const data = getResponseData(response);

  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];

  return [];
}

export function normalizeQualityChecker(item = {}) {
  return {
    raw: item,
    id: item.id,
    checker_code: item.checker_code,
    checker_name: item.checker_name,
    checker_phone: item.checker_phone,
    checker_email: item.checker_email,
    is_active: item.is_active,
    location_id: item.location_id,
  };
}

export function normalizeCratePacker(item = {}) {
  return {
    raw: item,
    id: item.id,
    code: item.code,
    name: item.name,
    phone: item.phone,
    email: item.email,
    address: item.address,
    date_of_birth: item.date_of_birth,
    location_id: item.location_id,
    status: item.status,
  };
}

export function normalizeTransportOperator(item = {}) {
  return {
    raw: item,
    id: item.id,
    operator_rv_id: item.operator_rv_id,
    full_name: item.full_name,
    email: item.email,
    mobile: item.mobile,
    transport_id: item.transport_id,
    vehicle_no: item.vehicle_no,
    route_name: item.route_name,
    vehicle_type: item.vehicle_type,
    is_active: item.is_active,
  };
}
