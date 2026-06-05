import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerTrader } from "../redux/services/trader.service";

const initialForm = {
  trader_name: "",
  trader_type: "Individual",
  mobile: "",
  email: "",
  address: "",
  operational_districts: "",
  years_of_experience: 0,
  markets: "Export",
  profile_image: null,
  company_logo: null,
};

const RegisterTrader = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validate = () => {
    if (!formData.trader_name.trim()) return "Trader name is required";
    if (!formData.trader_type.trim()) return "Trader type is required";
    if (!formData.mobile.trim()) return "Mobile number is required";

    if (!/^[0-9]{10}$/.test(formData.mobile.trim())) {
      return "Enter a valid 10 digit mobile number";
    }

    if (!formData.email.trim()) return "Email is required";
    if (!formData.address.trim()) return "Address is required";
    if (!formData.markets.trim()) return "Market is required";

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const payload = {
        trader_name: formData.trader_name.trim(),
        trader_type: formData.trader_type,
        mobile: formData.mobile.replace(/\D/g, "").slice(0, 10),
        email: formData.email.trim(),
        address: formData.address.trim(),
        operational_districts: formData.operational_districts
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        years_of_experience: Number(formData.years_of_experience || 0),
        markets: formData.markets,
        profile_image: formData.profile_image,
        company_logo: formData.company_logo,
      };

      console.log("REGISTER TRADER PAYLOAD:", payload);

      await registerTrader(payload);

      setSuccess(
        "Trader registered successfully. Account is inactive until admin approval."
      );

      setFormData(initialForm);

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.message || "Trader registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Trader Organization Signup
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Public trader signup. The account is inactive until admin approval.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Trader Name *
            </label>
            <input
              value={formData.trader_name}
              onChange={(e) => updateField("trader_name", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter trader name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Trader Type *
            </label>
            <select
              value={formData.trader_type}
              onChange={(e) => updateField("trader_type", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
              <option value="Organization">Organization</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Mobile *
            </label>
            <input
              value={formData.mobile}
              onChange={(e) =>
                updateField(
                  "mobile",
                  e.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="trader@example.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter address"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Operational Districts
            </label>
            <input
              value={formData.operational_districts}
              onChange={(e) =>
                updateField("operational_districts", e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Chennai, Madurai, Coimbatore"
            />
            <p className="mt-1 text-xs text-slate-500">
              Separate multiple districts using comma.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Years Of Experience
            </label>
            <input
              type="number"
              min="0"
              value={formData.years_of_experience}
              onChange={(e) =>
                updateField("years_of_experience", Number(e.target.value))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Markets *
            </label>
            <select
              value={formData.markets}
              onChange={(e) => updateField("markets", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Export">Export</option>
              <option value="Domestic">Domestic</option>
              <option value="Both">Both</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Profile Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                updateField("profile_image", e.target.files?.[0] || null)
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Company Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                updateField("company_logo", e.target.files?.[0] || null)
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Registering..." : "Register Trader"}
            </button>

            <Link
              to="/login"
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterTrader;