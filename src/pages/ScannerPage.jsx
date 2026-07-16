import { useState, useRef } from "react";
import { Scan, Camera, Upload, Edit3, Trash2, Plus, CheckCircle, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { Card } from "./DashboardPage";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api";

export default function ScannerPage() {
  const { load } = useOutletContext();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const fileInputRef = useRef(null);

  const startScanSimulation = (file) => {
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setScanning(true);
    setScanProgress(0);
    setEntries([]);
    setError("");
    setSuccess(false);

    // Animate scan progress bar
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          performOcr(file);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) startScanSimulation(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      startScanSimulation(file);
    }
  };

  const triggerSampleScan = () => {
    // Generate a mock file with random sizes to trigger different demo extraction sets in simulate.js
    const sampleSizes = [1001, 1002, 1003];
    const size = sampleSizes[Math.floor(Math.random() * sampleSizes.length)];
    const mockFile = new File(["sample_notebook_ocr_data"], "sample_bahi_khata.jpg", {
      type: "image/jpeg",
    });
    // Override the size property of File object
    Object.defineProperty(mockFile, 'size', { value: size });

    startScanSimulation(mockFile);
  };

  const performOcr = async (file) => {
    try {
      const res = await api.simScan(file);
      if (res.entries) {
        setEntries(res.entries.map((e, idx) => ({ ...e, tempId: idx + Date.now() })));
      } else {
        throw new Error("No entries extracted from scan");
      }
    } catch (err) {
      setError(err.message || "Failed to scan the image. Ensure server is running.");
    } finally {
      setScanning(false);
    }
  };

  const handleFieldChange = (tempId, field, value) => {
    setEntries((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, [field]: value } : e))
    );
  };

  const deleteRow = (tempId) => {
    setEntries((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        tempId: Date.now(),
        item: "",
        qty: 1,
        unit: "unit",
        amount: 0,
        payment_type: "cash",
        party_name: "",
        confidence: 1.0,
      },
    ]);
  };

  const saveToLedger = async () => {
    setError("");
    // Basic validation
    const invalid = entries.some(e => !e.item.trim() || !(Number(e.amount) > 0) || (e.payment_type === "udhaar" && !e.party_name.trim()));
    if (invalid) {
      setError("Please fill in all item names, positive amounts, and customer names for Udhaar rows.");
      return;
    }

    try {
      const res = await api.simScanApply(entries);
      if (res.ok) {
        setSuccess(true);
        setAppliedCount(res.applied);
        setEntries([]);
        setImage(null);
        setImagePreview(null);
        await load(); // update layout data
      }
    } catch (err) {
      setError(err.message || "Could not save the entries to the ledger.");
    }
  };

  const resetAll = () => {
    setImage(null);
    setImagePreview(null);
    setEntries([]);
    setSuccess(false);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-shopfront flex items-center gap-2">
            <Scan className="h-6 w-6 text-leaf" /> Notebook Scanner
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            Digitize your handwritten paper bahi-khata ledger sheets into digital entries instantly.
          </p>
        </div>
        {imagePreview && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-4 py-2 border border-black/5 hover:border-terracotta/20 hover:bg-terracotta/5 text-ink/60 hover:text-terracotta text-xs font-semibold rounded-xl transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Start Over
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image input / Scanner View */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="Source Bahi-Khata Page">
            {!imagePreview ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-black/10 hover:border-leaf/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-leaf/5 group min-h-[300px]"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-14 h-14 bg-leaf/10 text-leaf rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-shopfront text-sm mb-1">Upload a photo of your notebook</h3>
                <p className="text-xs text-ink/50 max-w-[200px] mb-4">
                  Drag and drop, or click to browse photos
                </p>
                <div className="w-full border-t border-black/5 my-3"></div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerSampleScan();
                  }}
                  className="text-xs font-semibold text-leaf hover:text-leaf-700 bg-leaf/10 hover:bg-leaf/20 px-4 py-2 rounded-xl transition-all"
                >
                  Try with Sample Image
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center border border-black/5 min-h-[300px]">
                <img
                  src={imagePreview}
                  alt="Notebook page"
                  className="max-h-[400px] object-contain w-full"
                />

                {/* Holographic scanner effect */}
                {scanning && (
                  <>
                    <div className="absolute inset-0 bg-leaf/10 pointer-events-none"></div>
                    <div className="absolute left-0 right-0 h-1 bg-leaf/80 shadow-[0_0_15px_var(--color-leaf)] scan-line pointer-events-none"></div>
                    <div className="absolute inset-x-0 bottom-4 flex justify-center">
                      <div className="bg-shopfront/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-leaf animate-pulse"></span>
                        Scanning Handwriting ({scanProgress}%)
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Columns: Review / Extracted Data Sheet */}
        <div className="lg:col-span-2 space-y-6">
          {success && (
            <div className="p-6 bg-leaf/10 border border-leaf/20 text-leaf rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-leaf text-white flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-shopfront">Ledger Updated Successfully</h3>
              <p className="text-sm text-ink/70 mt-1 max-w-md">
                We successfully verified and added {appliedCount} transaction entries to your shop ledger and updated inventory stock.
              </p>
              <button
                onClick={resetAll}
                className="mt-4 bg-leaf text-white hover:bg-leaf/90 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Scan Another Sheet
              </button>
            </div>
          )}

          {!imagePreview && !success && (
            <div className="h-full min-h-[350px] bg-white/40 border border-black/5 rounded-2xl flex flex-col items-center justify-center text-center text-ink/40 p-8">
              <Camera className="h-10 w-10 mb-3 opacity-60" />
              <h3 className="font-semibold text-shopfront text-sm">Waiting for notebook scan...</h3>
              <p className="text-xs max-w-sm mt-1">
                Once you snap or upload a ledger page, the extracted lines will appear here in a spreadsheet format for your final approval.
              </p>
            </div>
          )}

          {scanning && !success && (
            <div className="h-full min-h-[350px] bg-white border border-black/5 rounded-2xl flex flex-col items-center justify-center text-center text-ink/50 p-8 space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-leaf/20 border-t-leaf animate-spin"></div>
                <Scan className="h-5 w-5 text-leaf absolute inset-0 m-auto" />
              </div>
              <h3 className="font-semibold text-shopfront text-sm">Analyzing Ink & Context</h3>
              <p className="text-xs max-w-xs leading-normal">
                Detecting characters, parsing quantities, and matching party names against your customer database...
              </p>
            </div>
          )}

          {entries.length > 0 && !scanning && !success && (
            <Card title="Review Extracted Ledger Entries">
              <p className="text-xs text-ink/50 mb-4">
                Confirm or adjust the transactions parsed by our AI vision model before writing to the database:
              </p>

              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-black/5 text-ink/40 font-semibold">
                      <th className="pb-3 pr-2">Item Name</th>
                      <th className="pb-3 px-2 w-16 text-center">Qty</th>
                      <th className="pb-3 px-2 w-20">Unit</th>
                      <th className="pb-3 px-2 w-24">Amount (₹)</th>
                      <th className="pb-3 px-2 w-28">Type</th>
                      <th className="pb-3 px-2">Customer Name</th>
                      <th className="pb-3 pl-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {entries.map((entry) => (
                      <tr key={entry.tempId} className="group hover:bg-paper-deep/10">
                        <td className="py-2.5 pr-2">
                          <input
                            type="text"
                            value={entry.item}
                            onChange={(e) => handleFieldChange(entry.tempId, "item", e.target.value)}
                            placeholder="Rice, sugar, soap..."
                            className="w-full bg-paper px-2.5 py-1.5 rounded-lg border border-black/5 outline-none focus:border-leaf/40 font-medium"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            value={entry.qty}
                            onChange={(e) => handleFieldChange(entry.tempId, "qty", Number(e.target.value))}
                            className="w-full bg-paper px-1 py-1.5 text-center rounded-lg border border-black/5 outline-none focus:border-leaf/40 font-medium"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <select
                            value={entry.unit}
                            onChange={(e) => handleFieldChange(entry.tempId, "unit", e.target.value)}
                            className="w-full bg-paper px-1 py-1.5 rounded-lg border border-black/5 outline-none focus:border-leaf/40 font-medium"
                          >
                            <option value="unit">unit</option>
                            <option value="kg">kg</option>
                            <option value="l">litre</option>
                            <option value="packet">packet</option>
                            <option value="piece">piece</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => handleFieldChange(entry.tempId, "amount", Number(e.target.value))}
                            className="w-full bg-paper px-2 py-1.5 rounded-lg border border-black/5 outline-none focus:border-leaf/40 font-semibold text-shopfront"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <select
                            value={entry.payment_type}
                            onChange={(e) => handleFieldChange(entry.tempId, "payment_type", e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-lg border outline-none font-bold ${
                              entry.payment_type === "udhaar"
                                ? "bg-terracotta/5 border-terracotta/20 text-terracotta"
                                : "bg-leaf/5 border-leaf/20 text-leaf"
                            }`}
                          >
                            <option value="cash" className="text-leaf font-bold">Cash</option>
                            <option value="udhaar" className="text-terracotta font-bold">Udhaar</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={entry.party_name || ""}
                            onChange={(e) => handleFieldChange(entry.tempId, "party_name", e.target.value)}
                            disabled={entry.payment_type !== "udhaar"}
                            placeholder={entry.payment_type === "udhaar" ? "Enter customer..." : "N/A"}
                            className={`w-full px-2.5 py-1.5 rounded-lg border outline-none focus:border-leaf/40 font-medium ${
                              entry.payment_type !== "udhaar"
                                ? "bg-black/5 border-black/5 text-ink/30 cursor-not-allowed"
                                : "bg-paper border-black/5"
                            }`}
                          />
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <button
                            onClick={() => deleteRow(entry.tempId)}
                            className="p-1.5 text-ink/30 hover:text-terracotta hover:bg-terracotta/5 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-terracotta bg-terracotta/10 px-4 py-2.5 rounded-xl text-xs mt-4">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs font-bold text-ink/60 hover:text-shopfront hover:bg-paper-deep px-4 py-2 rounded-xl transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Custom Row
                </button>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={resetAll}
                    className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 border border-black/5 rounded-xl hover:bg-paper-deep text-ink/70 text-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveToLedger}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold bg-leaf text-white px-5 py-2.5 rounded-xl hover:bg-leaf/90 shadow-sm transition-all"
                  >
                    <CheckCircle className="h-4 w-4" /> Confirm & Save Ledger
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

