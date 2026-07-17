import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Store, Plus, Search, Clock, X, Image, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "./Toast";

export default function ShopSelector() {
  const { t } = useTranslation();
  const { shop, shops, activeShopId, switchShop, addShop } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopAddress, setNewShopAddress] = useState("");
  const [newShopPhone, setNewShopPhone] = useState("");
  const [newShopUpiId, setNewShopUpiId] = useState("");
  const [newShopGstNumber, setNewShopGstNumber] = useState("");
  const [newShopLogo, setNewShopLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get recent shops (last 5 switched shops, excluding current)
  const recentShops = shops
    .filter((s) => s.id !== activeShopId)
    .slice(0, 5);

  // Get other shops (excluding current and recent)
  const otherShops = shops.filter(
    (s) => s.id !== activeShopId && !recentShops.some((r) => r.id === s.id)
  );

  // Filter shops based on search query
  const filteredRecentShops = recentShops.filter((s) =>
    (s.name || s.shop_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOtherShops = otherShops.filter((s) =>
    (s.name || s.shop_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!newShopName.trim()) {
      newErrors.shopName = t("shops.shop_name_required", "Shop name is required");
    }
    
    if (!newShopAddress.trim()) {
      newErrors.address = t("shops.address_required", "Address is required");
    }
    
    if (!newShopPhone.trim()) {
      newErrors.phone = t("shops.phone_required", "Phone number is required");
    } else {
      // Indian phone number validation (10 digits, optionally starting with +91 or 0)
      const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
      const cleanPhone = newShopPhone.replace(/\s+/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone = t("shops.phone_invalid", "Enter a valid 10-digit Indian phone number");
      }
    }
    
    // GST number validation (optional but if provided, validate format)
    if (newShopGstNumber.trim()) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(newShopGstNumber.trim().toUpperCase())) {
        newErrors.gstNumber = t("shops.gst_invalid", "Enter a valid GST number");
      }
    }
    
    // UPI ID validation (optional but if provided, validate format)
    if (newShopUpiId.trim()) {
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(newShopUpiId.trim())) {
        newErrors.upiId = t("shops.upi_invalid", "Enter a valid UPI ID (e.g., name@bank)");
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showError(t("shops.logo_invalid_type", "Please select an image file"));
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showError(t("shops.logo_too_large", "Logo must be less than 2MB"));
        return;
      }
      setNewShopLogo(file);
      const reader = new FileReader();
      reader.onload = (event) => setLogoPreview(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setNewShopLogo(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateShop = async () => {
    if (!validateForm()) return;
    
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("name", newShopName.trim());
      formData.append("address", newShopAddress.trim());
      formData.append("whatsapp_number", newShopPhone.trim());
      if (newShopUpiId.trim()) formData.append("upi_id", newShopUpiId.trim());
      if (newShopGstNumber.trim()) formData.append("gst_number", newShopGstNumber.trim().toUpperCase());
      if (newShopLogo) formData.append("shop_logo", newShopLogo);
      
      const res = await api.createShop(formData);
      if (res.shop) {
        addShop(res.shop);
        switchShop(res.shop.id);
        setShowCreateModal(false);
        setNewShopName("");
        setNewShopAddress("");
        setNewShopPhone("");
        setNewShopUpiId("");
        setNewShopGstNumber("");
        setNewShopLogo(null);
        setLogoPreview(null);
        setErrors({});
        showSuccess(t("shops.create_success", "Shop created successfully!"));
      }
    } catch (err) {
      console.error("Failed to create shop:", err);
      const errorMessage = err.message || t("shops.create_error", "Failed to create shop");
      if (errorMessage.includes("already exists") || errorMessage.includes("409")) {
        showError(t("shops.duplicate_phone", "A shop with this phone number already exists"));
        setErrors({ phone: t("shops.duplicate_phone", "A shop with this phone number already exists") });
      } else {
        showError(errorMessage);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {shops.length <= 1 ? (
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 border border-black/5 hover:bg-white/80 transition-all text-sm font-medium text-ink/70"
        >
          <Plus className="h-4 w-4" />
          <span>{t("shops.add_shop", "Add Shop")}</span>
        </button>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) setSearchQuery("");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 border border-black/5 hover:bg-white/80 transition-all text-sm font-medium text-ink/70 min-w-[180px] sm:min-w-[220px]"
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            <Store className="h-4 w-4 text-shopfront flex-shrink-0" />
            <span className="truncate hidden sm:inline-block">{shop?.name || shop?.shop_name || t("common.shop", "Shop")}</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} flex-shrink-0`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-black/5 shadow-xl py-2 z-50 overflow-hidden"
                role="menu"
              >
                {/* Search Bar */}
                <div className="px-3 py-2.5 border-b border-black/5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/30" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("shops.search_placeholder", "Search shops...")}
                      className="w-full pl-10 pr-4 py-2 bg-paper/50 border border-black/5 rounded-xl text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-shopfront/50 focus:ring-2 focus:ring-shopfront/20 transition-all"
                      aria-label={t("shops.search_placeholder", "Search shops...")}
                    />
                  </div>
                </div>

                {/* Current Shop */}
                <div className="py-1">
                  {shops
                    .filter((s) => s.id === activeShopId)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors bg-shopfront/5 text-shopfront font-medium"
                        role="menuitem"
                        aria-current="true"
                      >
                        <div className="relative">
                          <Store className="h-5 w-5 text-shopfront flex-shrink-0" />
                          <span className="absolute -top-1 -right-1 h-4 w-4 bg-marigold text-paper rounded-full text-[10px] font-bold flex items-center justify-center">
                            ✓
                          </span>
                        </div>
                        <span className="truncate font-medium">{s.name || s.shop_name}</span>
                        <span className="ml-auto text-xs text-marigold font-medium px-2 py-0.5 bg-marigold/10 rounded-full">
                          {t("shops.active", "Active")}
                        </span>
                      </button>
                    ))}
                  </div>
                {activeShopId && filteredRecentShops.length > 0 && <hr className="my-2 border-black/5 mx-3" />}

                {/* Recent Shops */}
                {filteredRecentShops.length > 0 && (
                  <div className="py-1">
                    <div className="px-4 py-1.5 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-ink/30" />
                      <span className="text-xs font-medium text-ink/50 uppercase tracking-wide">
                        {t("shops.recent", "Recent")}
                      </span>
                    </div>
                    {filteredRecentShops.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          switchShop(s.id);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-ink/70 hover:bg-black/5"
                        role="menuitem"
                      >
                        <div className="relative">
                          <Store className="h-4 w-4 text-ink/30 flex-shrink-0" />
                        </div>
                        <span className="truncate font-medium">{s.name || s.shop_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Other Shops */}
                {filteredOtherShops.length > 0 && (
                  <div className="py-1">
                    {(filteredRecentShops.length > 0 || activeShopId) && <hr className="my-2 border-black/5 mx-3" />}
                    <div className="px-4 py-1.5 flex items-center gap-2">
                      <Store className="h-3.5 w-3.5 text-ink/30" />
                      <span className="text-xs font-medium text-ink/50 uppercase tracking-wide">
                        {t("shops.other_shops", "Other Shops")}
                      </span>
                    </div>
                    {filteredOtherShops.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          switchShop(s.id);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-ink/70 hover:bg-black/5"
                        role="menuitem"
                      >
                        <Store className="h-4 w-4 text-ink/30 flex-shrink-0" />
                        <span className="truncate font-medium">{s.name || s.shop_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {searchQuery && filteredRecentShops.length === 0 && filteredOtherShops.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <Search className="h-8 w-8 text-ink/20 mx-auto mb-2" />
                    <p className="text-sm text-ink/50">{t("shops.no_results", "No shops found")}</p>
                  </div>
                )}

                {/* Add Shop Button */}
                <hr className="my-2 border-black/5 mx-3" />
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-shopfront hover:bg-shopfront/5 transition-colors mx-3 rounded-xl"
                  role="menuitem"
                >
                  <div className="h-8 w-8 rounded-lg bg-shopfront/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-shopfront" />
                  </div>
                  <span>{t("shops.add_shop", "Add Shop")}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Create Shop Modal - always rendered */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowCreateModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-shop-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="create-shop-title" className="text-lg font-bold text-ink">
                  {t("shops.create_shop", "Create New Shop")}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-black/5 text-ink/50 transition-colors"
                  aria-label={t("common.close", "Close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Shop Name */}
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">
                    {t("shops.shop_name", "Shop Name")} <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="text"
                    value={newShopName}
                    onChange={(e) => {
                      setNewShopName(e.target.value);
                      if (errors.shopName) setErrors({ ...errors, shopName: undefined });
                    }}
                    placeholder={t("shops.shop_name_placeholder", "e.g., Main Bazaar Store")}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-shopfront/20 focus:border-shopfront text-ink ${errors.shopName ? "border-terracotta" : "border-black/10"}`}
                    autoFocus
                  />
                  {errors.shopName && <p className="mt-1 text-sm text-terracotta">{errors.shopName}</p>}
                </div>
                
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">
                    {t("shops.address", "Address")} <span className="text-terracotta">*</span>
                  </label>
                  <textarea
                    value={newShopAddress}
                    onChange={(e) => {
                      setNewShopAddress(e.target.value);
                      if (errors.address) setErrors({ ...errors, address: undefined });
                    }}
                    placeholder={t("shops.address_placeholder", "e.g., 123 Main Street, City, State")}
                    rows={2}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-shopfront/20 focus:border-shopfront text-ink ${errors.address ? "border-terracotta" : "border-black/10"}`}
                  />
                  {errors.address && <p className="mt-1 text-sm text-terracotta">{errors.address}</p>}
                </div>
                
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">
                    {t("shops.phone", "Phone")} <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newShopPhone}
                    onChange={(e) => {
                      setNewShopPhone(e.target.value);
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    placeholder={t("shops.phone_placeholder", "e.g., 9876543210")}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-shopfront/20 focus:border-shopfront text-ink ${errors.phone ? "border-terracotta" : "border-black/10"}`}
                  />
                  {errors.phone && <p className="mt-1 text-sm text-terracotta">{errors.phone}</p>}
                </div>
                
                {/* UPI ID */}
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">
                    {t("shops.upi_id", "UPI ID")} <span className="text-ink/40">({t("common.optional", "Optional")})</span>
                  </label>
                  <input
                    type="text"
                    value={newShopUpiId}
                    onChange={(e) => {
                      setNewShopUpiId(e.target.value);
                      if (errors.upiId) setErrors({ ...errors, upiId: undefined });
                    }}
                    placeholder={t("shops.upi_placeholder", "e.g., shopname@paytm")}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-shopfront/20 focus:border-shopfront text-ink ${errors.upiId ? "border-terracotta" : "border-black/10"}`}
                  />
                  {errors.upiId && <p className="mt-1 text-sm text-terracotta">{errors.upiId}</p>}
                </div>
                
                {/* GST Number */}
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">
                    {t("shops.gst_number", "GST Number")} <span className="text-ink/40">({t("common.optional", "Optional")})</span>
                  </label>
                  <input
                    type="text"
                    value={newShopGstNumber}
                    onChange={(e) => {
                      setNewShopGstNumber(e.target.value);
                      if (errors.gstNumber) setErrors({ ...errors, gstNumber: undefined });
                    }}
                    placeholder={t("shops.gst_placeholder", "e.g., 29ABCDE1234F1Z5")}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-shopfront/20 focus:border-shopfront text-ink ${errors.gstNumber ? "border-terracotta" : "border-black/10"}`}
                  />
                  {errors.gstNumber && <p className="mt-1 text-sm text-terracotta">{errors.gstNumber}</p>}
                </div>
                
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">
                    {t("shops.logo", "Logo")} <span className="text-ink/40">({t("common.optional", "Optional")})</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        id="shop-logo-upload"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                          logoPreview ? "border-shopfront/50 bg-shopfront/5" : "border-black/10 hover:border-shopfront/50"
                        }`}
                        aria-label={t("shops.upload_logo", "Upload logo")}
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="w-full h-full rounded-lg object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-ink/40">
                            <Image className="h-6 w-6" />
                            <span className="text-xs">{t("shops.upload", "Upload")}</span>
                          </div>
                        )}
                      </button>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-terracotta/90 text-white flex items-center justify-center hover:bg-terracotta transition-colors"
                          aria-label={t("shops.remove_logo", "Remove logo")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-ink/50 max-w-xs">
                      {t("shops.logo_hint", "JPG, PNG or WebP. Max 2MB. Recommended: square aspect ratio.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-ink/70 font-medium hover:bg-black/5 transition-colors"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  onClick={handleCreateShop}
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-shopfront text-paper font-medium hover:bg-shopfront/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("common.creating", "Creating...")}</span>
                    </>
                  ) : (
                    t("shops.create", "Create")
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}