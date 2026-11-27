import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, Contact, SaleItem, PaymentMethod, SaleStatus, VariationValue } from '../../types';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CheckCircle,
  Printer,
  Zap,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Building,
  Edit2,
  Coins,
  MapPin,
  CheckCircle2,
  Package,
  Layers,
  Filter,
} from 'lucide-react';

export const POSInterface: React.FC = () => {
  const {
    state,
    currentBusiness,
    currentLocation,
    currentUser,
    recordSale,
    addContact,
    setLocationId,
  } = useERP();

  // Selected customer (defaults to walk-in customer)
  const walkInCustomer =
    state.contacts.find(
      (c) => c.businessId === currentBusiness.id && c.isDefaultWalkIn
    ) || state.contacts[0];

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    walkInCustomer ? walkInCustomer.id : ''
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [saleStatus, setSaleStatus] = useState<SaleStatus>('final');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [lastSaleInvoice, setLastSaleInvoice] = useState<any>(null);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemPrice, setEditingItemPrice] = useState<number>(0);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');

  // Stock filter: whether to only show products with stock > 0 in this store (true by default)
  const [onlyInStock, setOnlyInStock] = useState<boolean>(true);

  // Variable product modal picker
  const [selectedVariableProduct, setSelectedVariableProduct] = useState<Product | null>(null);

  // Mobile (< md) switcher between product catalog and active cart
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');

  const businessLocations = (state.locations || []).filter(
    (l) => l.businessId === currentBusiness.id
  );

  const activeLocationId = state.currentLocationId === 'all'
    ? businessLocations[0]?.id || state.locations[0]?.id
    : state.currentLocationId;

  const currentPosLocation = businessLocations.find((l) => l.id === activeLocationId) || businessLocations[0];

  // Helper to compute stock of a product in a given store
  const getProductStockInStore = (prd: Product, locId?: string): number => {
    if (!locId) {
      if (prd.type === 'variable' && prd.variations && prd.variations.length > 0) {
        return prd.variations.reduce((sum, v) => {
          return sum + (Object.values(v.locationStock || {}) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
        }, 0);
      }
      return (Object.values(prd.locationStock || {}) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
    }

    if (prd.type === 'variable' && prd.variations && prd.variations.length > 0) {
      return prd.variations.reduce((sum, v) => {
        return sum + (Number(v.locationStock?.[locId]) || 0);
      }, 0);
    }
    return Number(prd.locationStock?.[locId]) || 0;
  };

  // Filter products for active business, active store stock & search/category/subcategory
  const availableProducts = state.products.filter((p) => {
    if (p.businessId !== currentBusiness.id) return false;
    
    // Visibility rule: visible only in stores where it has stock (> 0)
    if (onlyInStock && activeLocationId) {
      const stockInStore = getProductStockInStore(p, activeLocationId);
      if (stockInStore <= 0) return false;
    }

    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (selectedSubCategory !== 'all' && p.subCategoryId !== selectedSubCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      return matchName || matchSku || matchBarcode;
    }
    return true;
  });

  const handleProductCardClick = (product: Product) => {
    if (product.type === 'variable' && product.variations && product.variations.length > 0) {
      // Find variations that have stock in this store
      const inStockVariations = product.variations.filter(
        (v) => (Number(v.locationStock?.[activeLocationId]) || 0) > 0
      );

      if (inStockVariations.length === 1) {
        // Only one variation has stock, add it directly
        addToCart(product, inStockVariations[0].id);
      } else if (inStockVariations.length > 1) {
        // Multiple variations in stock: open modal
        setSelectedVariableProduct(product);
      } else {
        // No variation in stock
        if (!onlyInStock) {
          setSelectedVariableProduct(product);
        }
      }
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: Product, variationId?: string) => {
    let price = product.sellingPrice;
    let varName = '';

    if (variationId && product.variations) {
      const v = product.variations.find((varVal) => varVal.id === variationId);
      if (v) {
        price = v.sellingPrice;
        varName = ` (${v.name})`;
      }
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.variationId === variationId
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        updated[existingIndex].quantity = newQty;
        updated[existingIndex].subtotal = newQty * price;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            variationId,
            productName: `${product.name}${varName}`,
            unitPrice: price,
            quantity: 1,
            taxAmount: (price * (product.taxRate || 0)) / 100,
            discountAmount: 0,
            subtotal: price,
          },
        ];
      }
    });

    const itemKey = `${product.id}-${variationId || 'base'}`;
    setQtyDrafts((prev) => {
      if (!(itemKey in prev)) return prev;
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });

    if (selectedVariableProduct) {
      setSelectedVariableProduct(null);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const targetItem = cart[index];
    if (targetItem) {
      const itemKey = `${targetItem.productId}-${targetItem.variationId || 'base'}`;
      setQtyDrafts((prev) => {
        if (!(itemKey in prev)) return prev;
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
    }

    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      } else {
        updated[index].quantity = newQty;
        updated[index].subtotal = newQty * updated[index].unitPrice;
        return updated;
      }
    });
  };

  const setItemQuantity = (index: number, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      updated[index] = {
        ...item,
        quantity: validQty,
        subtotal: validQty * item.unitPrice,
      };
      return updated;
    });
  };

  const updateItemPrice = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      const product = state.products.find((p) => p.id === item.productId);
      const taxRate = product?.taxRate || 0;
      updated[index] = {
        ...item,
        unitPrice: validPrice,
        taxAmount: (validPrice * taxRate) / 100,
        subtotal: validPrice * item.quantity,
      };
      return updated;
    });
    setEditingItemIdx(null);
  };

  const removeFromCart = (index: number) => {
    const targetItem = cart[index];
    if (targetItem) {
      const itemKey = `${targetItem.productId}-${targetItem.variationId || 'base'}`;
      setQtyDrafts((prev) => {
        if (!(itemKey in prev)) return prev;
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
    }
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotalAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const taxTotal = cart.reduce((acc, item) => acc + item.taxAmount * item.quantity, 0);
  const finalTotal = Math.max(0, subtotalAmount + taxTotal - discountAmount);

  // Complete Sale Handler
  const handleCheckout = (isExpress = false) => {
    if (cart.length === 0) return;

    const invoiceNo = `${
      currentLocation?.invoiceLayout.invoicePrefix || 'FAC-'
    }${Date.now().toString().slice(-6)}`;

    const saleRecord = {
      businessId: currentBusiness.id,
      locationId: activeLocationId || state.locations[0].id,
      customerId: selectedCustomerId || walkInCustomer.id,
      userId: currentUser.id,
      invoiceNo,
      saleDate: new Date().toISOString().split('T')[0],
      status: saleStatus,
      paymentStatus: saleStatus === 'final' ? ('paid' as const) : ('due' as const),
      paymentMethod,
      items: cart,
      discountAmount,
      taxAmount: taxTotal,
      totalAmount: finalTotal,
      paidAmount: saleStatus === 'final' ? finalTotal : 0,
      dueAmount: saleStatus === 'final' ? 0 : finalTotal,
      notes: isExpress ? 'Vente Express Point de Vente' : 'Vente POS standard',
      isExpress,
    };

    recordSale(saleRecord);
    setLastSaleInvoice({
      ...saleRecord,
      customerName:
        state.contacts.find((c) => c.id === selectedCustomerId)?.name ||
        'Client de Passage',
    });

    // Reset Cart
    setCart([]);
    setQtyDrafts({});
    setDiscountAmount(0);
    setShowReceiptModal(true);
  };

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) return;
    const newC: Omit<Contact, 'id' | 'currentBalance'> = {
      businessId: currentBusiness.id,
      type: 'customer',
      name: newCustName,
      companyName: newCustCompany,
      phone: newCustPhone || '+225 00000000',
      paymentTermsDays: 30,
    };
    addContact(newC);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCompany('');
    setShowAddCustomerModal(false);
  };

  const totalCartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-[calc(100dvh-57px)] md:h-[calc(100dvh-57px)] flex flex-col md:flex-row md:overflow-hidden bg-slate-950 text-white select-none">
      {/* Mobile Catalog / Cart Switcher */}
      <div className="md:hidden grid grid-cols-2 gap-1.5 p-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => setMobileView('catalog')}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            mobileView === 'catalog'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>Catalogue ({availableProducts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('cart')}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            mobileView === 'cart'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Panier ({totalCartItemsCount})
          </span>
        </button>
      </div>

      {/* Left Column: Product Selection Grid */}
      <div
        className={`${
          mobileView === 'catalog' ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col min-w-0 min-h-0 md:border-r border-slate-800`}
      >
        {/* Store & Stock Status Banner */}
        <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-950/80 border border-emerald-700/50 rounded-lg text-emerald-400">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-white text-xs">
                  {currentPosLocation?.name || 'Magasin'}
                </span>
                {businessLocations.length > 1 && (
                  <select
                    value={activeLocationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-0.5 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {businessLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {currentPosLocation?.address || 'Point de vente'}
              </p>
            </div>
          </div>

          {/* Stock Visibility Pill & Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setOnlyInStock(!onlyInStock)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition-all border ${
                onlyInStock
                  ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={
                onlyInStock
                  ? 'Seuls les articles avec du stock dans ce magasin sont affichés'
                  : 'Tous les articles sont affichés'
              }
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${onlyInStock ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>
                {onlyInStock
                  ? `En stock uniquement (${availableProducts.length})`
                  : `Tous les articles (${availableProducts.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Top Filter Bar */}
        <div className="p-2.5 sm:p-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-2 shrink-0">
          {/* Search Input & Barcode Scanner Simulator */}
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, SKU ou code-barres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[42px] sm:min-h-[36px] bg-slate-800 text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto sm:max-w-md scrollbar-none py-0.5">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubCategory('all');
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tous
            </button>
            {state.categories
              .filter((cat) => cat.businessId === currentBusiness.id)
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubCategory('all');
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
          </div>
        </div>

        {/* Sub-Category Pills if a Category is selected or subcategories exist */}
        {selectedCategory !== 'all' &&
          (state.subCategories || []).filter(
            (s) => s.categoryId === selectedCategory && (!s.businessId || s.businessId === currentBusiness.id)
          ).length > 0 && (
            <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto text-xs">
              <span className="text-[11px] text-slate-400 font-medium shrink-0">Sous-catégories :</span>
              <button
                onClick={() => setSelectedSubCategory('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedSubCategory === 'all'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Toutes
              </button>
              {(state.subCategories || [])
                .filter(
                  (s) =>
                    s.categoryId === selectedCategory &&
                    (!s.businessId || s.businessId === currentBusiness.id)
                )
                .map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubCategory(sub.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedSubCategory === sub.id
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
            </div>
          )}

        {/* Product Grid or Empty State */}
        {availableProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-200">
                Aucun article en stock dans {currentPosLocation?.name || 'ce magasin'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {onlyInStock
                  ? "Les articles ne sont visibles que s'ils disposent d'un stock disponible dans ce magasin. Vous pouvez basculer de magasin ou réapprovisionner l'inventaire."
                  : "Aucun article ne correspond à votre recherche ou catégorie sélectionnée."}
              </p>
            </div>
            {onlyInStock && (
              <button
                onClick={() => setOnlyInStock(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Afficher tous les articles du catalogue
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 p-2.5 sm:p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 content-start">
            {availableProducts.map((prd) => {
              const stockInLoc = getProductStockInStore(prd, activeLocationId);

              return (
                <div
                  key={prd.id}
                  onClick={() => handleProductCardClick(prd)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer transition-all sm:hover:scale-[1.02] shadow-sm group"
                >
                  <div>
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800 mb-2">
                      {prd.image ? (
                        <img
                          src={prd.image}
                          alt={prd.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                      )}
                      <span
                        className={`absolute top-1 right-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          stockInLoc <= prd.alertQuantity
                            ? 'bg-rose-900/90 text-rose-300 border border-rose-700'
                            : 'bg-slate-950/80 text-emerald-300'
                        }`}
                      >
                        Stock: {stockInLoc}
                      </span>
                      {prd.type === 'variable' && (
                        <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-800/80 flex items-center space-x-0.5">
                          <Layers className="w-2.5 h-2.5" />
                          <span>Variations</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                      {prd.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">SKU: {prd.sku}</p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs sm:text-sm text-emerald-400 tabular-nums truncate">
                      {prd.sellingPrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>
                    <span className="p-1.5 rounded-md bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Quick Go-to-Cart Bar */}
        {cart.length > 0 && (
          <div className="md:hidden p-2.5 bg-slate-900 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setMobileView('cart')}
              className="w-full min-h-[46px] px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-lg"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span>Voir le Panier ({totalCartItemsCount} art.)</span>
              </span>
              <span className="text-sm font-black tabular-nums">
                {finalTotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol} →
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Active Cart & Checkout Panel */}
      <div
        className={`${
          mobileView === 'cart' ? 'flex flex-1' : 'hidden md:flex'
        } w-full md:w-[320px] lg:w-[390px] xl:w-[420px] bg-slate-900 flex-col justify-between min-h-0 md:border-l border-slate-800`}
      >
        {/* Customer & Status Header */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Client & Vente
            </span>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Nouveau Client</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 bg-slate-800 text-white text-xs rounded-lg p-2 border border-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {state.contacts
                .filter((c) => c.businessId === currentBusiness.id && c.type !== 'supplier')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
            </select>

            {/* Sale Status Toggle (Draft / Final) */}
            <select
              value={saleStatus}
              onChange={(e) => setSaleStatus(e.target.value as SaleStatus)}
              className="bg-slate-800 text-amber-300 text-xs rounded-lg p-2 border border-slate-700 font-bold focus:outline-none"
            >
              <option value="final">Définitive</option>
              <option value="quotation">Devis</option>
              <option value="draft">Provisoire</option>
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <ShoppingCart className="w-12 h-12 mb-2 stroke-1 text-slate-600" />
              <p className="text-xs font-medium">Le panier est vide</p>
              <p className="text-[10px] text-slate-600 mt-1">
                Cliquez sur un produit à gauche pour l’ajouter
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs text-white truncate">{item.productName}</h5>
                    {editingItemIdx === idx ? (
                      <div className="flex items-center space-x-1 mt-1">
                        <input
                          type="number"
                          min="0"
                          autoFocus
                          value={editingItemPrice}
                          onChange={(e) => setEditingItemPrice(Number(e.target.value))}
                          className="w-24 bg-slate-950 border border-emerald-500 text-emerald-300 rounded px-1.5 py-1 text-xs font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemPrice(idx, editingItemPrice)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemIdx(null)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemIdx(idx);
                          setEditingItemPrice(item.unitPrice);
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-emerald-300 transition-colors mt-0.5 group/pedit"
                        title="Cliquer pour modifier le prix unitaire pour cette vente"
                      >
                        <span className="font-semibold tabular-nums">{item.unitPrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol} / unité</span>
                        <Edit2 className="w-2.5 h-2.5 opacity-60 group-hover/pedit:opacity-100 text-emerald-400" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg focus-within:border-emerald-500 transition-colors">
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, -1)}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-slate-800 text-slate-300 rounded-l-lg"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        aria-label={`Quantité pour ${item.productName}`}
                        value={
                          qtyDrafts[`${item.productId}-${item.variationId || 'base'}`] ??
                          String(item.quantity)
                        }
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const itemKey = `${item.productId}-${item.variationId || 'base'}`;
                          const val = e.target.value;
                          setQtyDrafts((prev) => ({ ...prev, [itemKey]: val }));
                          const parsed = Number(val);
                          if (val !== '' && !isNaN(parsed) && parsed > 0) {
                            setItemQuantity(idx, parsed);
                          }
                        }}
                        onBlur={() => {
                          const itemKey = `${item.productId}-${item.variationId || 'base'}`;
                          const raw = qtyDrafts[itemKey];
                          if (raw !== undefined) {
                            const parsed = Number(raw);
                            if (raw.trim() !== '' && !isNaN(parsed) && parsed > 0) {
                              setItemQuantity(idx, parsed);
                            } else {
                              setItemQuantity(idx, Math.max(1, item.quantity || 1));
                            }
                            setQtyDrafts((prev) => {
                              const next = { ...prev };
                              delete next[itemKey];
                              return next;
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-11 bg-transparent text-center text-xs font-extrabold text-white py-1 tabular-nums focus:outline-none focus:bg-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, 1)}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-slate-800 text-slate-300 rounded-r-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-extrabold text-xs text-emerald-400 min-w-[68px] text-right tabular-nums">
                      {item.subtotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFromCart(idx)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40"
                      aria-label="Retirer l'article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total & Payment Options Panel */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Payment Method Selector */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Mode de Règlement
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Espèces</span>
              </button>
              <button
                onClick={() => setPaymentMethod('mobile_money')}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  paymentMethod === 'mobile_money'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Wave / MM</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  paymentMethod === 'card'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Carte</span>
              </button>
            </div>
          </div>

          {/* Discount Input */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Remise exceptionnelle:</span>
            <input
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
              className="w-24 bg-slate-800 text-white text-right px-2 py-1 rounded border border-slate-700 text-xs font-bold"
            />
          </div>

          {/* Grand Total Display */}
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                Total à Payer ({cart.length} articles)
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {finalTotal.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
              </div>
            </div>

            {/* Express Checkout Button */}
            <button
              onClick={() => handleCheckout(true)}
              disabled={cart.length === 0}
              className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1 shadow-md disabled:opacity-50"
              title="Caisse Express Vente Comptant Rapide"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Express</span>
            </button>
          </div>

          {/* Main Checkout Button */}
          <button
            onClick={() => handleCheckout(false)}
            disabled={cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Valider & Imprimer Facture</span>
          </button>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Nouveau Client Rapide</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  Nom du Client *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs"
                  placeholder="ex: M. Bakayoko Sylla"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs"
                  placeholder="+225 07..."
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  Entreprise (Optionnel)
                </label>
                <input
                  type="text"
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2 text-xs"
                  placeholder="ex: Sylla & Co"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  Créer le Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastSaleInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 no-print">
              <h3 className="font-bold text-base text-slate-900">Reçu de Vente Généré</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer Ticket / Facture</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Layout */}
            <div id="printable-area" className="space-y-4 text-xs">
              <div className="text-center border-b pb-3">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  {currentBusiness.name}
                </h2>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  {currentLocation?.name} - {currentLocation?.address}
                </p>
                <p className="text-slate-500 text-[10px]">Tél: {currentLocation?.phone}</p>
                <div className="mt-2 font-mono text-[11px] font-extrabold text-blue-800">
                  FACTURE N°: {lastSaleInvoice.invoiceNo}
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-600 border-b pb-2">
                <div>
                  Client: <strong className="text-slate-900">{lastSaleInvoice.customerName}</strong>
                </div>
                <div>Date: {lastSaleInvoice.saleDate}</div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] uppercase font-bold text-slate-500">
                      <th className="py-1 pr-2">Article</th>
                      <th className="py-1 px-1 text-center">Qté</th>
                      <th className="py-1 px-1 text-right">P.U</th>
                      <th className="py-1 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[11px]">
                    {lastSaleInvoice.items.map((it: SaleItem, i: number) => (
                      <tr key={i}>
                        <td className="py-1 pr-2 font-semibold text-slate-800">{it.productName}</td>
                        <td className="py-1 px-1 text-center font-bold tabular-nums">{it.quantity}</td>
                        <td className="py-1 px-1 text-right tabular-nums">
                          {it.unitPrice.toLocaleString('fr-FR')}
                        </td>
                        <td className="py-1 pl-2 text-right font-extrabold tabular-nums">
                          {it.subtotal.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-2 space-y-1 text-right text-xs">
                <div className="flex justify-between font-bold">
                  <span>Total Net:</span>
                  <span className="text-base text-slate-900 font-black">
                    {lastSaleInvoice.totalAmount.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Mode de règlement: {lastSaleInvoice.paymentMethod.toUpperCase()} | Statut: {lastSaleInvoice.status.toUpperCase()}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 border-t pt-3 italic">
                {currentLocation?.invoiceLayout.footerText || 'Merci de votre visite !'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variable Product Variation Selector Modal */}
      {selectedVariableProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {selectedVariableProduct.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sélectionnez la déclinaison en stock ({currentPosLocation?.name || 'Ce magasin'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVariableProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(selectedVariableProduct.variations || [])
                .filter((v) => {
                  if (!onlyInStock) return true;
                  return (Number(v.locationStock?.[activeLocationId]) || 0) > 0;
                })
                .map((v) => {
                  const varStock = Number(v.locationStock?.[activeLocationId]) || 0;
                  return (
                    <div
                      key={v.id}
                      onClick={() => addToCart(selectedVariableProduct, v.id)}
                      className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                    >
                      <div>
                        <div className="font-bold text-xs text-white group-hover:text-emerald-300">
                          {v.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          SKU: {selectedVariableProduct.sku}{v.skuSuffix || ''}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-right">
                        <div>
                          <div className="font-extrabold text-xs text-emerald-400">
                            {v.sellingPrice.toLocaleString('fr-FR')} {currentBusiness.currencySymbol}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              varStock <= 0
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            Stock: {varStock}
                          </span>
                        </div>

                        <span className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}

              {(selectedVariableProduct.variations || []).filter((v) => {
                if (!onlyInStock) return true;
                return (Number(v.locationStock?.[activeLocationId]) || 0) > 0;
              }).length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  Aucune déclinaison n'a de stock disponible dans ce magasin.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVariableProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
