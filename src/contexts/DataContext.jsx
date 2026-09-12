import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { STORAGE_KEY, uid } from '../utils/helpers';
import { DEFAULT_DATA } from '../data/initialData';
import { DEFAULT_REGISTERS, DEFAULT_FISCAL, nextTicketNumber, stockFieldForLocation, lineNetUnit, lineTotal, lineDiscountAmount, expectedCash } from '../utils/caja';
import * as productService from '../services/productService';
import * as saleService from '../services/saleService';
import * as userService from '../services/userService';
import * as cajaService from '../services/cajaService';
import * as fiscalService from '../services/fiscalService';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

function seedProducts(list) {
  return (list || []).map((p) => ({
    ...p,
    stockLocal1: p.stockLocal1 ?? p.quantity ?? 0,
    stockLocal2: p.stockLocal2 ?? 0,
    stockDeposito: p.stockDeposito ?? 0,
  }));
}

export function DataProvider({ children }) {
  const { currentUser, forceOffline } = useAuth();
  const online = isSupabaseConfigured() && !forceOffline;

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [cashRegisters, setCashRegisters] = useState(DEFAULT_REGISTERS);
  const [cashSessions, setCashSessions] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [fiscalSettings, setFiscalSettings] = useState(DEFAULT_FISCAL);
  const [cajaSynced, setCajaSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (online) {
          const [prods, usrs] = await Promise.all([
            productService.getProducts(),
            userService.getUsers(),
          ]);
          setProducts(prods);
          setUsers(usrs);
          setSales([]);

          try {
            const [regs, sessions, moves, tix, fiscal] = await Promise.all([
              cajaService.getRegisters(),
              cajaService.getSessions(),
              cajaService.getMovements(),
              cajaService.getTickets(),
              fiscalService.getFiscalSettings(),
            ]);
            if (regs && regs.length) setCashRegisters(regs);
            else setCashRegisters(DEFAULT_REGISTERS);
            setCashSessions(sessions || []);
            setCashMovements(moves || []);
            setTickets(tix || []);
            if (fiscal) setFiscalSettings(fiscal);
            setCajaSynced(true);
          } catch (cajaErr) {
            if (cajaService.isMissingCajaSchema(cajaErr)) {
              setCajaSynced(false);
              hydrateCajaFromStorage();
            } else {
              console.error('Error loading caja:', cajaErr);
              hydrateCajaFromStorage();
              setCajaSynced(false);
            }
          }
        } else {
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
                setProducts(seedProducts(parsed.products || []));
                setSales(parsed.sales || []);
                setUsers(parsed.users || []);
                setCashRegisters(parsed.cashRegisters?.length ? parsed.cashRegisters : DEFAULT_REGISTERS);
                setCashSessions(parsed.cashSessions || []);
                setCashMovements(parsed.cashMovements || []);
                setTickets(parsed.tickets || []);
                setFiscalSettings(parsed.fiscalSettings || DEFAULT_FISCAL);
                setCajaSynced(false);
                setLoading(false);
                return;
              }
            }
          } catch { /* ignore */ }
          setProducts(seedProducts(DEFAULT_DATA.products));
          setSales(DEFAULT_DATA.sales);
          setUsers(DEFAULT_DATA.users);
          setCashRegisters(DEFAULT_REGISTERS);
          setCashSessions([]);
          setCashMovements([]);
          setTickets([]);
          setFiscalSettings(DEFAULT_FISCAL);
          setCajaSynced(false);
        }
      } catch (e) {
        console.error('Error loading data:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, online]);

  const hydrateCajaFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setCashRegisters(DEFAULT_REGISTERS);
        return;
      }
      const parsed = JSON.parse(saved);
      setCashRegisters(parsed.cashRegisters?.length ? parsed.cashRegisters : DEFAULT_REGISTERS);
      setCashSessions(parsed.cashSessions || []);
      setCashMovements(parsed.cashMovements || []);
      setTickets(parsed.tickets || []);
      setFiscalSettings(parsed.fiscalSettings || DEFAULT_FISCAL);
    } catch {
      setCashRegisters(DEFAULT_REGISTERS);
    }
  };

  useEffect(() => {
    if (!currentUser || loading) return;
    if (online && cajaSynced) return;
    try {
      const prev = (() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
      })();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...prev,
        products: online ? prev.products : products,
        sales: online ? prev.sales : sales,
        users: online ? prev.users : users,
        cashRegisters,
        cashSessions,
        cashMovements,
        tickets,
        fiscalSettings,
      }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [products, sales, users, cashRegisters, cashSessions, cashMovements, tickets, fiscalSettings, online, currentUser, loading, cajaSynced]);

  const refreshProducts = useCallback(async () => {
    if (!online) return;
    try {
      const prods = await productService.getProducts();
      setProducts(prods);
    } catch (e) {
      console.error('Error refreshing products:', e);
    }
  }, [online]);

  const refreshCaja = useCallback(async () => {
    if (!online || !cajaSynced) return;
    try {
      const [regs, sessions, moves, tix, fiscal] = await Promise.all([
        cajaService.getRegisters(),
        cajaService.getSessions(),
        cajaService.getMovements(),
        cajaService.getTickets(),
        fiscalService.getFiscalSettings(),
      ]);
      if (regs && regs.length) setCashRegisters(regs);
      setCashSessions(sessions || []);
      setCashMovements(moves || []);
      setTickets(tix || []);
      if (fiscal) setFiscalSettings(fiscal);
    } catch (e) {
      console.error('Error refreshing caja:', e);
    }
  }, [online, cajaSynced]);

  const handleSell = useCallback(async (productId, qty, user, location = 'local1', paymentMethod = 'efectivo', paymentDetail = '') => {
    if (online) {
      const result = await saleService.registerSale(productId, qty, location, paymentMethod, paymentDetail);
      await refreshProducts();
      return result;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Producto no encontrado');

    const stockField = stockFieldForLocation(location);
    if ((Number(product[stockField]) || 0) < qty) {
      throw new Error(`Stock insuficiente. Disponible: ${product[stockField] || 0}`);
    }

    setProducts((prev) => prev.map((p) =>
      p.id === productId
        ? { ...p, [stockField]: Math.max(0, (Number(p[stockField]) || 0) - qty), quantity: Math.max(0, (Number(p.quantity) || 0) - qty) }
        : p
    ));

    const newSale = {
      id: uid(),
      productId: product.id,
      productName: product.name,
      qty: Number(qty),
      unitPrice: Number(product.publicPrice) || 0,
      costPrice: Number(product.costPrice) || 0,
      paymentMethod,
      paymentDetail,
      userId: user.id,
      userName: user.name,
      date: new Date().toISOString(),
    };
    setSales((prev) => [newSale, ...prev]);
    return newSale;
  }, [online, products, refreshProducts]);

  const handleRestock = useCallback(async (productId, addedQty, location = 'deposito') => {
    if (online) {
      await saleService.restockProduct(productId, addedQty, location);
      await refreshProducts();
      return;
    }
    setProducts((prev) => prev.map((p) => {
      if (p.id !== productId) return p;
      const locField = stockFieldForLocation(location);
      return {
        ...p,
        [locField]: (Number(p[locField]) || 0) + Number(addedQty),
        quantity: (Number(p.quantity) || 0) + Number(addedQty),
        lastRestock: new Date().toISOString(),
      };
    }));
  }, [online, refreshProducts]);

  const handleUndoSale = useCallback(async (saleId, productId, qty, location = 'local1') => {
    if (online) {
      await saleService.deleteSaleRecord(saleId);
      await saleService.restockProduct(productId, qty, location);
      await refreshProducts();
      return;
    }
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    setProducts((prev) => prev.map((p) => {
      if (p.id !== productId) return p;
      const locField = stockFieldForLocation(location);
      return {
        ...p,
        [locField]: (Number(p[locField]) || 0) + Number(qty),
        quantity: (Number(p.quantity) || 0) + Number(qty),
      };
    }));
  }, [online, refreshProducts]);

  const handleUpdatePaymentMethod = useCallback(async (saleIds, paymentMethod) => {
    if (online) {
      await saleService.updateSalesPaymentMethod(saleIds, paymentMethod);
      return;
    }
    setSales((prev) => prev.map((s) => saleIds.includes(s.id) ? { ...s, paymentMethod } : s));
  }, [online]);

  const deductLocalStock = (productId, qty, location) => {
    const field = stockFieldForLocation(location);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== productId) return p;
      return {
        ...p,
        [field]: Math.max(0, (Number(p[field]) || 0) - qty),
        quantity: Math.max(0, (Number(p.quantity) || 0) - qty),
      };
    }));
  };

  const handleRegisterTicket = useCallback(async ({
    lines,
    paymentMethod,
    paymentDetail,
    registerId,
    sessionId,
    cashReceived,
    changeGiven,
    invoiceType,
    customerName,
    customerDocType,
    customerDoc,
    fiscal,
    user,
    location,
  }) => {
    if (!lines?.length) throw new Error('El ticket está vacío.');

    const ticketNumber = nextTicketNumber(tickets);
    const items = lines.map((l) => ({
      product_id: l.productId,
      qty: Number(l.qty),
      unit_price: lineNetUnit(l),
      discount_amount: lineDiscountAmount(l),
    }));

    const ticketBase = {
      id: uid(),
      ticketNumber,
      registerId,
      sessionId,
      userId: user.id,
      userName: user.name,
      paymentMethod,
      paymentDetail: paymentDetail || "",
      subtotal: lines.reduce((a, l) => a + (Number(l.listPrice) || 0) * (Number(l.qty) || 0), 0),
      discountTotal: lines.reduce((a, l) => a + lineDiscountAmount(l), 0),
      total: lines.reduce((a, l) => a + lineTotal(l), 0),
      cashReceived: Number(cashReceived) || 0,
      changeGiven: Number(changeGiven) || 0,
      invoiceType: invoiceType || "ticket",
      customerName: customerName || "",
      customerDocType: customerDocType || "",
      customerDoc: customerDoc || "",
      cae: fiscal?.cae || "",
      caeVto: fiscal?.caeVto || "",
      invoiceNumber: fiscal?.invoiceNumber || "",
      fiscalStatus: fiscal?.fiscalStatus || "none",
      createdAt: new Date().toISOString(),
      lines: lines.map((l) => ({
        productId: l.productId,
        productName: l.product.name,
        barcode: l.product.barcode || "",
        qty: l.qty,
        listPrice: l.listPrice,
        unitPrice: lineNetUnit(l),
        discount: lineDiscountAmount(l),
        lineTotal: lineTotal(l),
      })),
    };

    if (online && cajaSynced) {
      const result = await cajaService.registerTicketRpc({
        items,
        paymentMethod,
        paymentDetail,
        registerId,
        sessionId,
        cashReceived: ticketBase.cashReceived,
        changeGiven: ticketBase.changeGiven,
        invoiceType: ticketBase.invoiceType,
        customerName: ticketBase.customerName,
        customerDocType: ticketBase.customerDocType,
        customerDoc: ticketBase.customerDoc,
        ticketNumber,
        subtotal: ticketBase.subtotal,
        discountTotal: ticketBase.discountTotal,
        total: ticketBase.total,
        fiscalStatus: ticketBase.fiscalStatus,
        cae: ticketBase.cae,
        caeVto: ticketBase.caeVto,
        invoiceNumber: ticketBase.invoiceNumber,
      });
      await refreshProducts();
      await refreshCaja();
      return { ...ticketBase, id: result?.ticket_id || ticketBase.id, ticketNumber: result?.ticket_number || ticketNumber };
    }

    if (online && !cajaSynced) {
      for (const line of lines) {
        await saleService.registerSale(line.productId, Number(line.qty), location, paymentMethod, paymentDetail || "");
      }
      await refreshProducts();
    } else {
      for (const line of lines) {
        const product = products.find((p) => p.id === line.productId);
        if (!product) throw new Error(`Producto no encontrado: ${line.product?.name || line.productId}`);
        const field = stockFieldForLocation(location);
        if ((Number(product[field]) || 0) < Number(line.qty)) {
          throw new Error(`Stock insuficiente de ${product.name}. Disponible: ${product[field] || 0}`);
        }
      }
      for (const line of lines) {
        deductLocalStock(line.productId, Number(line.qty), location);
        const product = products.find((p) => p.id === line.productId);
        setSales((prev) => [{
          id: uid(),
          productId: line.productId,
          productName: product?.name || line.product.name,
          qty: Number(line.qty),
          unitPrice: lineNetUnit(line),
          costPrice: Number(product?.costPrice) || 0,
          paymentMethod,
          paymentDetail: paymentDetail || "",
          userId: user.id,
          userName: user.name,
          date: ticketBase.createdAt,
          ticketId: ticketBase.id,
        }, ...prev]);
      }
    }

    setTickets((prev) => [ticketBase, ...prev]);
    if (paymentMethod === "efectivo" && sessionId) {
      setCashMovements((prev) => [{
        id: uid(),
        sessionId,
        type: "cash_sale",
        amount: ticketBase.total,
        note: `Venta ${ticketNumber}`,
        createdAt: ticketBase.createdAt,
      }, ...prev]);
    }
    return ticketBase;
  }, [online, cajaSynced, tickets, products, refreshProducts, refreshCaja]);

  const handleOpenSession = useCallback(async ({ registerId, openingFloat, user }) => {
    const already = cashSessions.find((s) => s.registerId === registerId && s.status === "open");
    if (already) throw new Error("Esa caja ya tiene una sesión abierta.");

    if (online && cajaSynced) {
      await cajaService.openSessionRpc({ registerId, openingFloat: Number(openingFloat) || 0 });
      await refreshCaja();
      return;
    }

    const session = {
      id: uid(),
      registerId,
      userId: user.id,
      userName: user.name,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingFloat: Number(openingFloat) || 0,
      expectedCash: Number(openingFloat) || 0,
      countedCash: null,
      difference: null,
      notes: "",
      status: "open",
    };
    setCashSessions((prev) => [session, ...prev]);
    setCashMovements((prev) => [{
      id: uid(),
      sessionId: session.id,
      type: "opening_float",
      amount: session.openingFloat,
      note: "Fondo inicial",
      createdAt: session.openedAt,
    }, ...prev]);
    return session;
  }, [online, cajaSynced, cashSessions, refreshCaja]);

  const handleCloseSession = useCallback(async ({ sessionId, countedCash, notes }) => {
    if (online && cajaSynced) {
      const result = await cajaService.closeSessionRpc({ sessionId, countedCash: Number(countedCash) || 0, notes });
      await refreshCaja();
      return result;
    }
    const session = cashSessions.find((s) => s.id === sessionId);
    if (!session || session.status !== "open") throw new Error("Sesión no encontrada o ya cerrada.");
    const expected = expectedCash(session, cashMovements);
    const counted = Number(countedCash) || 0;
    const updated = {
      ...session,
      status: "closed",
      closedAt: new Date().toISOString(),
      expectedCash: expected,
      countedCash: counted,
      difference: counted - expected,
      notes: notes || "",
    };
    setCashSessions((prev) => prev.map((s) => s.id === sessionId ? updated : s));
    return { success: true, expected, counted, difference: counted - expected };
  }, [online, cajaSynced, cashSessions, cashMovements, refreshCaja]);

  const handleAddMovement = useCallback(async ({ sessionId, type, amount, note }) => {
    if (online && cajaSynced) {
      await cajaService.addMovementRpc({ sessionId, type, amount: Number(amount) || 0, note });
      await refreshCaja();
      return;
    }
    setCashMovements((prev) => [{
      id: uid(),
      sessionId,
      type,
      amount: Number(amount) || 0,
      note: note || "",
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }, [online, cajaSynced, refreshCaja]);

  const handleSaveRegister = useCallback(async (payload, isNew) => {
    const row = {
      id: payload.id || uid(),
      number: payload.number,
      name: payload.name,
      location: payload.location,
      isActive: payload.isActive !== false,
      afipPuntoVenta: Number(payload.afipPuntoVenta) || 1,
    };
    if (online && cajaSynced) {
      await cajaService.upsertRegister(row);
      await refreshCaja();
      return;
    }
    setCashRegisters((prev) => {
      if (isNew) return [...prev, row].sort((a, b) => a.number.localeCompare(b.number));
      return prev.map((r) => r.id === row.id ? row : r);
    });
  }, [online, cajaSynced, refreshCaja]);

  const handleDeleteRegister = useCallback(async (id) => {
    const open = cashSessions.some((s) => s.registerId === id && s.status === "open");
    if (open) throw new Error("No se puede eliminar una caja con sesión abierta.");
    if (online && cajaSynced) {
      await cajaService.deleteRegister(id);
      await refreshCaja();
      return;
    }
    setCashRegisters((prev) => prev.filter((r) => r.id !== id));
  }, [online, cajaSynced, cashSessions, refreshCaja]);

  const handleSaveFiscal = useCallback(async (payload) => {
    if (online && cajaSynced) {
      const saved = await fiscalService.saveFiscalSettings(payload);
      setFiscalSettings(saved);
      return;
    }
    setFiscalSettings({ ...DEFAULT_FISCAL, ...payload });
  }, [online, cajaSynced]);

  const handleSaveProduct = useCallback(async (productPayload, isNew) => {
    if (online) {
      if (isNew) {
        await productService.createProduct({
          name: productPayload.name,
          costPrice: productPayload.costPrice,
          publicPrice: productPayload.publicPrice,
          stockLocal1: productPayload.stockLocal1,
          stockLocal2: productPayload.stockLocal2,
          stockDeposito: productPayload.stockDeposito,
          minStock: productPayload.minStock,
          category: productPayload.category,
          barcode: productPayload.barcode,
          photoUrl: productPayload.photo || '',
        });
      } else {
        await productService.updateProduct(productPayload.id, {
          name: productPayload.name,
          costPrice: productPayload.costPrice,
          publicPrice: productPayload.publicPrice,
          stockLocal1: productPayload.stockLocal1,
          stockLocal2: productPayload.stockLocal2,
          stockDeposito: productPayload.stockDeposito,
          minStock: productPayload.minStock,
          category: productPayload.category,
          barcode: productPayload.barcode,
          photoUrl: productPayload.photo || '',
        });
      }
      await refreshProducts();
      return;
    }
    setProducts((prev) => isNew ? [productPayload, ...prev] : prev.map((p) => p.id === productPayload.id ? productPayload : p));
  }, [online, refreshProducts]);

  const handleDeleteProduct = useCallback(async (productId) => {
    if (online) {
      await productService.deleteProduct(productId);
      await refreshProducts();
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, [online, refreshProducts]);

  const handleSaveUser = useCallback(async (userPayload, isNew) => {
    if (online) {
      if (isNew) await userService.adminCreateUser(userPayload);
      else await userService.adminUpdateUser(userPayload);
      setUsers(await userService.getUsers());
      return;
    }
    setUsers((prev) => isNew ? [...prev, userPayload] : prev.map((u) => u.id === userPayload.id ? userPayload : u));
  }, [online]);

  const handleDeleteUser = useCallback(async (userId) => {
    if (online) {
      await userService.adminDeleteUser(userId);
      setUsers(await userService.getUsers());
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, [online]);

  const value = {
    products,
    sales,
    users,
    cashRegisters,
    cashSessions,
    cashMovements,
    tickets,
    fiscalSettings,
    cajaSynced,
    loading,
    error,
    isOnline: online,
    handleSell,
    handleRestock,
    handleSaveProduct,
    handleDeleteProduct,
    handleSaveUser,
    handleDeleteUser,
    handleUpdatePaymentMethod,
    handleUndoSale,
    handleRegisterTicket,
    handleOpenSession,
    handleCloseSession,
    handleAddMovement,
    handleSaveRegister,
    handleDeleteRegister,
    handleSaveFiscal,
    refreshProducts,
    refreshCaja,
    setSales,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
