import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  createTransportOperator,
  getTransportOperators,
} from "../redux/actions/trader.actions";
import TraderButton from "../components/ui/TraderButton";
import TraderInput from "../components/ui/TraderInput";
import TraderSelect from "../components/ui/TraderSelect";
import TraderStatusBadge from "../components/ui/TraderStatusBadge";

const initialForm = {
  operator_rv_id: "",
  full_name: "",
  email: "",
  mobile: "",
  password: "",
  transport_id: "",
  vehicle_no: "",
  route_name: "",
  vehicle_type: "",
  is_active: true,
};

function cleanMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function getId(item) {
  return item?.id || item?._id || item?.operator_rv_id || item?.transport_id;
}

function getValue(item, keys, fallback = "-") {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== "") {
      return item[key];
    }
  }
  return fallback;
}

export default function TransportOperators() {
  const dispatch = useDispatch();

  const traderState = useSelector(
    (state) => state.trader || state.traderReducer || {}
  );

  const { transportOperators = [], loading, error } = traderState;

  const [form, setForm] = useState(initialForm);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    dispatch(getTransportOperators()).catch(() => {});
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "mobile") {
      setForm((prev) => ({
        ...prev,
        mobile: cleanMobile(value),
      }));
      setSuccess("");
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        operator_rv_id: form.operator_rv_id.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        mobile: cleanMobile(form.mobile),
        password: form.password.trim(),
        transport_id: form.transport_id.trim(),
        vehicle_no: form.vehicle_no.trim(),
        route_name: form.route_name.trim(),
        vehicle_type: form.vehicle_type.trim(),
        is_active: Boolean(form.is_active),
      };

      await dispatch(createTransportOperator(payload));

      setForm(initialForm);
      setSuccess("Transport operator created successfully");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Transport Operators
        </h1>
        <p className="text-sm text-gray-500">
          Create and manage transport operators under logged-in trader.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Add Transport Operator
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Input
            label="Operator RV ID"
            name="operator_rv_id"
            value={form.operator_rv_id}
            onChange={handleChange}
            placeholder="OP-RV-001"
            required
          />

          <Input
            label="Full Name"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />

          <Input
            label="Mobile"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            placeholder="10 digit mobile number"
            maxLength={10}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter password"
            required
          />

          <Input
            label="Transport ID"
            name="transport_id"
            value={form.transport_id}
            onChange={handleChange}
            placeholder="TRN-001"
            required
          />

          <Input
            label="Vehicle Number"
            name="vehicle_no"
            value={form.vehicle_no}
            onChange={handleChange}
            placeholder="TN 09 AB 1234"
            required
          />

          <Input
            label="Route Name"
            name="route_name"
            value={form.route_name}
            onChange={handleChange}
            placeholder="Chennai to Madurai"
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Vehicle Type
            </label>
            <TraderSelect
              name="vehicle_type"
              value={form.vehicle_type}
              onChange={handleChange}
              required
            >
              <option value="">Select vehicle type</option>
              <option value="Mini Truck">Mini Truck</option>
              <option value="Truck">Truck</option>
              <option value="Van">Van</option>
              <option value="Container">Container</option>
              <option value="Refrigerated Truck">Refrigerated Truck</option>
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
              disabled={loading}
            >
              {loading ? "Saving..." : "Create Transport Operator"}
            </TraderButton>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Transport Operator List
          </h2>
        </div>

        <div className="scrollbar-hidden max-w-full overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3">Operator RV ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Transport ID</th>
                <th className="px-4 py-3">Vehicle No</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Vehicle Type</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {!Array.isArray(transportOperators) ||
              transportOperators.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No transport operators found
                  </td>
                </tr>
              ) : (
                transportOperators.map((item) => (
                  <tr key={getId(item)} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      {getValue(item, ["operator_rv_id", "operatorRvId"])}
                    </td>
                    <td className="px-4 py-3">
                      {getValue(item, ["full_name", "fullName", "name"])}
                    </td>
                    <td className="px-4 py-3">{getValue(item, ["email"])}</td>
                    <td className="px-4 py-3">
                      {getValue(item, ["mobile", "phone"])}
                    </td>
                    <td className="px-4 py-3">
                      {getValue(item, ["transport_id", "transportId"])}
                    </td>
                    <td className="px-4 py-3">
                      {getValue(item, ["vehicle_no", "vehicleNo"])}
                    </td>
                    <td className="px-4 py-3">
                      {getValue(item, ["route_name", "routeName"])}
                    </td>
                    <td className="px-4 py-3">
                      {getValue(item, ["vehicle_type", "vehicleType"])}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        active={item?.is_active !== false}
                        activeText="Active"
                        inactiveText="Inactive"
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

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  maxLength,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <TraderInput
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </div>
  );
}

function StatusBadge({ active, activeText, inactiveText }) {
  return <TraderStatusBadge status={active ? activeText : inactiveText} />;
}
