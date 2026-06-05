import React, { useState } from "react";
import {
  Bell,
  Search,
  UserCircle,
  LayoutDashboard,
  LogIn,
  ClipboardList,
  PackageCheck,
  Boxes,
  Truck,
  Warehouse,
  Factory,
  FileText,
  Users,
  Plus,
  Phone,
  Eye,
  QrCode,
  MapPin,
  ArrowRight,
  Menu,
  X,
  Building2,
  Ship,
} from "lucide-react";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "access", label: "Platform Access", icon: LogIn },
  { key: "trader", label: "Trader Workflow", icon: Ship },
  { key: "source", label: "Source Procurement", icon: ClipboardList },
  { key: "quality", label: "Quality Operations", icon: PackageCheck },
  { key: "crate", label: "Crate Traceability", icon: Boxes },
  { key: "transport", label: "Transport Operations", icon: Truck },
  { key: "processor", label: "Processor Workflow", icon: Factory },
  { key: "receiving", label: "Receiving Verification", icon: Warehouse },
  { key: "inventory", label: "Raw Material Inventory", icon: Boxes },
  { key: "batch", label: "Processing Batch", icon: Factory },
  { key: "reports", label: "Reports", icon: FileText },
];

const summaryCards = [
  { title: "Harvest Requests", value: "18", note: "From farmers / fishers", status: "Pending" },
  { title: "Active Harvest IDs", value: "09", note: "Accepted procurement", status: "Active" },
  { title: "Quality Verified", value: "31", note: "Inspection completed", status: "Passed" },
  { title: "Traceable Crates", value: "284", note: "QR linked crates", status: "Packed" },
  { title: "Transport Loading", value: "07", note: "Crates scanned", status: "In Transit" },
  { title: "Processor Received", value: "12", note: "Crates confirmed", status: "Received" },
];

const workflowSteps = [
  "Farmer / Fisher",
  "Harvest Request",
  "Trader Accepts",
  "Harvest ID",
  "Quality Inspection",
  "Crate Packing",
  "Transport Loading",
  "Processor Receiving",
  "Processing Batch Creation",
];

const sourceRows = [
  { harvestId: "H-1001", sourceName: "Raj Aqua Farm", type: "Farmer", district: "Nagapattinam", biomass: "800 KG", size: "30 Count", status: "Pending" },
  { harvestId: "H-1002", sourceName: "Sea Fisher Group", type: "Fisher", district: "Chennai", biomass: "500 KG", size: "1.2 KG", status: "Accepted" },
  { harvestId: "H-1003", sourceName: "Blue Pond Farms", type: "Farmer", district: "Cuddalore", biomass: "1,200 KG", size: "35 Count", status: "Pending" },
];

const qualityRows = [
  { harvestId: "H-1001", inspector: "Kumar", product: "Shrimp", parameters: "Size, freshness, disease", images: "3 Images", status: "Passed" },
  { harvestId: "H-1002", inspector: "Naveen", product: "Fish", parameters: "Condition, size, quality", images: "2 Images", status: "Review" },
];

const crateRows = [
  { qr: "C-001", harvestId: "H-1001", weight: "25 KG", grade: "A", packedBy: "Mani", status: "Packed" },
  { qr: "C-002", harvestId: "H-1001", weight: "25 KG", grade: "A", packedBy: "Mani", status: "Packed" },
  { qr: "C-003", harvestId: "H-1001", weight: "20 KG", grade: "B", packedBy: "Arul", status: "Packed" },
];

const transportRows = [
  { loadingId: "TL-1001", harvestId: "H-1001", vehicle: "TN-01-AB-2345", operator: "Ravi", scanned: "42 / 42", custody: "Trader → Transport", status: "In Transit" },
  { loadingId: "TL-1002", harvestId: "H-1002", vehicle: "TN-04-CD-5678", operator: "Arun", scanned: "30 / 34", custody: "Trader → Transport", status: "Pending" },
];

const receivingRows = [
  { receivingId: "R-1001", trader: "Blue Ocean Traders", harvestId: "H-1001", expected: "42", received: "42", custody: "Transport → Processor", status: "Received" },
  { receivingId: "R-1002", trader: "Coastal Trade Co", harvestId: "H-1002", expected: "34", received: "30", custody: "Transport → Processor", status: "Pending" },
];

const inventoryRows = [
  { inventoryId: "INV-001", harvestId: "H-1001", trader: "Blue Ocean Traders", product: "Shrimp", quantity: "980 KG", status: "Allocated" },
  { inventoryId: "INV-002", harvestId: "H-1002", trader: "Coastal Trade Co", product: "Fish", quantity: "620 KG", status: "Available" },
];

const batchRows = [
  { batchId: "PB-1001", product: "Shrimp", source: "Multiple Traders", quantity: "1,800 KG", purpose: "Export Ready", status: "Created" },
  { batchId: "PB-1002", product: "Fish", source: "Trader Supply", quantity: "900 KG", purpose: "Domestic", status: "In Process" },
];

const operationalUsers = [
  { name: "Kumar", role: "Quality Inspector", mobile: "98765 43210", status: "Active" },
  { name: "Mani", role: "Crate Packer", mobile: "98765 43211", status: "Active" },
  { name: "Ravi", role: "Transport Operator", mobile: "98765 43212", status: "Active" },
  { name: "TN-01-AB-2345", role: "Transport Vehicle", mobile: "Cold-chain vehicle", status: "Active" },
];

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Passed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Packed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Received: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Allocated: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Created: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Available: "bg-blue-100 text-blue-700 border-blue-200",
    "In Transit": "bg-blue-100 text-blue-700 border-blue-200",
    Review: "bg-orange-100 text-orange-700 border-orange-200",
    "In Process": "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status}
    </span>
  );
}

function PrimaryButton({ children }) {
  return <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">{children}</button>;
}

function SecondaryButton({ children }) {
  return <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{children}</button>;
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function TableHeader({ children }) {
  return <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{children}</th>;
}

function TableCell({ children, className = "" }) {
  return <td className={`px-4 py-4 text-sm text-slate-700 ${className}`}>{children}</td>;
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">RootVerse Trade Infrastructure</p>
          <h1 className="text-2xl font-black text-slate-950 md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        {children && <div className="flex flex-wrap gap-3">{children}</div>}
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows, renderRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200">
        <thead className="bg-slate-50">
          <tr>{headers.map((header) => <TableHeader key={header}>{header}</TableHeader>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

function DashboardSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Infrastructure Dashboard"
        subtitle="Separate Trader and Processor web portals connected through one seafood traceability infrastructure."
      >
        <PrimaryButton><Plus className="h-4 w-4" /> Trader Registration</PrimaryButton>
        <SecondaryButton><Plus className="h-4 w-4" /> Processor Registration</SecondaryButton>
        <SecondaryButton><Users className="h-4 w-4" /> Add Operational User</SecondaryButton>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex justify-between"><StatusBadge status={card.status} /></div>
            <p className="text-3xl font-black text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm font-bold text-slate-800">{card.title}</p>
            <p className="mt-1 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>

      <SectionCard title="RootVerse Workflow" subtitle="Corrected workflow from the document: farmer/fisher to processor batch creation.">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
          {workflowSteps.map((step, index) => (
            <div key={step} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">{index + 1}</div>
                <p className="text-sm font-bold text-slate-800">{step}</p>
              </div>
              {index < workflowSteps.length - 1 && <ArrowRight className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-300 xl:block" />}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function AccessSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platform Access" subtitle="The web portal provides separate signup and login options for Traders and Processors." />
      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Trader Registration" subtitle="Seafood traders create a Trader Organization account and access the Trader Portal." action={<PrimaryButton>Trader Signup</PrimaryButton>}>
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            After registration, trader users are routed to their Trader workspace based on organization type and login permission.
          </div>
        </SectionCard>
        <SectionCard title="Processor Registration" subtitle="Seafood processors create a Processor Organization account and access the Processor Portal." action={<PrimaryButton>Processor Signup</PrimaryButton>}>
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            After registration, processor users are routed to their Processor workspace based on organization type and login permission.
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function TraderSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trader Workflow" subtitle="Trader manages procurement and logistics from source to processor through a traceable workflow." action={null} />
      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Trader Operations" subtitle="Correct trader workflow modules.">
          <div className="grid gap-3 sm:grid-cols-2">
            {["Source Procurement", "Quality Operations", "Crate Traceability", "Transport Operations"].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">{item}</div>)}
          </div>
        </SectionCard>
        <SectionCard title="Operational Team" subtitle="Trader can onboard and manage these users/assets." action={<PrimaryButton>Add User / Vehicle</PrimaryButton>}>
          <div className="space-y-3">
            {operationalUsers.map((user) => (
              <div key={user.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div><p className="font-bold text-slate-900">{user.name}</p><p className="mt-1 text-sm text-slate-500">{user.role} • {user.mobile}</p></div>
                <StatusBadge status={user.status} />
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function SourceSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Source Procurement" subtitle="Procurement begins when farmers or fishers submit harvest requests through the RootVerse mobile app." />
      <SectionCard title="Harvest Requests" subtitle="Trader reviews harvest details before accepting procurement request.">
        <SimpleTable headers={["Harvest ID", "Source Name", "Type", "District", "Biomass", "Size", "Status", "Action"]} rows={sourceRows} renderRow={(row) => (
          <tr key={row.harvestId}>
            <TableCell className="font-bold text-slate-900">{row.harvestId}</TableCell><TableCell>{row.sourceName}</TableCell><TableCell>{row.type}</TableCell><TableCell>{row.district}</TableCell><TableCell>{row.biomass}</TableCell><TableCell>{row.size}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell><div className="flex gap-2"><button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Phone className="h-4 w-4" /></button><button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4" /></button><PrimaryButton>Accept</PrimaryButton></div></TableCell>
          </tr>
        )} />
      </SectionCard>
    </div>
  );
}

function QualitySection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Quality Operations" subtitle="Quality inspectors verify shrimp or fish and update inspection details, images, and quality parameters." />
      <SectionCard title="Quality Inspection Records" subtitle="Inspection details are connected to Harvest ID.">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <SimpleTable headers={["Harvest ID", "Inspector", "Product", "Parameters", "Images", "Status"]} rows={qualityRows} renderRow={(row) => (
            <tr key={row.harvestId}><TableCell className="font-bold text-slate-900">{row.harvestId}</TableCell><TableCell>{row.inspector}</TableCell><TableCell>{row.product}</TableCell><TableCell>{row.parameters}</TableCell><TableCell>{row.images}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></tr>
          )} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-black text-slate-900">Quality Image Preview</h3>
            <div className="mt-4 grid grid-cols-3 gap-3">{[1,2,3].map((i) => <div key={i} className="flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-400">Image {i}</div>)}</div>
            <div className="mt-5 flex gap-2"><PrimaryButton>Approve</PrimaryButton><SecondaryButton>Reject</SecondaryButton></div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function CrateSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Crate Traceability" subtitle="Crate packers pack seafood into traceable crates linked to Harvest ID and quality inspection records.">
        <SecondaryButton><QrCode className="h-4 w-4" /> Generate QR</SecondaryButton><PrimaryButton><Plus className="h-4 w-4" /> Add Crate</PrimaryButton>
      </PageHeader>
      <SectionCard title="Crate-Level Traceability" subtitle="Trader can view crate quantity, weight, grade, procurement summary, and traceability.">
        <SimpleTable headers={["Crate QR", "Harvest ID", "Weight", "Grade", "Packed By", "Status", "Action"]} rows={crateRows} renderRow={(row) => (
          <tr key={row.qr}><TableCell className="font-bold text-slate-900">{row.qr}</TableCell><TableCell>{row.harvestId}</TableCell><TableCell>{row.weight}</TableCell><TableCell>{row.grade}</TableCell><TableCell>{row.packedBy}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell><button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4" /></button></TableCell></tr>
        )} />
      </SectionCard>
    </div>
  );
}

function TransportSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transport Operations" subtitle="During loading, crate QR codes are scanned and custody transfers from trader operation to transport operation." />
      <SectionCard title="Transport Loading Records" subtitle="Transport vehicle and operator manage crate movement to processor.">
        <SimpleTable headers={["Loading ID", "Harvest ID", "Vehicle", "Operator", "Scanned Crates", "Custody", "Status"]} rows={transportRows} renderRow={(row) => (
          <tr key={row.loadingId}><TableCell className="font-bold text-slate-900">{row.loadingId}</TableCell><TableCell>{row.harvestId}</TableCell><TableCell>{row.vehicle}</TableCell><TableCell>{row.operator}</TableCell><TableCell>{row.scanned}</TableCell><TableCell>{row.custody}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></tr>
        )} />
      </SectionCard>
    </div>
  );
}

function ProcessorSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Processor Workflow" subtitle="Processor receives, verifies, manages, and processes seafood procured through the RootVerse trade infrastructure network." />
      <section className="grid gap-6 lg:grid-cols-3">
        {["Receiving Verification", "Raw Material Inventory", "Processing Batch Creation"].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><Factory className="mb-4 h-7 w-7 text-emerald-600" /><h3 className="font-black text-slate-900">{item}</h3><p className="mt-2 text-sm text-slate-500">Processor workflow module</p></div>)}
      </section>
    </div>
  );
}

function ReceivingSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Receiving Verification" subtitle="Processor scans crate QR codes and confirms receipt. Custody transfers from transport operation to processor." />
      <SectionCard title="Processor Receiving Records" subtitle="Received crates are added into the processor workflow.">
        <SimpleTable headers={["Receiving ID", "Trader", "Harvest ID", "Expected", "Received", "Custody", "Status"]} rows={receivingRows} renderRow={(row) => (
          <tr key={row.receivingId}><TableCell className="font-bold text-slate-900">{row.receivingId}</TableCell><TableCell>{row.trader}</TableCell><TableCell>{row.harvestId}</TableCell><TableCell>{row.expected}</TableCell><TableCell>{row.received}</TableCell><TableCell>{row.custody}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></tr>
        )} />
      </SectionCard>
    </div>
  );
}

function InventorySection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Raw Material Inventory" subtitle="Processor manages received seafood inventory from multiple traders." />
      <SectionCard title="Inventory Allocation" subtitle="Inventory maintains trader, harvest, crate, and source traceability.">
        <SimpleTable headers={["Inventory ID", "Harvest ID", "Trader", "Product", "Quantity", "Status"]} rows={inventoryRows} renderRow={(row) => (
          <tr key={row.inventoryId}><TableCell className="font-bold text-slate-900">{row.inventoryId}</TableCell><TableCell>{row.harvestId}</TableCell><TableCell>{row.trader}</TableCell><TableCell>{row.product}</TableCell><TableCell>{row.quantity}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></tr>
        )} />
      </SectionCard>
    </div>
  );
}

function BatchSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Processing Batch Creation" subtitle="Processor can combine seafood received from multiple traders and create processing batches.">
        <PrimaryButton><Plus className="h-4 w-4" /> Create Batch</PrimaryButton>
      </PageHeader>
      <SectionCard title="Processing Batches" subtitle="Batches maintain traceability continuity from harvest source to export-ready products.">
        <SimpleTable headers={["Batch ID", "Product", "Source", "Quantity", "Purpose", "Status"]} rows={batchRows} renderRow={(row) => (
          <tr key={row.batchId}><TableCell className="font-bold text-slate-900">{row.batchId}</TableCell><TableCell>{row.product}</TableCell><TableCell>{row.source}</TableCell><TableCell>{row.quantity}</TableCell><TableCell>{row.purpose}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></tr>
        )} />
      </SectionCard>
    </div>
  );
}

function ReportsSection() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Traceability" subtitle="Search traceability records from harvest source to processing batch creation.">
        <SecondaryButton>Export Report</SecondaryButton>
      </PageHeader>
      <SectionCard title="Traceability Search" subtitle="Search by Harvest ID, Crate QR, Receiving ID, Inventory ID, or Batch ID.">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <label className="text-sm font-bold text-slate-900">Search Traceability</label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center rounded-2xl border border-slate-200 bg-white px-4 py-3"><Search className="mr-3 h-5 w-5 text-slate-400" /><input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Enter Harvest ID / Crate QR / Batch ID" /></div><PrimaryButton>Search</PrimaryButton></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{["Procurement Report", "Quality Report", "Crate Report", "Transport Report", "Receiving Report", "Batch Traceability Report"].map((report) => <button key={report} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><FileText className="h-5 w-5 text-emerald-600" />{report}</button>)}</div>
        </div>
      </SectionCard>
    </div>
  );
}

export default function RootVerseTraderWireframe() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const currentMenu = menuItems.find((item) => item.key === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardSection />;
      case "access": return <AccessSection />;
      case "trader": return <TraderSection />;
      case "source": return <SourceSection />;
      case "quality": return <QualitySection />;
      case "crate": return <CrateSection />;
      case "transport": return <TransportSection />;
      case "processor": return <ProcessorSection />;
      case "receiving": return <ReceivingSection />;
      case "inventory": return <InventorySection />;
      case "batch": return <BatchSection />;
      case "reports": return <ReportsSection />;
      default: return <DashboardSection />;
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white">R</div>
        <div><p className="text-lg font-black leading-none text-slate-900">RootVerse</p><p className="mt-1 text-xs font-medium text-slate-500">Trade Infrastructure</p></div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button key={item.key} onClick={() => { setActiveTab(item.key); setMobileSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${isActive ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
              <Icon className="h-5 w-5" /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-900">Trader / Processor</p><p className="mt-1 text-xs text-slate-500">Role based workspace</p></div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl"><div className="absolute right-4 top-4 z-10"><button onClick={() => setMobileSidebarOpen(false)} className="rounded-xl border border-slate-200 bg-white p-2"><X className="h-5 w-5" /></button></div><SidebarContent /></aside>
        </div>
      )}
      <div className="flex">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-white lg:block"><SidebarContent /></aside>
        <div className="min-h-screen flex-1 lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3"><button onClick={() => setMobileSidebarOpen(true)} className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 lg:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-xs font-semibold text-slate-500">Current Section</p><h2 className="text-lg font-black text-slate-900">{currentMenu?.label || "Dashboard"}</h2></div></div>
              <div className="hidden min-w-[340px] max-w-xl flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 md:flex"><Search className="mr-3 h-5 w-5 text-slate-400" /><input className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search Harvest ID, Crate QR, Receiving ID, Batch ID" /></div>
              <div className="flex items-center gap-3"><button className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" /></button><div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 md:flex"><UserCircle className="h-6 w-6 text-slate-500" /><div><p className="text-sm font-bold text-slate-800">RootVerse User</p><p className="text-xs text-slate-500">Organization Workspace</p></div></div></div>
            </div>
          </header>
          <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">{renderContent()}</main>
        </div>
      </div>
    </div>
  );
}
