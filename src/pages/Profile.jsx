import { useEffect, useState } from "react";
import { getLoggedTraderProfile } from "../redux/services/trader.service";
import { saveUser } from "../utils/auth";

function unwrap(response) {
  return response?.data || response || {};
}

const Profile = () => {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getLoggedTraderProfile();
      const data = unwrap(response);

      setProfile(data);
      saveUser(data);
    } catch (err) {
      setError(err.message || "Profile fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <p className="font-medium text-slate-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {profile.trader_name || "Trader Profile"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Complete logged-in trader details from API
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
              profile.is_active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {profile.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {profile.profile_image_url && (
            <ImageBox title="Profile Image" src={profile.profile_image_url} />
          )}

          {profile.company_logo_url && (
            <ImageBox title="Company Logo" src={profile.company_logo_url} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Info label="Trader Name" value={profile.trader_name} />
          <Info label="Trader Type" value={profile.trader_type} />
          <Info label="Mobile" value={profile.mobile} />
          <Info label="Email" value={profile.email} />
          <Info label="Address" value={profile.address} />
          <Info label="Markets" value={profile.markets} />
          <Info
            label="Operational Districts"
            value={
              Array.isArray(profile.operational_districts)
                ? profile.operational_districts.join(", ")
                : profile.operational_districts
            }
          />
          <Info label="Years Of Experience" value={profile.years_of_experience} />
          <Info label="Created At" value={formatDate(profile.created_at)} />
          <Info label="Updated At" value={formatDate(profile.updated_at)} />
        </div>
      </section>
    </div>
  );
};

const ImageBox = ({ title, src }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-sm font-bold text-slate-700">{title}</p>
      <img
        src={src}
        alt={title}
        className="h-40 w-full rounded-lg border border-slate-200 bg-white object-contain"
      />
    </div>
  );
};

const Info = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value === 0 ? 0 : value || "-"}
      </p>
    </div>
  );
};

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default Profile;