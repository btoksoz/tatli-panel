import React, { useState, type ReactNode } from "react";
import { Search } from "lucide-react";

/** Üst bilgi/başlık bileşeni için tipler */
type HeaderProps = {
  title: string;
  description?: string;
  right?: ReactNode;
  children?: ReactNode;
};

function Header({ title, description, right, children }: HeaderProps) {
  return (
    <header className="p-4 border-b flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-gray-500">{description}</p>}
        {children}
      </div>
      {right}
    </header>
  );
}

/** Dosya yükleme bileşeni için tipler */
type UploadProps = {
  onfile: (file: File) => void;
};

function Upload({ onfile }: UploadProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onfile(f);
  }
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input type="file" className="hidden" onChange={handleChange} />
      <span className="px-3 py-2 rounded-md bg-gray-100">Dosya Seç</span>
    </label>
  );
}

/** Arama alanı için tipler */
type SearchInputProps = {
  initialValue?: string;
  onChange: (value: string) => void;
};

function SearchInput({ initialValue = "", onChange }: SearchInputProps) {
  const [value, setValue] = useState<string>(initialValue);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    onChange(v);
  }

  return (
    <div className="flex items-center gap-2 border rounded-md px-3 py-2">
      <Search size={16} />
      <input
        value={value}
        onChange={handleInput}
        className="outline-none w-full bg-transparent"
        placeholder="Ara…"
      />
    </div>
  );
}

/** Örnek veri tipi ve liste render */
type Item = { id: string; name: string };

const initialItems: Item[] = [
  { id: "1", name: "Elma" },
  { id: "2", name: "Armut" },
];

export default function App() {
  const [search, setSearch] = useState<string>(""); // implicit any giderildi
  const [items] = useState<Item[]>(initialItems);

  const filtered: Item[] = items.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto">
      <Header
        title="Tatlı Panel"
        description="TypeScript 'implicit any' hataları temizlendi."
        right={<Upload onfile={(f) => console.log("file:", f.name)} />}
      >
        <div className="mt-4">
          <SearchInput initialValue="" onChange={setSearch} />
        </div>
      </Header>

      <main className="p-4">
        <ul className="space-y-2">
          {filtered.map((it: Item, idx: number) => (
            <li
              key={it.id ?? String(idx)} // key tipi belirtildi
              className="p-3 rounded-md border"
            >
              {it.name}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
