import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  createCratePacker,
  getCratePackers,
} from "../redux/actions/trader.actions";

import traderService from "../redux/services/trader.service";

const initialForm = {
  name: "",
  phone: "",
  address: "",
  email: "",
  date_of_birth: "",
  country_id: "",
  state_id: "",
  district_id: "",
  location_id: "",
  status: "active",
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
  if (Array.isArray(data?.cratePackers)) return data.cratePackers;
  if (Array.isArray(data?.crate_packers)) return data.crate_packers;

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

function getPackerId(item) {
  return item?.id || item?._id || item?.packer_id || item?.phone || item?.email;
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).split("T")[0];
}

export default function CratePackers() {
  const dispatch = useDispatch();

  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );

  const { cratePackers = [], loading, error } = traderState;

  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locations, setLocations] = useState([]);

  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState("");

  useEffect(() => {
    dispatch(getCratePackers()).catch(() => {});
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
    const { name, value } = e.target;

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

    if (name === "phone") {
      setForm((prev) => ({
        ...prev,
        phone: cleanMobile(value),
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: form.name.trim(),
        phone: cleanMobile(form.phone),
        address: form.address.trim(),
        email: form.email.trim(),
        date_of_birth: form.date_of_birth,
        location_id: Number(form.location_id),
        status: form.status || "active",
      };

      console.log("CREATE CRATE PACKER PAYLOAD:", payload);

      await dispatch(createCratePacker(payload));

      setForm(initialForm);
      setStates([]);
      setDistricts([]);
      setLocations([]);
      setSuccess("Crate packer created successfully");
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crate Packers</h1>
        <p className="text-sm text-gray-500">
          Create and manage crate packers under logged-in trader.
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

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Add Crate Packer
        </h2>

        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Input
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            maxLength={10}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <Input
            label="Date of Birth"
            name="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={handleChange}
            required
          />

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Enter address"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
            />
          </div>

          <Select
            label="Country"
            name="country_id"
            value={form.country_id}
            onChange={handleChange}
            required
            disabled={masterLoading}
            options={countries}
          />

          <Select
            label="State"
            name="state_id"
            value={form.state_id}
            onChange={handleChange}
            required
            disabled={!form.country_id || masterLoading}
            options={states}
          />

          <Select
            label="District"
            name="district_id"
            value={form.district_id}
            onChange={handleChange}
            required
            disabled={!form.state_id || masterLoading}
            options={districts}
          />

          <Select
            label="Location"
            name="location_id"
            value={form.location_id}
            onChange={handleChange}
            required
            disabled={!form.district_id || masterLoading}
            options={locations}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading || masterLoading}
              className="rounded-lg bg-green-700 px-5 py-2 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Create Crate Packer"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Crate Packer List
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">DOB</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Location ID</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {!Array.isArray(cratePackers) || cratePackers.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No crate packers found
                  </td>
                </tr>
              ) : (
                cratePackers.map((item) => (
                  <tr
                    key={getPackerId(item)}
                    className="border-t border-gray-100"
                  >
                    <td className="px-4 py-3">{item.name || "-"}</td>
                    <td className="px-4 py-3">
                      {item.phone || item.mobile || "-"}
                    </td>
                    <td className="px-4 py-3">{item.email || "-"}</td>
                    <td className="px-4 py-3">
                      {formatDate(item.date_of_birth)}
                    </td>
                    <td className="px-4 py-3">{item.address || "-"}</td>
                    <td className="px-4 py-3">{item.location_id || "-"}</td>
                    <td className="px-4 py-3">
                      {getLocationNameForTable(item)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          String(item.status || "active").toLowerCase() ===
                          "inactive"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {item.status || "active"}
                      </span>
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

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
      />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  disabled = false,
  required = false,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600 disabled:bg-gray-100"
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map((item) => (
          <option key={getItemId(item)} value={getItemId(item)}>
            {getItemName(item)}
          </option>
        ))}
      </select>
    </div>
  );
}