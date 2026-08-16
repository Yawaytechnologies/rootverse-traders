import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createQualityChecker,
  getQualityCheckers,
} from "../redux/actions/trader.actions";
import traderService from "../redux/services/trader.service";
import TraderButton from "../components/ui/TraderButton";
import TraderInput from "../components/ui/TraderInput";
import TraderSelect from "../components/ui/TraderSelect";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";

const initialForm = {
  checker_name: "",
  checker_email: "",
  checker_phone: "",
  country_id: "",
  state_id: "",
  district_id: "",
  location_id: "",
  checker_code: "",
  is_active: true,
};

function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function extractArray(response, key) {
  const data = response?.data || response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;

  if (key && Array.isArray(data?.[key])) return data[key];
  if (key && Array.isArray(data?.data?.[key])) return data.data[key];

  if (Array.isArray(data?.countries)) return data.countries;
  if (Array.isArray(data?.states)) return data.states;
  if (Array.isArray(data?.districts)) return data.districts;
  if (Array.isArray(data?.locations)) return data.locations;
  if (Array.isArray(data?.qualityCheckers)) return data.qualityCheckers;

  return [];
}

function getItemId(item) {
  return (
    item?.id ||
    item?._id ||
    item?.country_id ||
    item?.state_id ||
    item?.district_id ||
    item?.location_id ||
    ""
  );
}

function getItemName(item) {
  return (
    item?.name ||
    item?.country_name ||
    item?.countryName ||
    item?.state_name ||
    item?.stateName ||
    item?.district_name ||
    item?.districtName ||
    item?.location_name ||
    item?.locationName ||
    item?.title ||
    ""
  );
}

function getCheckerId(item) {
  return item?.id || item?._id || item?.checker_id || item?.checker_code;
}

export default function QualityCheckers() {
  const dispatch = useDispatch();

  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );

  const { qualityCheckers = [], loading, error } = traderState;

  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locations, setLocations] = useState([]);

  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState("");

  useEffect(() => {
    dispatch(getQualityCheckers()).catch(() => {});
    loadCountries();
  }, [dispatch]);

  const loadCountries = async () => {
    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getCountries();
      setCountries(extractArray(response, "countries"));
    } catch (err) {
      console.error(err);
      setMasterError("Country list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const loadStates = async (countryId) => {
    if (!countryId) return;

    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getStatesByCountry(countryId);
      setStates(extractArray(response, "states"));
    } catch (err) {
      console.error(err);
      setMasterError("State list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const loadDistricts = async (stateId) => {
    if (!stateId) return;

    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getDistrictsByState(stateId);
      setDistricts(extractArray(response, "districts"));
    } catch (err) {
      console.error(err);
      setMasterError("District list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const loadLocations = async (districtId) => {
    if (!districtId) return;

    try {
      setMasterLoading(true);
      setMasterError("");

      const response = await traderService.getLocationsByDistrict(districtId);
      setLocations(extractArray(response, "locations"));
    } catch (err) {
      console.error(err);
      setMasterError("Location list fetch failed");
    } finally {
      setMasterLoading(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;

    setSuccess("");

    if (name === "country_id") {
      setForm((prev) => ({
        ...prev,
        country_id: value,
        state_id: "",
        district_id: "",
        location_id: "",
      }));

      setStates([]);
      setDistricts([]);
      setLocations([]);

      if (value) {
        await loadStates(value);
      }

      return;
    }

    if (name === "state_id") {
      setForm((prev) => ({
        ...prev,
        state_id: value,
        district_id: "",
        location_id: "",
      }));

      setDistricts([]);
      setLocations([]);

      if (value) {
        await loadDistricts(value);
      }

      return;
    }

    if (name === "district_id") {
      setForm((prev) => ({
        ...prev,
        district_id: value,
        location_id: "",
      }));

      setLocations([]);

      if (value) {
        await loadLocations(value);
      }

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        checker_name: form.checker_name.trim(),
        checker_email: form.checker_email.trim(),
        checker_phone: cleanMobile(form.checker_phone),
        location_id: Number(form.location_id),
        checker_code: form.checker_code.trim(),
        is_active: Boolean(form.is_active),
      };

      console.log("CREATE QUALITY CHECKER PAYLOAD:", payload);

      await dispatch(createQualityChecker(payload));

      setForm(initialForm);
      setStates([]);
      setDistricts([]);
      setLocations([]);
      setSuccess("Quality checker created successfully");
    } catch (err) {
      console.error(err);
    }
  };

  const getLocationNameForTable = (item) => {
    return (
      item?.location_name ||
      item?.locationName ||
      item?.location?.name ||
      item?.location?.location_name ||
      "-"
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quality Checkers</h1>
        <p className="text-sm text-gray-500">
          Create and manage quality checkers under logged-in trader.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {masterError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {masterError}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Add Quality Checker
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Checker Name
            </label>
            <TraderInput
              name="checker_name"
              value={form.checker_name}
              onChange={handleChange}
              required
              placeholder="Enter checker name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Checker Email
            </label>
            <TraderInput
              type="email"
              name="checker_email"
              value={form.checker_email}
              onChange={handleChange}
              required
              placeholder="Enter checker email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Checker Phone
            </label>
            <TraderInput
              name="checker_phone"
              value={form.checker_phone}
              onChange={handleChange}
              required
              maxLength={10}
              placeholder="10 digit mobile number"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Checker Code
            </label>
            <TraderInput
              name="checker_code"
              value={form.checker_code}
              onChange={handleChange}
              required
              placeholder="QC-001"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Country
            </label>
            <TraderSelect
              name="country_id"
              value={form.country_id}
              onChange={handleChange}
              required
              disabled={masterLoading}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={getItemId(country)} value={getItemId(country)}>
                  {getItemName(country)}
                </option>
              ))}
            </TraderSelect>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              State
            </label>
            <TraderSelect
              name="state_id"
              value={form.state_id}
              onChange={handleChange}
              required
              disabled={!form.country_id || masterLoading}
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={getItemId(state)} value={getItemId(state)}>
                  {getItemName(state)}
                </option>
              ))}
            </TraderSelect>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              District
            </label>
            <TraderSelect
              name="district_id"
              value={form.district_id}
              onChange={handleChange}
              required
              disabled={!form.state_id || masterLoading}
            >
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={getItemId(district)} value={getItemId(district)}>
                  {getItemName(district)}
                </option>
              ))}
            </TraderSelect>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Location
            </label>
            <TraderSelect
              name="location_id"
              value={form.location_id}
              onChange={handleChange}
              required
              disabled={!form.district_id || masterLoading}
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={getItemId(location)} value={getItemId(location)}>
                  {getItemName(location)}
                </option>
              ))}
            </TraderSelect>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div className="md:col-span-2">
            <TraderButton
              type="submit"
              disabled={loading || masterLoading}
            >
              {loading ? "Saving..." : "Create Quality Checker"}
            </TraderButton>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Quality Checker List
          </h2>
        </div>

        <div className="scrollbar-hidden max-w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Location ID</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {qualityCheckers.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No quality checkers found
                  </td>
                </tr>
              ) : (
                qualityCheckers.map((item) => (
                  <tr
                    key={getCheckerId(item)}
                    className="border-t border-gray-100"
                  >
                    <td className="px-4 py-3">{item.checker_code || "-"}</td>
                    <td className="px-4 py-3">{item.checker_name || "-"}</td>
                    <td className="px-4 py-3">{item.checker_email || "-"}</td>
                    <td className="px-4 py-3">{item.checker_phone || "-"}</td>
                    <td className="px-4 py-3">{item.location_id || "-"}</td>
                    <td className="px-4 py-3">
                      {getLocationNameForTable(item)}
                    </td>
                    <td className="px-4 py-3">
                      <TraderStatusBadge
                        status={item.is_active === false ? "Inactive" : "Active"}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
