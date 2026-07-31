import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { STORAGE_KEY, uid } from '../utils/helpers';
import { DEFAULT_DATA } from '../data/initialData';
import * as productService from '../services/productService';
import * as saleService from '../services/saleService';
import * as userService from '../services/userService';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function DataProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();
  const online = isSupabaseConfigured();

  // ---- Local state (dual mode: Supabase or localStorage) ----
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- Load initial data ----
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
          // Fetch from Supabase
          const [prods, usrs] = await Promise.all([
            productService.getProducts(),
            userService.getUsers(),
          ]);
          setProducts(prods);
          setUsers(usrs);
          // Sales are loaded on-demand in HistorialView
          setSales([]);
        } else {
          // Load from localStorage
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
                setProducts(parsed.products || []);
                setSales(parsed.sales || []);
                setUsers(parsed.users || []);
                setLoading(false);
                return;
              }
            }
          } catch (e) { /* ignore */ }
          setProducts(DEFAULT_DATA.products);
          setSales(DEFAULT_DATA.sales);
          setUsers(DEFAULT_DATA.users);
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

  // ---- Persist to localStorage (offline mode) ----
  useEffect(() => {
    if (!online && currentUser && !loading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, sales, users }));
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  }, [products, sales, users, online, currentUser, loading]);

  // ---- Refresh products from server ----
  const refreshProducts = useCallback(async () => {
    if (!online) return;
    try {
      const prods = await productService.getProducts();
      setProducts(prods);
    } catch (e) {
      console.error('Error refreshing products:', e);
    }
  }, [online]);

  // ---- Sell operation ----
  const handleSell = useCallback(async (productId, qty, user, paymentMethod = 'efectivo', paymentDetail = '') => {
    if (online) {
      const result = await saleService.registerSale(productId, qty, paymentMethod, paymentDetail);
      // Refresh products to get updated stock
      await refreshProducts();
      return result;
    } else {
      // Offline mode
      const product = products.find((p) => p.id === productId);
      if (!product) throw new Error('Producto no encontrado');
      if (product.quantity < qty) throw new Error(`Stock insuficiente. Disponible: ${product.quantity}`);

      const newQty = Math.max(0, product.quantity - qty);
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, quantity: newQty } : p
      ));

      const newSale = {
        id: uid(),
        productId: product.id,
        productName: product.name,
        qty: Number(qty),
        unitPrice: Number(product.publicPrice) || 0,
        costPrice: Number(product.costPrice) || 0,
        paymentMethod: paymentMethod,
        paymentDetail: paymentDetail,
        userId: user.id,
        userName: user.name,
        date: new Date().toISOString(),
      };

      setSales(prev => [newSale, ...prev]);
      return newSale;
    }
  }, [online, products, refreshProducts]);

  // ---- Restock operation ----
  const handleRestock = useCallback(async (productId, addedQty) => {
    if (online) {
      await saleService.restockProduct(productId, addedQty);
      await refreshProducts();
    } else {
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            quantity: (Number(p.quantity) || 0) + Number(addedQty),
            lastRestock: new Date().toISOString(),
          };
        }
        return p;
      }));
    }
  }, [online, refreshProducts]);

  // ---- Product CRUD ----
  const handleSaveProduct = useCallback(async (productPayload, isNew) => {
    if (online) {
      if (isNew) {
        await productService.createProduct({
          name: productPayload.name,
          costPrice: productPayload.costPrice,
          publicPrice: productPayload.publicPrice,
          quantity: productPayload.quantity,
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
          quantity: productPayload.quantity,
          minStock: productPayload.minStock,
          category: productPayload.category,
          barcode: productPayload.barcode,
          photoUrl: productPayload.photo || '',
        });
      }
      await refreshProducts();
    } else {
      setProducts(prev => {
        if (isNew) return [productPayload, ...prev];
        return prev.map(p => p.id === productPayload.id ? productPayload : p);
      });
    }
  }, [online, refreshProducts]);

  const handleDeleteProduct = useCallback(async (productId) => {
    if (online) {
      await productService.deleteProduct(productId);
      await refreshProducts();
    } else {
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  }, [online, refreshProducts]);

  // ---- User CRUD ----
  const handleSaveUser = useCallback(async (userPayload, isNew) => {
    if (online) {
      if (isNew) {
        await userService.adminCreateUser(userPayload);
      } else {
        await userService.adminUpdateUser(userPayload);
      }
      const usrs = await userService.getUsers();
      setUsers(usrs);
    } else {
      setUsers(prev => {
        if (isNew) return [...prev, userPayload];
        return prev.map(u => u.id === userPayload.id ? userPayload : u);
      });
    }
  }, [online]);

  const handleDeleteUser = useCallback(async (userId) => {
    if (online) {
      await userService.adminDeleteUser(userId);
      const usrs = await userService.getUsers();
      setUsers(usrs);
    } else {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  }, [online]);

  const value = {
    products,
    sales,
    users,
    loading,
    error,
    isOnline: online,
    handleSell,
    handleRestock,
    handleSaveProduct,
    handleDeleteProduct,
    handleSaveUser,
    handleDeleteUser,
    refreshProducts,
    setSales,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
