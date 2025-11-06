import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  MapPin,
  Route as RouteIcon,
  Search,
  Image as ImageIcon,
  Phone,
  Store,
} from "lucide-react";

/* ---------------------- Tipler ---------------------- */
type CustomerType = "own" | "shop";
type OrderStatus = "pending" | "ready" | "delivered";

type Customer = {
  id: string;
  name: string;
  type: CustomerType;
  address?: string;
  mapUrl?: string;
  phone?: string;
  commission?: number | string;
  lat?: number;
  lng?: number;
};

type Product = {
  id: string;
  name: string;
  price: number;
  photo?: string;
};

type OrderItem = { productId: string; qty: number };
type Order = {
  id: string;
  date: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
};

type BackupJson = {
  customers?: Customer[];
  products?: Product[];
  orders?: Order[];
};

/* ------------------ localStorage hook ------------------ */
// (Hata: key/initialValue 'any' → generic ile düzeltiyoruz)
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------------------- UI parçaları ---------------------- */
function Header({
  search,
  setSearch,
}: {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Badge>🍰 Tatlı Paneli</Badge>
        <span className="text-muted-foreground">Sipariş & Dağıtım (MVP)</span>
      </div>
      <div className="relative w-full sm:w-96">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          placeholder="Müşteri, ürün veya sipariş ara"
        />
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  right,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  right?: ReactNode; // opsiyonel (missing prop hatasını çözer)
}) {
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

function FileButton({ onFile }: { onFile: (data: BackupJson) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <Input
        ref={ref}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0] ?? null;
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              try {
                onFile(JSON.parse(reader.result) as BackupJson);
              } catch {
                alert("Geçersiz JSON");
              }
            } else {
              alert("Geçersiz dosya içeriği");
            }
          };
          reader.readAsText(f);
        }}
      />
      <Button variant="outline" onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4 mr-2" /> İçe Aktar
      </Button>
    </div>
  );
}

function PhotoInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {value ? (
          <img alt="urun" src={value} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        Fotoğraf Seç
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") onChange(reader.result);
          };
          reader.readAsDataURL(f);
        }}
      />
      {value && (
        <Button variant="outline" onClick={() => onChange("")}>
          Sil
        </Button>
      )}
    </div>
  );
}

/* ---------------- util: maps url -> durak metni ---------------- */
function parseCoordsOrAddressFromMapUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const q = u.searchParams.get("q");
    if (q) return q;
    const path = u.pathname.split("/").filter(Boolean);
    const at = path.findIndex((p) => p === "@");
    if (at >= 0 && path[at + 1]) {
      const [lat, lng] = path[at + 1].split(",", 2);
      if (lat && lng) return `${lat},${lng}`;
    }
  } catch {}
  return null;
}

function normalizeStopFromCustomer(c?: Partial<Customer>): string | null {
  if (!c) return null;
  const pick =
    parseCoordsOrAddressFromMapUrl(c.mapUrl) ??
    (c.lat && c.lng ? `${c.lat},${c.lng}` : null) ??
    c.address ??
    c.name ??
    null;
  return pick;
}

/* -------------- filtre fonksiyonu (teslimat) -------------- */
function filterOrders(
  orders: Order[],
  date: string,
  status: "any" | OrderStatus,
  hideDelivered: boolean = true
): Order[] {
  return orders.filter((o) => {
    if (hideDelivered && o.status === "delivered") return false;
    if (date && o.date !== date) return false;
    if (status && status !== "any" && o.status !== status) return false;
    return true;
  });
}

/* ----------------------- App ----------------------- */
export default function App() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [search, setSearch] = useState<string>("");

  const [customers, setCustomers] = useLocalStorage<Customer[]>(
    "sweet:customers",
    []
  );
  const [products, setProducts] = useLocalStorage<Product[]>(
    "sweet:products",
    []
  );
  const [orders, setOrders] = useLocalStorage<Order[]>("sweet:orders", []);

  const backup = () => {
    const blob = new Blob(
      [JSON.stringify({ customers, products, orders }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tatli-panel-backup-${todayISO}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- müşteriler ---------------- */
  const [custDraft, setCustDraft] = useState<{
    name: string;
    type: CustomerType;
    address: string;
    mapUrl: string;
    phone: string;
    commission: string | number;
  }>({ name: "", type: "own", address: "", mapUrl: "", phone: "", commission: "20" });

  const addCustomer = () => {
    if (!custDraft.name.trim()) return alert("İsim gerekli");
    const id = uid();
    setCustomers([{ id, ...custDraft } as Customer, ...customers]);
    setCustDraft({
      name: "",
      type: "own",
      address: "",
      mapUrl: "",
      phone: "",
      commission: "20",
    });
  };
  const updateCustomer = (id: string, patch: Partial<Customer>) =>
    setCustomers(customers.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCustomer = (id: string) =>
    setCustomers(customers.filter((c) => c.id !== id));

  /* ---------------- ürünler ---------------- */
  const [prodDraft, setProdDraft] = useState<{
    name: string;
    price: string;
    photo: string;
  }>({ name: "", price: "", photo: "" });

  const addProduct = () => {
    if (!prodDraft.name.trim()) return alert("Ürün adı gerekli");
    const price = Number(prodDraft.price || 0);
    if (Number.isNaN(price)) return alert("Geçersiz fiyat");
    setProducts(
      [{ id: uid(), name: prodDraft.name, price, photo: prodDraft.photo } as Product, ...products]
    );
    setProdDraft({ name: "", price: "", photo: "" });
  };
  const updateProduct = (id: string, patch: Partial<Product>) =>
    setProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removeProduct = (id: string) =>
    setProducts(products.filter((p) => p.id !== id));

  /* ---------------- siparişler ---------------- */
  const [orderDraft, setOrderDraft] = useState<{
    date: string;
    customerId: string;
    items: OrderItem[];
  }>({ date: todayISO, customerId: "", items: [] });

  const addOrderItem = (productId: string) => {
    const existing = orderDraft.items.find((i) => i.productId === productId);
    if (existing)
      setOrderDraft({
        ...orderDraft,
        items: orderDraft.items.map((i) =>
          i.productId === productId ? { ...i, qty: i.qty + 1 } : i
        ),
      });
    else
      setOrderDraft({
        ...orderDraft,
        items: [...orderDraft.items, { productId, qty: 1 }],
      });
  };
  const setQty = (productId: string, qty: number) =>
    setOrderDraft({
      ...orderDraft,
      items: orderDraft.items.map((i) =>
        i.productId === productId ? { ...i, qty } : i
      ),
    });
  const removeOrderItem = (productId: string) =>
    setOrderDraft({
      ...orderDraft,
      items: orderDraft.items.filter((i) => i.productId !== productId),
    });

  const addOrder = () => {
    if (!orderDraft.customerId) return alert("Müşteri seç");
    if (orderDraft.items.length === 0) return alert("Ürün ekle");
    setOrders([{ id: uid(), status: "pending", ...orderDraft } as Order, ...orders]);
    setOrderDraft({ date: todayISO, customerId: "", items: [] });
  };
  const updateOrder = (id: string, patch: Partial<Order>) =>
    setOrders(orders.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const removeOrder = (id: string) =>
    setOrders(orders.filter((o) => o.id !== id));

  /* ---------------- türevler ---------------- */
  const productById = useMemo(
    () =>
      Object.fromEntries(products.map((p) => [p.id, p] as const)) as Record<
        string,
        Product
      >,
    [products]
  );

  const orderSummary = (o: Order) => {
    const subtotal = o.items.reduce(
      (sum, it) => sum + (productById[it.productId]?.price || 0) * it.qty,
      0
    );
    const c = customers.find((x) => x.id === o.customerId);
    const rate =
      c?.type === "own" ? Number(c.commission ?? 20) / 100 : 0; // %20 varsayılan
    const commission = subtotal * rate;
    const payoutToShop = c?.type === "shop" ? subtotal : subtotal - commission;
    return { subtotal, commission, payoutToShop };
  };

  /* ---------------- Teslimat filtresi/rota ---------------- */
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [deliveryStatus, setDeliveryStatus] = useState<"any" | OrderStatus>(
    "any"
  );
  const [hideDelivered, setHideDelivered] = useState<boolean>(true);

  const deliveryOrders = useMemo(
    () => filterOrders(orders, deliveryDate, deliveryStatus, hideDelivered),
    [orders, deliveryDate, deliveryStatus, hideDelivered]
  );

  const toggleSelect = (id: string) =>
    setSelectedOrderIds((x) =>
      x.includes(id) ? x.filter((i) => i !== id) : [...x, id]
    );

  const buildRouteUrl = () => {
    const stops = selectedOrderIds
      .map((id) => orders.find((o) => o.id === id))
      .map((o) => {
        const c = customers.find((x) => x.id === o?.customerId);
        return normalizeStopFromCustomer(c);
      })
      .filter(Boolean) as string[];
    if (stops.length === 0) return;
    const enc = (s: string) => encodeURIComponent(s);
    const url = `https://www.google.com/maps/dir/${stops
      .map(enc)
      .join("/")}`;
    window.open(url, "_blank");
  };

  /* ---------------- Raporlar ---------------- */
  const [reportDate, setReportDate] = useState<string>(todayISO);
  const dayOrders = useMemo(
    () => orders.filter((o) => o.date === reportDate),
    [orders, reportDate]
  );
  const reportTotals = useMemo(() => {
    const gross = dayOrders.reduce(
      (sum, o) =>
        sum +
        o.items.reduce(
          (s, it) => s + (productById[it.productId]?.price || 0) * it.qty,
          0
        ),
      0
    );
    const own = dayOrders
      .filter((o) => customers.find((c) => c.id === o.customerId)?.type === "own")
      .reduce((sum, o) => sum + orderSummary(o).commission, 0);
    const shop = dayOrders
      .filter(
        (o) => customers.find((c) => c.id === o.customerId)?.type === "shop"
      )
      .reduce((sum, o) => sum + orderSummary(o).payoutToShop, 0);
    return { gross, own, shop };
  }, [dayOrders, customers, productById]);

  /* ---------------- Render ---------------- */
  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) =>
        `${c.name} ${c.address ?? ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [customers, search]
  );
  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        `${p.name}`.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );
  const filteredOrders = useMemo(
    () =>
      orders.filter((o) =>
        `${customers.find((c) => c.id === o.customerId)?.name ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [orders, customers, search]
  );

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <Header search={search} setSearch={setSearch} />

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Müşteriler</TabsTrigger>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="orders">Siparişler</TabsTrigger>
          <TabsTrigger value="delivery">Teslimat</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
        </TabsList>

        {/* Müşteriler */}
        <TabsContent value="customers" className="space-y-4">
          <Section
            title="Müşteri Ekle"
            description="Ad, telefon, adres veya Google Maps linki"
          >
            <div className="grid sm:grid-cols-2 gap-3 items-start">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input
                  value={custDraft.name}
                  onChange={(e) =>
                    setCustDraft({ ...custDraft, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCustDraft({
                        ...custDraft,
                        type: custDraft.type === "own" ? "shop" : "own",
                      })
                    }
                  >
                    {custDraft.type === "own" ? (
                      <Store className="h-4 w-4 mr-2" />
                    ) : (
                      "Kendi"
                    )}
                    Tip Değiştir
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const v = Number(
                        prompt("Komisyon (%)", String(custDraft.commission ?? 20))
                      );
                      if (!Number.isNaN(v))
                        setCustDraft({ ...custDraft, commission: v });
                    }}
                  >
                    Komisyon
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={custDraft.phone}
                    onChange={(e) =>
                      setCustDraft({ ...custDraft, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adres (veya Google Maps linki)</Label>
                <Textarea
                  value={custDraft.mapUrl || custDraft.address}
                  onChange={(e) =>
                    setCustDraft({
                      ...custDraft,
                      mapUrl: e.target.value.startsWith("http")
                        ? e.target.value
                        : "",
                      address: e.target.value.startsWith("http")
                        ? ""
                        : e.target.value,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Button onClick={addCustomer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ekle
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCustDraft({
                      name: "",
                      type: "own",
                      address: "",
                      mapUrl: "",
                      phone: "",
                      commission: "20",
                    })
                  }
                >
                  Temizle
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Müşteri Listesi" description="Düzenle / Sil">
            <ScrollArea className="h-80">
              <div className="grid gap-2">
                {filteredCustomers.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.phone && (
                            <>
                              <Phone className="h-4 w-4 inline mr-1" />
                              {c.phone}
                              {" • "}
                            </>
                          )}
                          {c.type === "own" ? "Kendi" : "Mağaza"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.mapUrl ||
                            c.address ||
                            (c.lat && c.lng ? `${c.lat},${c.lng}` : "Konum yok")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const next: CustomerType = c.type === "own" ? "shop" : "own";
                            updateCustomer(c.id, { type: next });
                          }}
                        >
                          {c.type === "own" ? (
                            <Store className="h-4 w-4 mr-2" />
                          ) : (
                            "Kendi"
                          )}
                          Tip Değiştir
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const v = Number(
                              prompt("Komisyon (%)", String(c.commission ?? 20))
                            );
                            if (!Number.isNaN(v))
                              updateCustomer(c.id, { commission: v });
                          }}
                        >
                          Komisyon
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => removeCustomer(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-sm text-muted-foreground">Kayıt yok</div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-3">
              <FileButton
                onFile={(data) => {
                  setCustomers(data.customers || []);
                  setProducts(data.products || []);
                  setOrders(data.orders || []);
                }}
              />
            </div>
          </Section>
        </TabsContent>

        {/* Ürünler */}
        <TabsContent value="products" className="space-y-4">
          <Section title="Ürün Ekle" description="Ad, fiyat ve isteğe bağlı fotoğraf">
            <div className="grid sm:grid-cols-2 gap-3 items-start">
              <div className="space-y-2">
                <Label>Ürün Adı</Label>
                <Input
                  value={prodDraft.name}
                  onChange={(e) =>
                    setProdDraft({ ...prodDraft, name: e.target.value })
                  }
                  placeholder="Örn. Profiterol"
                />
              </div>
              <div className="space-y-2">
                <Label>Fiyat (₺)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={prodDraft.price}
                  onChange={(e) =>
                    setProdDraft({ ...prodDraft, price: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="sm:col-span-2">
                <PhotoInput
                  value={prodDraft.photo}
                  onChange={(v) => setProdDraft({ ...prodDraft, photo: v })}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Button onClick={addProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ekle
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setProdDraft({ name: "", price: "", photo: "" })}
                >
                  Temizle
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Ürün Listesi" description="Düzenle / Sil">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">₺{p.price}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="h-36 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {p.photo ? (
                        <img alt={p.name} src={p.photo} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const name = prompt("Yeni ad", p.name) ?? p.name;
                          const price = Number(
                            prompt("Yeni fiyat", String(p.price)) ?? p.price
                          );
                          if (Number.isNaN(price)) return;
                          updateProduct(p.id, { name, price });
                        }}
                      >
                        Düzenle
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => removeProduct(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <div className="text-sm text-muted-foreground">Kayıt yok</div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* Siparişler */}
        <TabsContent value="orders" className="space-y-4">
          <Section title="Yeni Sipariş" description="Tarih, müşteri, ürün ve adet">
            <div className="grid sm:grid-cols-4 gap-3 items-start">
              <div className="space-y-2 sm:col-span-1">
                <Label>Tarih</Label>
                <Input
                  type="date"
                  value={orderDraft.date}
                  onChange={(e) =>
                    setOrderDraft({ ...orderDraft, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Müşteri</Label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-3"
                  value={orderDraft.customerId}
                  onChange={(e) =>
                    setOrderDraft({ ...orderDraft, customerId: e.target.value })
                  }
                >
                  <option value="">Seçiniz</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.type === "own" ? "(Kendi)" : "(Mağaza)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>Ürün</Label>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 h-9 rounded-md border bg-background px-3"
                    onChange={(e) => addOrderItem(e.target.value)}
                  >
                    <option value="">Seç</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-4">
                <div className="grid gap-2">
                  {orderDraft.items.map((it) => (
                    <div key={it.productId} className="flex items-center gap-2">
                      <div className="flex-1">
                        {productById[it.productId]?.name ?? "?"}
                      </div>
                      <Input
                        className="w-24"
                        type="number"
                        inputMode="numeric"
                        value={it.qty}
                        onChange={(e) => setQty(it.productId, Number(e.target.value || 0))}
                      />
                      <Button
                        variant="outline"
                        onClick={() => removeOrderItem(it.productId)}
                      >
                        Kaldır
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <Button onClick={addOrder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setOrderDraft({ date: todayISO, customerId: "", items: [] })
                  }
                >
                  Temizle
                </Button>
              </div>
            </div>
          </Section>

          <Section
            title="Sipariş Listesi"
            description="Durum: Bekliyor → Hazır → Teslim edildi"
          >
            <div className="grid gap-2">
              {filteredOrders.map((o) => {
                const c = customers.find((x) => x.id === o.customerId);
                const s = orderSummary(o);
                const checked = selectedOrderIds.includes(o.id);
                return (
                  <Card key={o.id}>
                    <CardContent className="p-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => toggleSelect(o.id)}
                          />
                          <Badge variant="secondary">{o.date}</Badge>
                          <span className="font-medium">{c?.name || "?"}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {o.items
                            .map(
                              (it) =>
                                `${productById[it.productId]?.name}×${it.qty}`
                            )
                            .join(", ")}
                        </div>
                        <div className="text-sm">
                          Toplam: ₺{s.subtotal.toFixed(2)}{" "}
                          {c?.type === "own" && (
                            <span className="text-muted-foreground">
                              (Kâr ≈ ₺{s.commission.toFixed(2)} • Mağazaya ≈ ₺
                              {s.payoutToShop.toFixed(2)})
                            </span>
                          )}{" "}
                          {c?.type === "shop" && (
                            <span className="text-muted-foreground">
                              (Mağazaya: ₺{s.payoutToShop.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (c.mapUrl) {
                                window.open(c.mapUrl, "_blank");
                                return;
                              }
                              const q =
                                c.lat && c.lng
                                  ? `${c.lat},${c.lng}`
                                  : encodeURIComponent(c.address || c.name);
                              window.open(
                                `https://www.google.com/maps/search/?api=1&query=${q}`,
                                "_blank"
                              );
                            }}
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            Konum
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            const next: OrderStatus =
                              o.status === "pending"
                                ? "ready"
                                : o.status === "ready"
                                ? "delivered"
                                : "pending";
                            updateOrder(o.id, { status: next });
                          }}
                        >
                          {o.status === "pending" && <>Hazır İşaretle</>}
                          {o.status === "ready" && <>Teslim Edildi</>}
                          {o.status === "delivered" && <>Tekrar Aktif</>}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => removeOrder(o.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="text-sm text-muted-foreground">Kayıt yok</div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* Teslimat */}
        <TabsContent value="delivery" className="space-y-4">
          <Section title="Teslimat Filtresi" description="Tarih, durum, hazır olanları seç">
            <div className="grid sm:grid-cols-4 gap-3 items-start">
              <div className="space-y-2">
                <Label>Tarih</Label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-3"
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as "any" | OrderStatus)}
                >
                  <option value="any">Hepsi</option>
                  <option value="pending">Bekliyor</option>
                  <option value="ready">Hazır</option>
                  <option value="delivered">Teslim</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={hideDelivered}
                    onChange={(e) => setHideDelivered(e.target.checked)}
                  />
                  Teslim edilenleri gizle
                </Label>
                <div className="text-xs text-muted-foreground">
                  Varsayılan olarak açık
                </div>
              </div>
              <div className="space-y-1 flex items-end">
                <Button
                  onClick={() => {
                    setDeliveryDate("");
                    setDeliveryStatus("any");
                    setHideDelivered(true);
                  }}
                >
                  Filtreyi Temizle
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                onClick={() => {
                  const ids = deliveryOrders.map((o) => o.id);
                  setSelectedOrderIds(ids);
                }}
              >
                Filtreleneni Seç
              </Button>
              <Button variant="outline" onClick={() => setSelectedOrderIds([])}>
                Seçimi Temizle
              </Button>
              <Button
                onClick={() => {
                  setDeliveryDate(todayISO);
                  setDeliveryStatus("ready");
                  const ids = orders
                    .filter((o) => o.date === todayISO && o.status === "ready")
                    .map((o) => o.id);
                  setSelectedOrderIds(ids);
                }}
              >
                Bugünün Hazırlarını Seç
              </Button>
              <Button variant="secondary" onClick={buildRouteUrl}>
                <RouteIcon className="h-4 w-4 mr-2" />
                Google Maps Rota
              </Button>
            </div>

            <div className="grid gap-2">
              {deliveryOrders.map((o) => {
                const c = customers.find((x) => x.id === o.customerId);
                const checked = selectedOrderIds.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={`flex items-center justify-between border rounded-md p-2 ${
                      checked ? "border-primary" : "border-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleSelect(o.id)}
                      />
                      <span className="text-sm">
                        {o.date} — {c?.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c?.mapUrl ||
                        c?.address ||
                        (c?.lat && c?.lng ? `${c.lat},${c.lng}` : "Konum yok")}{" "}
                      • <span className="uppercase">{o.status}</span>
                    </div>
                  </label>
                );
              })}
              {deliveryOrders.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Filtreye uygun sipariş yok
                </div>
              )}
            </div>
          </Section>
        </TabsContent>

        {/* Raporlar */}
        <TabsContent value="reports" className="space-y-4">
          <Section
            title="Gün Sonu Raporu"
            description="Tarih seç, toplamları gör (kâr hesabı müşteri bazlı)"
          >
            <div className="grid sm:grid-cols-3 gap-3 items-start">
              <div className="space-y-2">
                <Label>Tarih</Label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                <Card className="col-span-1">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Ciro</div>
                    <div className="text-xl font-semibold">
                      ₺{reportTotals.gross.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-1">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Kâr (Kendi)</div>
                    <div className="text-xl font-semibold">
                      ₺{reportTotals.own.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-1">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Ödeme (Mağaza)</div>
                    <div className="text-xl font-semibold">
                      ₺{reportTotals.shop.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Section>

          <div className="flex items-center gap-2">
            <Button onClick={backup}>
              <Download className="h-4 w-4 mr-2" />
              Dışa Aktar (JSON)
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="my-6" />
      <div className="text-xs text-muted-foreground">
        v0.0.1 — <a href="https://github.com/btoksoz/tatli-panel">github.com/btoksoz/tatli-panel</a>
      </div>
    </div>
  );
}
