import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Download, Upload, MapPin, Route as RouteIcon, Search, Image as ImageIcon, Phone, Store } from "lucide-react";

/**
 * Müşteri bazlı komisyon + Rapor + Rota (Google Maps paylaşım linki destekli)
 * (Üretim Özeti daha önce istekle kaldırılmıştı, UI'da yok.)
 * - Müşteriler: tip (own/shop), adres, **maps paylaşım linki (mapUrl)**, telefon, komisyon (%)
 * - Geriye dönük uyum: lat/lng alanları varsa yine çalışır; ancak yeni kayıtlar için mapUrl önerilir
 * - Teslimat Rotası: paylaşım linkinden mümkünse koordinat çıkarır; yoksa link/metin adresi durak olarak kullanır
 */

// Basit localStorage kancası
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

const uid = () => Math.random().toString(36).slice(2, 9);

function Header({ search, setSearch }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Badge>🍰 Tatlı Paneli</Badge>
        <span className="text-muted-foreground">Sipariş & Dağıtım (MVP)</span>
      </div>
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Müşteri, ürün veya sipariş ara"/>
      </div>
    </div>
  );
}

function Section({ title, description, children, right }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FileButton({ onFile }) {
  const ref = useRef(null);
  return (
    <div>
      <Input ref={ref} type="file" accept="application/json" className="hidden" onChange={(e)=>{
        const f = e.target.files?.[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try { onFile(JSON.parse(reader.result)); } catch { alert("Geçersiz JSON"); }
        };
        reader.readAsText(f);
      }}/>
      <Button variant="outline" onClick={()=>ref.current?.click()}>
        <Upload className="h-4 w-4 mr-2"/> İçe Aktar
      </Button>
    </div>
  );
}

function PhotoInput({ value, onChange }) {
  const inputRef = useRef(null);
  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {value ? <img alt="urun" src={value} className="h-full w-full object-cover"/> : <ImageIcon className="h-5 w-5 text-muted-foreground"/>}
      </div>
      <Button variant="outline" onClick={()=>inputRef.current?.click()}>Fotoğraf Seç</Button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{
        const f = e.target.files?.[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result);
        reader.readAsDataURL(f);
      }}/>
      {value && <Button variant="ghost" onClick={()=>onChange("")}>Sil</Button>}
    </div>
  );
}

// Google Maps paylaşım linkinden koordinat **veya** q=adres çıkarmayı dener
function parseCoordsOrAddressFromMapUrl(url) {
  if (!url) return null;
  try {
    // 1) @LAT, LNG, zoom
    const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return `${at[1]},${at[2]}`;
    // 2) q=... (lat,lng **veya** metin adres)
    const q = url.match(/[?&]q=([^&]+)/);
    if (q) {
      const val = decodeURIComponent(q[1]);
      if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(val)) return val; // koordinat
      return val; // metinsel adres
    }
    // 3) !3dLAT!4dLNG kalıbı
    const b = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (b) return `${b[1]},${b[2]}`;
  } catch {}
  return null;
}

// Bir müşteriden rota durağı üretir (koordinat veya metin adres)
function normalizeStopFromCustomer(c) {
  if (!c) return null;
  if (c.mapUrl) {
    const parsed = parseCoordsOrAddressFromMapUrl(c.mapUrl);
    if (parsed) return parsed; // "lat,lng" veya metinsel adres
    if (c.address) return c.address;
    return c.name;
  }
  if (c.lat && c.lng) return `${c.lat},${c.lng}`; // eski kayıt desteği
  if (c.address) return c.address;
  return c.name || null;
}

// Filtre saf fonksiyonu (teslimat listesi için)
function filterOrders(orders, date, status, hideDelivered = false) {
  return orders.filter(o => {
    if (hideDelivered && o.status === 'delivered') return false;
    if (date && o.date !== date) return false;
    if (status && status !== 'any' && o.status !== status) return false;
    return true;
  });
}

// ——— Küçük testler (konsolda uyarmazsa geçti demektir) ———
(function smallTests() {
  try {
    console.assert(parseCoordsOrAddressFromMapUrl("https://www.google.com/maps/@41.0082,28.9784,15z") === "41.0082,28.9784");
    console.assert(parseCoordsOrAddressFromMapUrl("https://www.google.com/maps?q=41.0082,28.9784") === "41.0082,28.9784");
    console.assert(parseCoordsOrAddressFromMapUrl("https://www.google.com/maps/place/İstanbul!3d41.0082!4d28.9784") === "41.0082,28.9784");
    console.assert(normalizeStopFromCustomer({ mapUrl: "https://www.google.com/maps?q=Sirkeci%20İskelesi", name:"X"}) === "Sirkeci İskelesi");
    console.assert(normalizeStopFromCustomer({ address:"Taksim Meydanı"}) === "Taksim Meydanı");
    const dummy = [
      { id: '1', date: '2025-01-01', status: 'pending' },
      { id: '2', date: '2025-01-02', status: 'ready' },
      { id: '3', date: '2025-01-01', status: 'delivered' },
    ];
    console.assert(filterOrders(dummy, '2025-01-01', 'any').length === 2);
    console.assert(filterOrders(dummy, '', 'ready').length === 1);
    console.assert(filterOrders(dummy, '2025-01-02', 'ready').map(x=>x.id).join(',') === '2');
    // Yeni testler: teslim edilenleri gizle
    console.assert(filterOrders(dummy, '', 'any', true).length === 2);
    console.assert(filterOrders(dummy, '2025-01-01', 'any', true).map(x=>x.id).join(',') === '1');
    // Ek test: normalizeStopFromCustomer fallback sırasi
    console.assert(normalizeStopFromCustomer({ name:"Deneme"}) === "Deneme");
  } catch (e) { /* testler başarısızsa prod davranışını etkilemez */ }
})();

export default function App() {
  const [search, setSearch] = useState("");

  const [customers, setCustomers] = useLocalStorage("sweet:customers", []);
  const [products, setProducts] = useLocalStorage("sweet:products", []);
  const [orders, setOrders] = useLocalStorage("sweet:orders", []);

  // Hızlı filtreleme (arama)
  const filteredCustomers = useMemo(()=>{
    const q = search.trim().toLowerCase();
    if(!q) return customers;
    return customers.filter(c => [c.name, c.address, c.phone].join(" ").toLowerCase().includes(q));
  }, [customers, search]);
  const filteredProducts = useMemo(()=>{
    const q = search.trim().toLowerCase();
    if(!q) return products;
    return products.filter(p => [p.name, String(p.price)].join(" ").toLowerCase().includes(q));
  }, [products, search]);
  const filteredOrders = useMemo(()=>{
    const q = search.trim().toLowerCase();
    if(!q) return orders;
    return orders.filter(o => {
      const c = customers.find(c=>c.id===o.customerId);
      return [o.date, c?.name].join(" ").toLowerCase().includes(q);
    });
  }, [orders, customers, search]);

  // Yedekleme
  const backup = () => {
    const blob = new Blob([JSON.stringify({ customers, products, orders }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tatli-panel-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // Müşteriler
  const [custDraft, setCustDraft] = useState({ name:"", type:"own", address:"", mapUrl:"", phone:"", commission:"20" });
  const addCustomer = () => {
    if(!custDraft.name.trim()) return alert("İsim gerekli");
    const id = uid();
    setCustomers([{ id, ...custDraft }, ...customers]);
    setCustDraft({ name:"", type:"own", address:"", mapUrl:"", phone:"", commission:"20" });
  };
  const updateCustomer = (id, patch) => setCustomers(customers.map(c=> c.id===id ? { ...c, ...patch } : c));
  const removeCustomer = (id) => setCustomers(customers.filter(c=>c.id!==id));

  // Ürünler
  const [prodDraft, setProdDraft] = useState({ name:"", price:"", photo:"" });
  const addProduct = () => {
    if(!prodDraft.name.trim()) return alert("Ürün adı gerekli");
    const price = Number(prodDraft.price || 0);
    if(Number.isNaN(price)) return alert("Geçersiz fiyat");
    setProducts([{ id: uid(), name: prodDraft.name, price, photo: prodDraft.photo }, ...products]);
    setProdDraft({ name:"", price:"", photo:"" });
  };
  const updateProduct = (id, patch) => setProducts(products.map(p => p.id===id ? { ...p, ...patch } : p));
  const removeProduct = (id) => setProducts(products.filter(p=>p.id!==id));

  // Siparişler
  const todayISO = new Date().toISOString().slice(0,10);
  const [orderDraft, setOrderDraft] = useState({ date: todayISO, customerId:"", items: [] });
  const addOrderItem = (productId) => {
    const existing = orderDraft.items.find(i=>i.productId===productId);
    if(existing) setOrderDraft({ ...orderDraft, items: orderDraft.items.map(i=> i.productId===productId ? { ...i, qty: i.qty+1 } : i) });
    else setOrderDraft({ ...orderDraft, items: [...orderDraft.items, { productId, qty: 1 }] });
  };
  const setQty = (productId, qty) => setOrderDraft({ ...orderDraft, items: orderDraft.items.map(i=> i.productId===productId ? { ...i, qty } : i) });
  const removeOrderItem = (productId) => setOrderDraft({ ...orderDraft, items: orderDraft.items.filter(i=>i.productId!==productId) });
  const addOrder = () => {
    if(!orderDraft.customerId) return alert("Müşteri seç");
    if(orderDraft.items.length===0) return alert("Ürün ekle");
    setOrders([{ id: uid(), status: "pending", ...orderDraft }, ...orders]);
    setOrderDraft({ date: todayISO, customerId:"", items: [] });
  };
  const updateOrder = (id, patch) => setOrders(orders.map(o=> o.id===id ? { ...o, ...patch } : o));
  const removeOrder = (id) => setOrders(orders.filter(o=>o.id!==id));

  // Toplam hesap
  const productById = useMemo(()=>Object.fromEntries(products.map(p=>[p.id,p])),[products]);
  const orderSummary = (o) => {
    const subtotal = o.items.reduce((sum, it)=> sum + (productById[it.productId]?.price||0)*it.qty, 0);
    const cust = customers.find(c=>c.id===o.customerId);
    const isOwn = cust?.type === "own";
    const rate = Number(cust?.commission ?? 20) / 100;
    const commission = isOwn ? subtotal * rate : 0; // müşteri bazlı %
    // Mağazaya giden: her durumda toplamdan kâr düşülmüş kalan tutar
    const payoutToShop = subtotal - commission;
    return { subtotal, commission, payoutToShop };
  };

  // Teslimat seçimi ve filtreleri
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState(""); // boş = hepsi
  const [deliveryStatus, setDeliveryStatus] = useState("any"); // any|pending|ready|delivered
  const [hideDelivered, setHideDelivered] = useState(true); // varsayılan: teslim edilmişler gizli
  const deliveryOrders = useMemo(()=> filterOrders(orders, deliveryDate, deliveryStatus, hideDelivered), [orders, deliveryDate, deliveryStatus, hideDelivered]);

  // Rapor
  const [reportDate, setReportDate] = useState(todayISO);
  const dayOrders = useMemo(()=> orders.filter(o=>o.date===reportDate), [orders, reportDate]);
  const reportTotals = useMemo(()=>{
    let gross=0, own=0, shop=0;
    dayOrders.forEach(o=>{ const s=orderSummary(o); gross+=s.subtotal; own+=s.commission; shop+=s.payoutToShop; });
    return { gross, own, shop };
  }, [dayOrders]);

  const toggleSelect = (id) => setSelectedOrderIds((x)=> x.includes(id) ? x.filter(i=>i!==id) : [...x, id]);

  const buildRouteUrl = () => {
    const sel = orders.filter(o=>selectedOrderIds.includes(o.id));
    if(sel.length===0) { alert("Sipariş seç"); return; }

    const stops = sel.map(o => normalizeStopFromCustomer(customers.find(c=>c.id===o.customerId))).filter(Boolean);
    if(stops.length === 0) { alert("Seçilen siparişlerde geçerli konum yok"); return; }

    // Google, waypoint olarak metin adresleri veya "lat,lng" ister.
    const enc = (s) => encodeURIComponent(s);
    const base = "https://www.google.com/maps/dir/?api=1&travelmode=driving";
    const destination = enc(stops[stops.length-1]);
    const waypoints = stops.slice(0, -1).map(enc).join("|");
    const url = `${base}&destination=${destination}${waypoints?`&waypoints=${waypoints}`:""}`;

    // Pop-up engellenirse aynı sekmede aç
    const win = window.open(url, "_blank");
    if (!win) window.location.href = url;
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <Header search={search} setSearch={setSearch} />

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid grid-cols-4 sm:grid-cols-5 w-full">
          <TabsTrigger value="customers">Müşteriler</TabsTrigger>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="orders">Siparişler</TabsTrigger>
          <TabsTrigger value="delivery" className="hidden sm:inline-flex">Teslimat</TabsTrigger>
          <TabsTrigger value="reports">Rapor</TabsTrigger>
        </TabsList>

        {/* Müşteriler */}
        <TabsContent value="customers" className="space-y-4">
          <Section title="Müşteri Ekle" description="Google Maps paylaşım linkiyle konum ekleyin (lat/lng gereksiz)">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>İsim</Label>
                <Input value={custDraft.name} onChange={(e)=>setCustDraft({...custDraft, name:e.target.value})} placeholder="Müşteri adı"/>
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <div className="flex gap-3 items-center">
                  <Button variant={custDraft.type==='own'?"default":"outline"} onClick={()=>setCustDraft({...custDraft, type:'own'})}>Kendi</Button>
                  <Button variant={custDraft.type==='shop'?"default":"outline"} onClick={()=>setCustDraft({...custDraft, type:'shop'})}>Çalıştığı yer</Button>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adres (veya açıklama)</Label>
                <Textarea value={custDraft.address} onChange={(e)=>setCustDraft({...custDraft, address:e.target.value})} placeholder="Adres veya konum notu"/>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Google Maps Linki</Label>
                <Input value={custDraft.mapUrl} onChange={(e)=>setCustDraft({...custDraft, mapUrl:e.target.value})} placeholder="https://maps.app.goo.gl/... veya https://www.google.com/maps/..."/>
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={custDraft.phone} onChange={(e)=>setCustDraft({...custDraft, phone:e.target.value})} placeholder="05xx..."/>
              </div>
              <div className="space-y-2">
                <Label>Komisyon (%)</Label>
                <Input type="number" inputMode="decimal" value={custDraft.commission} onChange={(e)=>setCustDraft({...custDraft, commission:e.target.value})} placeholder="20"/>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={addCustomer}><Plus className="h-4 w-4 mr-2"/>Ekle</Button>
                <Button variant="outline" onClick={()=>setCustDraft({ name:"", type:"own", address:"", mapUrl:"", phone:"", commission:"20" })}>Temizle</Button>
              </div>
            </div>
          </Section>

          <Section title="Müşteri Listesi" description="Düzenle / Sil" right={<Button variant="outline" onClick={backup}><Download className="h-4 w-4 mr-2"/>Dışa Aktar</Button>}>
            <ScrollArea className="h-[340px] pr-2">
              <div className="grid gap-2">
                {filteredCustomers.map(c => (
                  <Card key={c.id} className="border-muted">
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={c.type==='own'?"default":"secondary"}>{c.type==='own'? 'Kendi' : 'Çalıştığı yer'}</Badge>
                          <span className="font-medium">{c.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4"/>{c.mapUrl || c.address || (c.lat&&c.lng?`${c.lat},${c.lng}`:"—")}</div>
                        {c.phone && <div className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/>{c.phone}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={()=>{
                          if (c.mapUrl) { window.open(c.mapUrl, "_blank"); return; }
                          const q = c.lat && c.lng ? `${c.lat},${c.lng}` : encodeURIComponent(c.address||c.name);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
                        }}>Haritada Aç</Button>
                        <Button variant="outline" onClick={()=>updateCustomer(c.id, { type: c.type==='own'?'shop':'own' })}>
                          {c.type==='own' ? <Store className="h-4 w-4 mr-2"/> : 'Kendi' }
                          Tip Değiştir
                        </Button>
                        <Button variant="outline" onClick={()=>{ const v = Number(prompt("Komisyon (%)", String(c.commission ?? 20))); if(!Number.isNaN(v)) updateCustomer(c.id, { commission: v }); }}>Komisyon</Button>
                        <Button variant="destructive" onClick={()=>removeCustomer(c.id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredCustomers.length===0 && <div className="text-sm text-muted-foreground">Kayıt yok</div>}
              </div>
            </ScrollArea>
            <div className="mt-3"><FileButton onFile={(data)=>{
              setCustomers(data.customers||[]); setProducts(data.products||[]); setOrders(data.orders||[]);
            }}/></div>
          </Section>
        </TabsContent>

        {/* Ürünler */}
        <TabsContent value="products" className="space-y-4">
          <Section title="Ürün Ekle" description="Ad, fiyat ve isteğe bağlı fotoğraf">
            <div className="grid sm:grid-cols-2 gap-3 items-start">
              <div className="space-y-2">
                <Label>Ürün Adı</Label>
                <Input value={prodDraft.name} onChange={(e)=>setProdDraft({...prodDraft, name:e.target.value})} placeholder="Örn. Profiterol"/>
              </div>
              <div className="space-y-2">
                <Label>Fiyat (₺)</Label>
                <Input type="number" inputMode="decimal" value={prodDraft.price} onChange={(e)=>setProdDraft({...prodDraft, price:e.target.value})} placeholder="0"/>
              </div>
              <div className="sm:col-span-2"><PhotoInput value={prodDraft.photo} onChange={(v)=>setProdDraft({...prodDraft, photo:v})}/></div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Button onClick={addProduct}><Plus className="h-4 w-4 mr-2"/>Ekle</Button>
                <Button variant="outline" onClick={()=>setProdDraft({ name:"", price:"", photo:"" })}>Temizle</Button>
              </div>
            </div>
          </Section>

          <Section title="Ürün Listesi" description="Düzenle / Sil">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map(p => (
                <Card key={p.id}>
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">₺{p.price}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="h-36 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {p.photo ? <img alt={p.name} src={p.photo} className="h-full w-full object-cover"/> : <ImageIcon className="h-8 w-8 text-muted-foreground"/>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={()=>{
                        const name = prompt("Yeni ad", p.name) ?? p.name;
                        const price = Number(prompt("Yeni fiyat", String(p.price)) ?? p.price);
                        if(Number.isNaN(price)) return;
                        updateProduct(p.id, { name, price });
                      }}>Düzenle</Button>
                      <Button variant="destructive" onClick={()=>removeProduct(p.id)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts.length===0 && <div className="text-sm text-muted-foreground">Kayıt yok</div>}
            </div>
          </Section>
        </TabsContent>

        {/* Siparişler */}
        <TabsContent value="orders" className="space-y-4">
          <Section title="Yeni Sipariş" description="Tarih, müşteri, ürün ve adet">
            <div className="grid sm:grid-cols-4 gap-3 items-start">
              <div className="space-y-2 sm:col-span-1">
                <Label>Tarih</Label>
                <Input type="date" value={orderDraft.date} onChange={(e)=>setOrderDraft({...orderDraft, date:e.target.value})}/>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Müşteri</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3" value={orderDraft.customerId} onChange={(e)=>setOrderDraft({...orderDraft, customerId:e.target.value})}>
                  <option value="">Seçiniz</option>
                  {customers.map(c=> <option key={c.id} value={c.id}>{c.name} {c.type==='own'?'(Kendi)':'(Çalıştığı yer)'}</option>)}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>Hızlı Ekle</Label>
                <div className="flex gap-2 flex-wrap">
                  {products.slice(0,3).map(p=> (
                    <Button key={p.id} variant="outline" onClick={()=>addOrderItem(p.id)}>{p.name}</Button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {products.map(p=> {
                    const it = orderDraft.items.find(i=>i.productId===p.id);
                    return (
                      <Card key={p.id} className={it?"border-primary":""}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-sm text-muted-foreground">₺{p.price}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={()=>addOrderItem(p.id)}>Ekle</Button>
                            {it && (
                              <div className="flex items-center gap-2">
                                <Input className="w-20" type="number" value={it.qty} onChange={(e)=>setQty(p.id, Number(e.target.value||0))}/>
                                <Button size="sm" variant="ghost" onClick={()=>removeOrderItem(p.id)}>Kaldır</Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-4 flex items-center gap-2">
                <Button onClick={addOrder}><Plus className="h-4 w-4 mr-2"/>Kaydet</Button>
                <Button variant="outline" onClick={()=>setOrderDraft({ date: todayISO, customerId:"", items: [] })}>Temizle</Button>
              </div>
            </div>
          </Section>

          <Section title="Sipariş Listesi" description="Durum: Bekliyor → Hazır → Teslim edildi">
            <div className="grid gap-2">
              {filteredOrders.map(o => {
                const c = customers.find(c=>c.id===o.customerId);
                const s = orderSummary(o);
                const checked = selectedOrderIds.includes(o.id);
                return (
                  <Card key={o.id}>
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4" checked={checked} onChange={()=>toggleSelect(o.id)}/>
                          <Badge variant="secondary">{o.date}</Badge>
                          <span className="font-medium">{c?.name||"?"}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{o.items.map(it=>`${productById[it.productId]?.name}×${it.qty}`).join(", ")}</div>
                        <div className="text-sm">Toplam: ₺{s.subtotal.toFixed(2)} {c?.type==='own' && <span className="text-muted-foreground">(Kâr ≈ ₺{s.commission.toFixed(2)} • Mağazaya ≈ ₺{s.payoutToShop.toFixed(2)})</span>} {c?.type==='shop' && <span className="text-muted-foreground">(Mağazaya: ₺{s.payoutToShop.toFixed(2)})</span>}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c && <Button variant="outline" onClick={()=>{
                          if (c.mapUrl) { window.open(c.mapUrl, "_blank"); return; }
                          const q = c.lat && c.lng ? `${c.lat},${c.lng}` : encodeURIComponent(c.address||c.name);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
                        }}><MapPin className="h-4 w-4 mr-2"/>Konum</Button>}
                        <Button variant="outline" onClick={()=>{
                          const next = o.status==='pending'?'ready': o.status==='ready'?'delivered':'pending';
                          updateOrder(o.id, { status: next });
                        }}>
                          {o.status==='pending' && <>Hazır İşaretle</>}
                          {o.status==='ready' && <>Teslim Edildi</>}
                          {o.status==='delivered' && <>Tekrar Aktif</>}
                        </Button>
                        <Button variant="destructive" onClick={()=>removeOrder(o.id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredOrders.length===0 && <div className="text-sm text-muted-foreground">Kayıt yok</div>}
            </div>
          </Section>
        </TabsContent>

        {/* Teslimat */}
        <TabsContent value="delivery" className="space-y-4">
          <Section title="Teslimat Hazırlık" description="Filtrele → siparişleri seç → rota oluştur">
            <div className="grid sm:grid-cols-4 gap-3 mb-2">
              <div className="space-y-1">
                <Label>Tarih Filtresi</Label>
                <Input type="date" value={deliveryDate} onChange={(e)=>setDeliveryDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Durum</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3" value={deliveryStatus} onChange={(e)=>setDeliveryStatus(e.target.value)}>
                  <option value="any">Hepsi</option>
                  <option value="pending">Bekliyor</option>
                  <option value="ready">Hazır</option>
                  <option value="delivered">Teslim</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="align-middle" checked={hideDelivered} onChange={(e)=>setHideDelivered(e.target.checked)} />
                  Teslim edilenleri gizle
                </Label>
                <div className="text-xs text-muted-foreground">Varsayılan olarak açık</div>
              </div>
              <div className="space-y-1 flex items-end">
                <Button onClick={()=>{ setDeliveryDate(""); setDeliveryStatus("any"); setHideDelivered(true); }}>Filtreyi Temizle</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Button onClick={()=>{ const ids = deliveryOrders.map(o=>o.id); setSelectedOrderIds(ids); }}>Filtreleneni Seç</Button>
              <Button variant="outline" onClick={()=>setSelectedOrderIds([])}>Seçimi Temizle</Button>
              <Button onClick={()=>{ setDeliveryDate(todayISO); setDeliveryStatus('ready'); const ids = orders.filter(o=>o.date===todayISO && o.status==='ready').map(o=>o.id); setSelectedOrderIds(ids); }}>Bugünün Hazırlarını Seç</Button>
              <Button variant="secondary" onClick={buildRouteUrl}><RouteIcon className="h-4 w-4 mr-2"/>Google Maps Rota</Button>
            </div>

            <div className="grid gap-2">
              {deliveryOrders.map(o=>{
                const c = customers.find(c=>c.id===o.customerId);
                const checked = selectedOrderIds.includes(o.id);
                return (
                  <label key={o.id} className={`flex items-center justify-between border rounded-md p-2 ${checked? 'border-primary' : 'border-muted'}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={()=>toggleSelect(o.id)}/>
                      <span className="text-sm">{o.date} — {c?.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{c?.mapUrl || c?.address || (c?.lat&&c?.lng?`${c.lat},${c.lng}`:"Konum yok")} • <span className="uppercase">{o.status}</span></div>
                  </label>
                )
              })}
              {deliveryOrders.length===0 && <div className="text-sm text-muted-foreground">Filtreye uygun sipariş yok</div>}
            </div>
          </Section>
        </TabsContent>

        {/* Raporlar */}
        <TabsContent value="reports" className="space-y-4">
          <Section title="Gün Sonu Raporu" description="Tarih seç, toplamları gör (kâr hesabı müşteri bazlı)">
            <div className="grid sm:grid-cols-3 gap-3 items-start">
              <div className="space-y-2">
                <Label>Tarih</Label>
                <Input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} />
              </div>
              <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                <Card className="col-span-1"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Ciro</div><div className="text-xl font-semibold">₺{reportTotals.gross.toFixed(2)}</div></CardContent></Card>
                <Card className="col-span-1"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Kâr (Kendi)</div><div className="text-xl font-semibold">₺{reportTotals.own.toFixed(2)}</div></CardContent></Card>
                <Card className="col-span-1"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Mağazaya</div><div className="text-xl font-semibold">₺{reportTotals.shop.toFixed(2)}</div></CardContent></Card>
              </div>
            </div>
            <Separator className="my-2"/>
            <div className="grid gap-2">
              {dayOrders.map(o=>{
                const c = customers.find(c=>c.id===o.customerId);
                const s = orderSummary(o);
                return (
                  <div key={o.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{o.date}</Badge>
                      <span className="font-medium">{c?.name}</span>
                      {c?.type==='own' ? <span className="text-xs text-muted-foreground">(Komisyon %{String(c?.commission ?? 20)})</span> : <span className="text-xs text-muted-foreground">(Çalıştığı yer)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">Toplam ₺{s.subtotal.toFixed(2)} • Kâr ₺{s.commission.toFixed(2)} • Mağaza ₺{s.payoutToShop.toFixed(2)}</div>
                  </div>
                )
              })}
              {dayOrders.length===0 && <div className="text-sm text-muted-foreground">Bu tarihte sipariş yok</div>}
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-3 text-xs text-muted-foreground">
          <p>İpucu: Konum eklerken en pratik yöntem Google Maps paylaşım linkini koymak (ör. maps.app.goo.gl/...). Linkten koordinat veya adres okunamazsa adres alanı veya eski lat/lng değerleri kullanılır.</p>
          <p>Yedekleme/taşıma için üstteki Dışa Aktar / İçe Aktar'ı kullanın.</p>
        </CardContent>
      </Card>
    </div>
  );
}
