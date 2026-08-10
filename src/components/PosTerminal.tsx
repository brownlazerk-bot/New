import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, User, 
  UtensilsCrossed, Wine, DollarSign, CreditCard, Smartphone, 
  Building, CheckCircle2, AlertCircle, FileText, Send, X, Ticket, Bell
} from 'lucide-react';
import { 
  MenuItem, Table, Waiter, GuestRoom, Order, OrderItem, 
  Category, PaymentMethod, PaymentDetails, Shift, KitchenTicket,
  PaymentStatus, OrderStatus, AppUser, KitchenIngredient 
} from '../types';
import { formatCurrency } from '../lib/currency';
import { convertRecipeQtyToStoreQty, calculateEffectiveRecipeQty } from '../lib/unitConversion';
import { 
  printKotThermalTicket, 
  printPoolTokenTicket, 
  printSaunaTokenTicket, 
  printRoomTokenTicket 
} from '../lib/serviceTokenPrinter';

import { Language, getTranslation } from '../lib/translations';

interface PosTerminalProps {
  menuItems: MenuItem[];
  tables: Table[];
  waiters: Waiter[];
  guestRooms: GuestRoom[];
  ingredients?: KitchenIngredient[];
  currentShift?: Shift | null;
  onOrderCompleted: (order: Order, newKot?: KitchenTicket) => void;
  darkMode: boolean;
  currentUser?: AppUser;
  openShiftModal?: () => void;
  language?: Language;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  menuItems,
  tables,
  waiters,
  guestRooms,
  ingredients = [],
  currentShift,
  onOrderCompleted,
  darkMode,
  currentUser,
  openShiftModal,
  language = 'rw'
}) => {
  const t = getTranslation(language);
  // POS Order Header State
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>(waiters[0]?.id || '');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Auto-select waiter if logged in user is a waiter
  useEffect(() => {
    if (currentUser && waiters.length > 0) {
      const matched = waiters.find(
        w => w.id === currentUser.id || w.name.toLowerCase() === currentUser.fullName.toLowerCase()
      );
      if (matched) {
        setSelectedWaiterId(matched.id);
      }
    }
  }, [currentUser, waiters]);

  // Cart State
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [specialOrderNote, setSpecialOrderNote] = useState<string>('');

  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [checkoutMode, setCheckoutMode] = useState<'Full' | 'Partial' | 'Credit' | 'OpenOrder'>('Full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashPaidInput, setCashPaidInput] = useState<string>('');
  const [cardPaidInput, setCardPaidInput] = useState<string>('');
  const [momoPaidInput, setMomoPaidInput] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');

  // Insufficient Ingredients Modal State
  const [insufficientModalOpen, setInsufficientModalOpen] = useState(false);
  const [insufficientList, setInsufficientList] = useState<{
    ingredientName: string;
    requiredQuantity: string;
    availableQuantity: string;
    missingQuantity: string;
  }[]>([]);

  // Validate recipe stock availability
  const validateRecipeStock = (itemsToValidate: OrderItem[]) => {
    if (!ingredients || ingredients.length === 0) return [];

    const requiredStoreQtyMap: { [ingId: string]: { required: number; ing: KitchenIngredient } } = {};

    itemsToValidate.forEach(cartItem => {
      const menuItem = menuItems.find(m => m.id === cartItem.itemId);
      if (menuItem && menuItem.hasRecipe && menuItem.recipe && menuItem.recipe.length > 0) {
        menuItem.recipe.forEach(recItem => {
          if (recItem.active === false) return;
          const ing = ingredients.find(
            g => g.id === recItem.ingredientId || g.name.toLowerCase() === recItem.ingredientName.toLowerCase()
          );
          if (ing) {
            const effectiveRecipeQtyPerServ = calculateEffectiveRecipeQty(
              recItem.quantity,
              recItem.wastePercentage || 0,
              recItem.yieldPercentage || 100
            );
            const totalRecipeQty = effectiveRecipeQtyPerServ * cartItem.quantity;
            const storeQtyNeeded = convertRecipeQtyToStoreQty(
              totalRecipeQty,
              recItem.unit,
              ing.unit,
              ing.conversionRate
            );

            if (!requiredStoreQtyMap[ing.id]) {
              requiredStoreQtyMap[ing.id] = { required: 0, ing };
            }
            requiredStoreQtyMap[ing.id].required += storeQtyNeeded;
          }
        });
      }
    });

    const missing: {
      ingredientName: string;
      requiredQuantity: string;
      availableQuantity: string;
      missingQuantity: string;
    }[] = [];

    Object.values(requiredStoreQtyMap).forEach(({ required, ing }) => {
      if (required > ing.stockQuantity) {
        const missingQty = required - ing.stockQuantity;
        missing.push({
          ingredientName: ing.name,
          requiredQuantity: `${required.toFixed(2)} ${ing.unit}`,
          availableQuantity: `${ing.stockQuantity.toFixed(2)} ${ing.unit}`,
          missingQuantity: `${missingQty.toFixed(2)} ${ing.unit}`
        });
      }
    });

    return missing;
  };

  const categories: string[] = [
    'All', 'Beers', 'Soft Drinks', 'Wines', 'Whisky', 
    'Cocktails', 'Juices', 'Water', 'Coffee', 'Tea', 
    'Food', 'Pool Services', 'Sauna Services',
    'Room Services', 'Apartment Services', 'Other Services'
  ];

  // Filtered menu items
  const filteredItems = menuItems.filter(item => {
    if (item.active === false) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Cart Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Cart Actions
  const addToCart = (item: MenuItem) => {
    const isOutOfStock = item.status === 'Out of Stock' || (typeof item.stockQuantity === 'number' && item.stockQuantity <= 0);
    if (isOutOfStock) {
      alert(`Sorry, "${item.name}" is currently out of stock / unavailable and cannot be added to an order!`);
      return;
    }

    setCartItems(prev => {
      const existingIndex = prev.findIndex(i => i.itemId === item.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        if (typeof item.stockQuantity === 'number' && currentQty + 1 > item.stockQuantity) {
          alert(`Cannot add more "${item.name}". Maximum available stock is ${item.stockQuantity} ${item.unit || 'pcs'}.`);
          return prev;
        }
        const updated = [...prev];
        const newQty = currentQty + 1;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: newQty * updated[existingIndex].unitPrice
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            itemId: item.id,
            name: item.name,
            category: item.category,
            unitPrice: item.price,
            quantity: 1,
            totalPrice: item.price,
            isFood: item.isFood || item.category === 'Food',
            notes: ''
          }
        ];
      }
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const targetItem = menuItems.find(m => m.id === itemId);

    setCartItems(prev => {
      return prev.map(item => {
        if (item.itemId === itemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;

          if (delta > 0 && targetItem && typeof targetItem.stockQuantity === 'number') {
            if (newQty > targetItem.stockQuantity) {
              alert(`Cannot increase quantity. Maximum available stock for "${targetItem.name}" is ${targetItem.stockQuantity} ${targetItem.unit || 'pcs'}.`);
              return item;
            }
          }

          return {
            ...item,
            quantity: newQty,
            totalPrice: newQty * item.unitPrice
          };
        }
        return item;
      }).filter(Boolean) as OrderItem[];
    });
  };

  const updateItemNote = (itemId: string, notes: string) => {
    setCartItems(prev => prev.map(item => item.itemId === itemId ? { ...item, notes } : item));
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(i => i.itemId !== itemId));
  };

  const clearCart = () => {
    if (cartItems.length > 0 && confirm('Clear current order cart?')) {
      setCartItems([]);
      setDiscountAmount(0);
      setSpecialOrderNote('');
    }
  };

  // Submit Order as Waiter (Send directly to Cashier & Kitchen without immediate cash payment)
  const handleSendOrderToCashierAndKitchen = () => {
    if (cartItems.length === 0) {
      alert('Please add items to cart before submitting order.');
      return;
    }

    const missingIngs = validateRecipeStock(cartItems);
    if (missingIngs.length > 0) {
      setInsufficientList(missingIngs);
      setInsufficientModalOpen(true);
      return;
    }

    const activeWaiter = waiters.find(w => w.id === selectedWaiterId) || (currentUser ? { id: currentUser.id, name: currentUser.fullName } : null);
    const selectedTable = tables.find(t => t.id === selectedTableId);
    const selectedRoom = guestRooms.find(r => r.id === selectedRoomId);

    const servicesSet = new Set<string>();
    cartItems.forEach(item => {
      if (item.category === 'Food') servicesSet.add('Food');
      else if (item.category === 'Pool Services') servicesSet.add('Pool Services');
      else if (item.category === 'Sauna Services') servicesSet.add('Sauna Services');
      else if (item.category === 'Room Services') servicesSet.add('Room Services');
      else if (item.category === 'Apartment Services') servicesSet.add('Apartment Services');
      else servicesSet.add('Drinks');
    });

    const numId = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${numId}`;
    const nowIso = new Date().toISOString();
    const currentBusDate = currentShift?.businessDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const newOrder: Order = {
      id: orderId,
      orderNumber: `#ORD-${numId}`,
      tableId: selectedTable?.id,
      tableNumber: selectedTable?.tableNumber,
      waiterId: activeWaiter?.id || 'w-1',
      waiterName: activeWaiter?.name || (currentUser ? currentUser.fullName : 'Assigned Waiter'),
      customerName: customerName.trim() || selectedRoom?.guestName || 'Walk-In Guest',
      customerPhone: customerPhone.trim(),
      guestRoomId: selectedRoom?.id,
      servicesIncluded: Array.from(servicesSet),
      items: cartItems,
      subtotal,
      discount: discountAmount,
      total: grandTotal,
      amountPaid: 0,
      balance: grandTotal,
      paymentStatus: 'UNPAID',
      status: 'Pending',
      paymentMethod: 'Cash',
      paymentDetails: { method: 'Cash' },
      paymentHistory: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      shiftId: currentShift?.id || 'sh-default',
      businessDate: currentBusDate,
      cashierName: currentShift?.cashierName || currentUser?.fullName || 'Cashier Desk',
    };

    const foodItemsInCart = cartItems.filter(i => i.isFood || i.category === 'Food');
    let newKot: KitchenTicket | undefined = undefined;

    if (foodItemsInCart.length > 0) {
      const kotId = `KOT-${Math.floor(1000 + Math.random() * 9000)}`;
      newKot = {
        id: kotId,
        orderId: orderId,
        tableNumber: selectedTable?.tableNumber || selectedRoom?.number || 'Bar / Table',
        waiterName: newOrder.waiterName,
        customerName: newOrder.customerName,
        items: foodItemsInCart.map(f => ({
          itemId: f.itemId,
          name: f.name,
          quantity: f.quantity,
          notes: f.notes
        })),
        orderTime: nowIso,
        createdAt: nowIso,
        status: 'Pending',
        specialNotes: specialOrderNote,
        shiftId: currentShift?.id || 'sh-default',
        businessDate: currentBusDate
      };
      newOrder.kotGenerated = true;
      newOrder.kotId = kotId;
      
      // Auto-print 80mm ESC/POS KOT ticket for kitchen staff
      printKotThermalTicket(newKot, 'NEW ORDER');
    }

    // Auto-print Piscine Pool Pass Token
    const poolItemsInCart = cartItems.filter(i => i.category === 'Pool Services');
    if (poolItemsInCart.length > 0) {
      printPoolTokenTicket({
        orderId,
        tableNumber: selectedTable?.tableNumber || selectedRoom?.number || 'Poolside',
        waiterName: newOrder.waiterName,
        cashierName: newOrder.cashierName,
        customerName: newOrder.customerName,
        items: poolItemsInCart.map(p => ({
          itemId: p.itemId,
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
          notes: p.notes
        }))
      });
    }

    // Auto-print Sauna Pass Token
    const saunaItemsInCart = cartItems.filter(i => i.category === 'Sauna Services');
    if (saunaItemsInCart.length > 0) {
      printSaunaTokenTicket({
        orderId,
        tableNumber: selectedTable?.tableNumber || selectedRoom?.number || 'Sauna Desk',
        waiterName: newOrder.waiterName,
        cashierName: newOrder.cashierName,
        customerName: newOrder.customerName,
        items: saunaItemsInCart.map(s => ({
          itemId: s.itemId,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          totalPrice: s.totalPrice,
          notes: s.notes
        }))
      });
    }

    // Auto-print Room Service Voucher Token
    const roomItemsInCart = cartItems.filter(i => i.category === 'Room Services' || i.category === 'Apartment Services');
    if (roomItemsInCart.length > 0) {
      printRoomTokenTicket({
        orderId,
        roomNumber: selectedRoom?.number || selectedTable?.tableNumber || 'Reception',
        waiterName: newOrder.waiterName,
        cashierName: newOrder.cashierName,
        customerName: newOrder.customerName,
        items: roomItemsInCart.map(r => ({
          itemId: r.itemId,
          name: r.name,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          totalPrice: r.totalPrice,
          notes: r.notes
        }))
      });
    }

    onOrderCompleted(newOrder, newKot);

    // Reset POS cart
    setCartItems([]);
    setDiscountAmount(0);
    setSpecialOrderNote('');
    setCustomerName('');
    setSelectedTableId('');

    alert(`✅ Order ${newOrder.orderNumber} successfully sent to Cashier & Kitchen!\nAssigned Waiter: ${newOrder.waiterName}\nTable: ${newOrder.tableNumber || 'Direct Bar/Counter'}`);
  };

  // Open Checkout Modal
  const handleProceedToPayment = () => {
    if (cartItems.length === 0) {
      alert('Please add items to cart before checkout.');
      return;
    }

    const missingIngs = validateRecipeStock(cartItems);
    if (missingIngs.length > 0) {
      setInsufficientList(missingIngs);
      setInsufficientModalOpen(true);
      return;
    }

    setPaymentMethod('Cash');
    setCashPaidInput(grandTotal.toFixed(2));
    setCardPaidInput('');
    setMomoPaidInput('');
    setSelectedRoomId('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  // Process Final Payment & Place Order
  const handleFinalCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    const activeWaiter = waiters.find(w => w.id === selectedWaiterId);
    const selectedTable = tables.find(t => t.id === selectedTableId);
    const selectedRoom = guestRooms.find(r => r.id === selectedRoomId);

    // Compute services included
    const servicesSet = new Set<string>();
    cartItems.forEach(item => {
      if (item.category === 'Food') servicesSet.add('Food');
      else if (item.category === 'Pool Services') servicesSet.add('Pool Services');
      else if (item.category === 'Sauna Services') servicesSet.add('Sauna Services');
      else if (item.category === 'Room Services') servicesSet.add('Room Services');
      else if (item.category === 'Apartment Services') servicesSet.add('Apartment Services');
      else servicesSet.add('Drinks');
    });
    if (paymentMethod === 'Room Charge') servicesSet.add('Room Services');
    if (paymentMethod === 'Apartment Charge') servicesSet.add('Apartment Services');

    const servicesIncluded = Array.from(servicesSet);

    let paymentDetails: PaymentDetails = { method: paymentMethod };
    let amountPaid = 0;
    let balance = grandTotal;
    let paymentStatus: PaymentStatus = 'UNPAID';
    let orderStatus: OrderStatus = 'Waiting for Payment';

    if (checkoutMode === 'Credit') {
      if (!customerName.trim()) {
        setPaymentError('Customer name is required for Credit / Debt orders.');
        return;
      }
      if (!customerPhone.trim()) {
        setPaymentError('Customer phone number is required for Credit / Debt orders.');
        return;
      }
      paymentStatus = 'CREDIT';
      orderStatus = 'Credit';
      paymentDetails.guestName = customerName.trim();
      paymentDetails.guestPhone = customerPhone.trim();
    } else if (checkoutMode === 'OpenOrder') {
      paymentStatus = 'UNPAID';
      orderStatus = 'Pending';
    } else {
      // Full or Partial Payment
      if (paymentMethod === 'Cash') {
        const cashVal = parseFloat(cashPaidInput) || 0;
        if (checkoutMode === 'Full' && cashVal < grandTotal) {
          setPaymentError(`Cash tendered ($${cashVal.toFixed(2)}) is less than total amount ($${grandTotal.toFixed(2)})`);
          return;
        }
        amountPaid = Math.min(cashVal, grandTotal);
        balance = Math.max(0, grandTotal - amountPaid);
        paymentDetails.cashPaid = cashVal;
        paymentDetails.changeGiven = cashVal > grandTotal ? cashVal - grandTotal : 0;
      } else if (paymentMethod === 'Card') {
        const val = parseFloat(cardPaidInput) || grandTotal;
        amountPaid = val;
        balance = Math.max(0, grandTotal - amountPaid);
        paymentDetails.cardPaid = amountPaid;
      } else if (paymentMethod === 'Mobile Money') {
        const val = parseFloat(momoPaidInput) || grandTotal;
        amountPaid = val;
        balance = Math.max(0, grandTotal - amountPaid);
        paymentDetails.mobileMoneyPaid = amountPaid;
      } else if (paymentMethod === 'Room Charge' || paymentMethod === 'Apartment Charge') {
        if (!selectedRoom) {
          setPaymentError('Please select a valid Guest Room or Apartment to charge.');
          return;
        }
        amountPaid = grandTotal;
        balance = 0;
        paymentDetails.selectedRoomId = selectedRoom.id;
        paymentDetails.roomOrAptNumber = selectedRoom.number;
        paymentDetails.guestName = selectedRoom.guestName;
        paymentDetails.roomChargeAmount = grandTotal;
      } else if (paymentMethod === 'Mixed') {
        const cashVal = parseFloat(cashPaidInput) || 0;
        const cardVal = parseFloat(cardPaidInput) || 0;
        const momoVal = parseFloat(momoPaidInput) || 0;
        const totalPaid = cashVal + cardVal + momoVal;

        if (checkoutMode === 'Full' && totalPaid < grandTotal) {
          setPaymentError(`Total mixed payment ($${totalPaid.toFixed(2)}) is less than total ($${grandTotal.toFixed(2)})`);
          return;
        }
        amountPaid = Math.min(totalPaid, grandTotal);
        balance = Math.max(0, grandTotal - amountPaid);
        paymentDetails.cashPaid = cashVal;
        paymentDetails.cardPaid = cardVal;
        paymentDetails.mobileMoneyPaid = momoVal;
        paymentDetails.changeGiven = totalPaid > grandTotal ? totalPaid - grandTotal : 0;
      }

      if (balance <= 0.01) {
        paymentStatus = 'PAID';
        orderStatus = 'Paid';
      } else if (amountPaid > 0) {
        paymentStatus = 'PARTIALLY PAID';
        orderStatus = 'Partially Paid';
      } else {
        paymentStatus = 'UNPAID';
        orderStatus = 'Waiting for Payment';
      }
    }

    const numId = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${numId}`;
    const nowIso = new Date().toISOString();

    // Build Order Object
    const newOrder: Order = {
      id: orderId,
      orderNumber: `#ORD-${numId}`,
      tableId: selectedTable?.id,
      tableNumber: selectedTable?.tableNumber,
      waiterId: activeWaiter?.id || 'w-1',
      waiterName: activeWaiter?.name || 'Cashier Direct',
      customerName: customerName.trim() || selectedRoom?.guestName || 'Walk-In Guest',
      customerPhone: customerPhone.trim(),
      guestRoomId: selectedRoom?.id,
      servicesIncluded,
      items: cartItems,
      subtotal,
      discount: discountAmount,
      total: grandTotal,
      amountPaid,
      balance,
      paymentStatus,
      status: orderStatus,
      paymentMethod,
      paymentDetails,
      paymentHistory: amountPaid > 0 ? [
        {
          id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: nowIso,
          amount: amountPaid,
          method: paymentMethod,
          cashierName: currentShift?.cashierName || currentUser?.fullName || 'Cashier',
          note: 'Initial checkout payment'
        }
      ] : [],
      createdAt: nowIso,
      updatedAt: nowIso,
      paidAt: paymentStatus === 'PAID' ? nowIso : undefined,
      shiftId: currentShift?.id || 'sh-default',
      businessDate: currentShift?.businessDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      cashierName: currentShift?.cashierName || currentUser?.fullName || 'Cashier',
    };

    // Check if food items exist for Bon de Commande (Kitchen Order Ticket)
    const foodItemsInCart = cartItems.filter(i => i.isFood || i.category === 'Food');
    let newKot: KitchenTicket | undefined = undefined;

    if (foodItemsInCart.length > 0) {
      const kotId = `KOT-${Math.floor(1000 + Math.random() * 9000)}`;
      newKot = {
        id: kotId,
        orderId: orderId,
        tableNumber: selectedTable?.tableNumber || selectedRoom?.number || 'Bar POS Counter',
        waiterName: activeWaiter?.name || 'Cashier Direct',
        customerName: newOrder.customerName,
        items: foodItemsInCart.map(f => ({
          itemId: f.itemId,
          name: f.name,
          quantity: f.quantity,
          notes: f.notes
        })),
        orderTime: new Date().toISOString(),
        status: 'Pending',
        specialNotes: specialOrderNote
      };

      newOrder.kotGenerated = true;
      newOrder.kotId = kotId;

      // Auto-print 80mm ESC/POS KOT ticket for kitchen staff
      printKotThermalTicket(newKot, 'NEW ORDER');
    }

    // Auto-print Piscine Pool Pass Token
    const poolItemsInCart = cartItems.filter(i => i.category === 'Pool Services');
    if (poolItemsInCart.length > 0) {
      printPoolTokenTicket({
        orderId,
        tableNumber: selectedTable?.tableNumber || selectedRoom?.number || 'Poolside',
        waiterName: activeWaiter?.name || 'Cashier Direct',
        cashierName: newOrder.cashierName,
        customerName: newOrder.customerName,
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        items: poolItemsInCart.map(p => ({
          itemId: p.itemId,
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
          notes: p.notes
        }))
      });
    }

    // Auto-print Sauna Pass Token
    const saunaItemsInCart = cartItems.filter(i => i.category === 'Sauna Services');
    if (saunaItemsInCart.length > 0) {
      printSaunaTokenTicket({
        orderId,
        tableNumber: selectedTable?.tableNumber || selectedRoom?.number || 'Sauna Desk',
        waiterName: activeWaiter?.name || 'Cashier Direct',
        cashierName: newOrder.cashierName,
        customerName: newOrder.customerName,
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        items: saunaItemsInCart.map(s => ({
          itemId: s.itemId,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          totalPrice: s.totalPrice,
          notes: s.notes
        }))
      });
    }

    // Auto-print Room Service Voucher Token
    const roomItemsInCart = cartItems.filter(i => i.category === 'Room Services' || i.category === 'Apartment Services');
    if (roomItemsInCart.length > 0) {
      printRoomTokenTicket({
        orderId,
        roomNumber: selectedRoom?.number || selectedTable?.tableNumber || 'Reception',
        waiterName: activeWaiter?.name || 'Cashier Direct',
        cashierName: newOrder.cashierName,
        customerName: newOrder.customerName,
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        items: roomItemsInCart.map(r => ({
          itemId: r.itemId,
          name: r.name,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          totalPrice: r.totalPrice,
          notes: r.notes
        }))
      });
    }

    // Trigger parent state update & receipt modal
    onOrderCompleted(newOrder, newKot);

    // Reset POS cart
    setCartItems([]);
    setDiscountAmount(0);
    setSpecialOrderNote('');
    setCustomerName('');
    setSelectedTableId('');
    setShowPaymentModal(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto">
      
      {/* Left 7 Columns: Menu Catalog & Category Grid */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        
        {/* Header Controls: Table & Waiter Selection */}
        <div className={`p-4 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            
            {/* Table selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Table / Deck
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Direct Bar Sale --</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tableNumber} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Waiter selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Assigned Waiter
              </label>
              <select
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              >
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Guest Name or Walk-In"
                className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Customer phone */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Customer Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+237 6..."
                className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

          </div>
        </div>

        {/* Search & Category Tabs */}
        <div className="space-y-3">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drinks, food, pool or sauna pass..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs border font-medium transition-colors ${
                darkMode 
                  ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories Pill Scroll */}
          <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto pr-1">
          {filteredItems.map((item) => {
            const isOutOfStock = item.status === 'Out of Stock' || (typeof item.stockQuantity === 'number' && item.stockQuantity <= 0);
            return (
              <div
                key={item.id}
                onClick={() => !isOutOfStock && addToCart(item)}
                className={`group relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isOutOfStock
                    ? 'opacity-50 grayscale bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-800 cursor-not-allowed'
                    : darkMode
                      ? 'bg-gray-900 border-gray-800 hover:border-amber-500/50 hover:bg-gray-850'
                      : 'bg-white border-gray-200 hover:border-amber-400 hover:shadow-md'
                }`}
              >
                {/* Item Thumbnail */}
                {item.image && (
                  <div className="w-full h-24 rounded-xl overflow-hidden mb-2 bg-gray-100 dark:bg-gray-800">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {item.category}
                    </span>
                    {item.isFood && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        Kitchen
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 mt-0.5">
                    {item.name}
                  </h4>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-black text-sm text-gray-900 dark:text-white">
                    ${item.price.toFixed(2)}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                    isOutOfStock
                      ? 'bg-rose-500 text-white'
                      : item.stockQuantity <= 5
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50'
                        : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {isOutOfStock ? 'Out' : `${item.stockQuantity} ${item.unit}s`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Right 5 Columns: Active Order Terminal Cart & Checkout */}
      <div className="lg:col-span-5 flex flex-col h-full">
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          
          {/* Cart Header */}
          <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Current Order Cart
              </h3>
            </div>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="my-4 space-y-3 max-h-[360px] overflow-y-auto pr-1 flex-1">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <ShoppingCart className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-xs font-medium">Cart is empty. Tap menu items to add.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div 
                  key={item.itemId}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-xs text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-gray-500">${item.unitPrice.toFixed(2)} / {item.category}</p>
                    </div>
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Item note field */}
                  <input
                    type="text"
                    placeholder="Special note (e.g. No ice, extra spicy)"
                    value={item.notes || ''}
                    onChange={(e) => updateItemNote(item.itemId, e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg text-[10px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                  />

                  {/* Quantity +/- Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.itemId, -1)}
                        className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs px-2">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.itemId, 1)}
                        className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.itemId)}
                      className="text-gray-400 hover:text-rose-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Order Summary Calculations */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
            
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount input */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Discount (RWF)</span>
              <input
                type="number"
                min="0"
                step="100"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-24 px-2 py-1 text-right rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold"
              />
            </div>

            {/* Total */}
            <div className="flex justify-between items-center text-base font-black text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-800">
              <span>Grand Total</span>
              <span className="text-amber-600 dark:text-amber-400">{formatCurrency(grandTotal)}</span>
            </div>

            {/* Food Bon de Commande Indicator */}
            {cartItems.some(i => i.isFood || i.category === 'Food') && (
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] flex items-center space-x-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Kitchen Ticket (Bon de Commande) will be sent to Kitchen.</span>
              </div>
            )}

            {/* Checkout Action Buttons */}
            <div className="space-y-2 mt-2">
              <button
                disabled={cartItems.length === 0}
                onClick={handleSendOrderToCashierAndKitchen}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send Order to Cashier & Kitchen ({formatCurrency(grandTotal)})</span>
              </button>

              <button
                disabled={cartItems.length === 0}
                onClick={handleProceedToPayment}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                <DollarSign className="w-4 h-4" />
                <span>Pay Now & Close Order ({formatCurrency(grandTotal)})</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`relative max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 mb-4">
              <div>
                <h3 className="font-bold text-lg">Checkout Order</h3>
                <p className="text-xs text-gray-500">Order Total: <span className="font-black text-amber-500">${grandTotal.toFixed(2)}</span></p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Checkout Mode Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode('Full');
                  setCashPaidInput(grandTotal.toFixed(2));
                }}
                className={`py-2 rounded-lg text-center transition-all ${
                  checkoutMode === 'Full' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Full Pay
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode('Partial');
                  setCashPaidInput((grandTotal / 2).toFixed(2));
                }}
                className={`py-2 rounded-lg text-center transition-all ${
                  checkoutMode === 'Partial' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Partial Pay
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode('Credit');
                  setPaymentMethod('Credit');
                }}
                className={`py-2 rounded-lg text-center transition-all ${
                  checkoutMode === 'Credit' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Credit Debt
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutMode('OpenOrder');
                }}
                className={`py-2 rounded-lg text-center transition-all ${
                  checkoutMode === 'OpenOrder' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Open Order
              </button>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {[
                { id: 'Cash' as PaymentMethod, label: 'Cash', icon: DollarSign },
                { id: 'Card' as PaymentMethod, label: 'Card', icon: CreditCard },
                { id: 'Mobile Money' as PaymentMethod, label: 'MoMo', icon: Smartphone },
                { id: 'Room Charge' as PaymentMethod, label: 'Room Charge', icon: Building },
                { id: 'Apartment Charge' as PaymentMethod, label: 'Apartment', icon: Building },
                { id: 'Mixed' as PaymentMethod, label: 'Mixed', icon: Ticket },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleFinalCheckout} className="space-y-4">
              
              {/* Cash Input & Denomination Shortcuts */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Cash Tendered ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashPaidInput}
                      onChange={(e) => setCashPaidInput(e.target.value)}
                      placeholder="Enter amount given"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-lg font-mono font-bold"
                    />
                  </div>

                  {/* Cash Shortcuts */}
                  <div className="flex space-x-2">
                    {[
                      { lbl: 'Exact', val: grandTotal },
                      { lbl: '$10', val: 10 },
                      { lbl: '$20', val: 20 },
                      { lbl: '$50', val: 50 },
                      { lbl: '$100', val: 100 },
                    ].map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashPaidInput(s.val.toFixed(2))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                      >
                        {s.lbl}
                      </button>
                    ))}
                  </div>

                  {/* Change output */}
                  {parseFloat(cashPaidInput) >= grandTotal && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <span>Change Due:</span>
                      <span className="text-base font-black">${(parseFloat(cashPaidInput) - grandTotal).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Room / Apartment Guest Selection */}
              {(paymentMethod === 'Room Charge' || paymentMethod === 'Apartment Charge') && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold">Select Guest Room / Apartment</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Choose Guest Room --</option>
                    {guestRooms
                      .filter(r => paymentMethod === 'Room Charge' ? r.type === 'Room' : r.type === 'Apartment')
                      .map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.number} - {room.guestName} (Curr Bal: ${room.balance.toFixed(2)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Mixed Payment Details */}
              {paymentMethod === 'Mixed' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold">Cash Portion ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashPaidInput}
                      onChange={(e) => setCashPaidInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Card Portion ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cardPaidInput}
                      onChange={(e) => setCardPaidInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">Mobile Money Portion ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={momoPaidInput}
                      onChange={(e) => setMomoPaidInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete & Print</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Insufficient Raw Ingredients Validation Modal */}
      {insufficientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-500 border border-rose-500/40">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Insufficient Raw Ingredient Stock</h3>
                <p className="text-xs text-rose-400">Order blocked due to missing recipe raw materials</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                The requested dishes require ingredients that exceed current kitchen inventory balances:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {insufficientList.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <p className="font-bold text-amber-400">{item.ingredientName}</p>
                    <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
                      <div>
                        <span className="text-slate-500 block">Required:</span>
                        <span className="font-mono font-bold text-white">{item.requiredQuantity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Available:</span>
                        <span className="font-mono font-bold text-emerald-400">{item.availableQuantity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Missing:</span>
                        <span className="font-mono font-bold text-rose-500">{item.missingQuantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInsufficientModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Close & Modify Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
