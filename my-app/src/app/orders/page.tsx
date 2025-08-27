'use client';

import * as React from 'react';
import Header from '@/components/headers/header';
import Footer from '@/components/footers/footer';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Grid2 from '@mui/material/Unstable_Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

/**
 * NOTE: для прямых запросов к API Новой Почты на клиенте нужен ключ,
 * добавьте его в .env.local c префиксом NEXT_PUBLIC:
 * NEXT_PUBLIC_NOVAPOSHTA_API_KEY=ваш_ключ
 * Это раскроет ключ в браузере. Для продакшена лучше проксировать через /api/*.
 */
const NP_API = 'https://api.novaposhta.ua/v2.0/json/';
const NP_KEY = 'a1d75ae4f1b2afbc4a296b8e0a9c3b60';
// const NP_KEY = process.env.NEXT_PUBLIC_NOVAPOSHTA_API_KEY as string | undefined;

// ---------- Типы ----------
export type CartItem = {
  id: number | string;
  name: string;
  price: number;
  image?: string | null;
  qty: number;
};

type CityOpt = { ref: string; name: string };
type WhOpt = { ref: string; address: string; category?: string };

// ---------- Утилиты корзины (localStorage) ----------
function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('cart_items');
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}
function writeCart(items: CartItem[]) {
  localStorage.setItem('cart_items', JSON.stringify(items));
}

// ---------- Запросы к НП ----------
async function npCall<T = any>(modelName: string, calledMethod: string, methodProperties: any) {
  if (!NP_KEY) throw new Error('NEXT_PUBLIC_NOVAPOSHTA_API_KEY не задан');
  const res = await fetch(NP_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: NP_KEY, modelName, calledMethod, methodProperties }),
  });
  const json = await res.json();
  if (!json?.success) throw new Error((json?.errors || []).join(', ') || 'Nova Poshta error');
  return json.data as T;
}

export default function OrdersPage() {
  // корзина
  const [items, setItems] = React.useState<CartItem[]>([]);
  React.useEffect(() => { setItems(readCart()); }, []);
  const total = React.useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items]);

  const inc = (id: CartItem['id']) => setItems(prev => { const next = prev.map(it => String(it.id)===String(id)?{...it, qty: it.qty+1}:it); writeCart(next); return next; });
  const dec = (id: CartItem['id']) => setItems(prev => { const next = prev.map(it => String(it.id)===String(id)?{...it, qty: Math.max(1, it.qty-1)}:it); writeCart(next); return next; });
  const remove = (id: CartItem['id']) => setItems(prev => { const next = prev.filter(it => String(it.id)!==String(id)); writeCart(next); return next; });

  // форма — личные данные
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [birthDate, setBirthDate] = React.useState('');
  const [phone, setPhone] = React.useState('');

  // вкладки
  const [tab, setTab] = React.useState<'personal'|'delivery'>('personal');

  // доставка НП
  const [cityInput, setCityInput] = React.useState('');
  const [cityOptions, setCityOptions] = React.useState<CityOpt[]>([]);
  const [cityLoading, setCityLoading] = React.useState(false);
  const [selectedCity, setSelectedCity] = React.useState<CityOpt | null>(null);
  const [cityOpen, setCityOpen] = React.useState(false);

  const [whType, setWhType] = React.useState<'branch' | 'postomat'>('branch');
  const [warehouses, setWarehouses] = React.useState<WhOpt[]>([]);
  const [whLoading, setWhLoading] = React.useState(false);
  const [selectedWh, setSelectedWh] = React.useState<WhOpt | null>(null);

  const [address, setAddress] = React.useState(''); // курьерская

  const loadInitialCities = React.useCallback(async () => {
    if (cityOptions.length > 0) return;
    try {
      setCityLoading(true);
      const data = await npCall<any[]>('Address', 'getCities', {});
      // Подрежем список, чтобы не перегружать выпадающий список
      setCityOptions(data.slice(0, 50).map(c => ({ ref: c.Ref, name: c.Description })));
    } catch (e) {
      // игнорируем, оставим пустым
    } finally {
      setCityLoading(false);
    }
  }, [cityOptions.length]);
  // загрузка городов (debounce 300ms)
  React.useEffect(() => {
    const q = cityInput.trim();
    if (q.length < 2) { setCityOptions([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setCityLoading(true);
        const data = await npCall<any[]>('Address', 'getCities', { FindByString: q });
        setCityOptions(data.map(c => ({ ref: c.Ref, name: c.Description })));
      } catch (e) {
        setCityOptions([]);
      } finally {
        setCityLoading(false);
      }
    }, 300);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [cityInput]);

  // при выборе города — грузим отделения
  React.useEffect(() => {
    if (!selectedCity) { setWarehouses([]); setSelectedWh(null); return; }
    (async () => {
      try {
        setWhLoading(true);
        const data = await npCall<any[]>('AddressGeneral', 'getWarehouses', { CityRef: selectedCity.ref });
        setWarehouses(data.map(w => ({ ref: w.Ref, address: w.ShortAddress || w.Description, category: w.CategoryOfWarehouse })));
      } catch (e) {
        setWarehouses([]);
      } finally {
        setWhLoading(false);
      }
    })();
  }, [selectedCity]);

  const filteredWh = React.useMemo(() => {
    const isPostomat = (cat?: string) => /поштомат|postomat/i.test(cat || '');
    return warehouses.filter(w => whType === 'postomat' ? isPostomat(w.category) : !isPostomat(w.category));
  }, [warehouses, whType]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      customer: { firstName, lastName, email, birthDate, phone },
      delivery: {
        provider: 'Nova Poshta',
        city: selectedCity?.name || '',
        cityRef: selectedCity?.ref || '',
        warehouse: selectedWh?.address || '',
        warehouseRef: selectedWh?.ref || '',
        type: whType,
        courierAddress: address,
      },
      items,
      total,
    };
    console.log('ORDER', payload);
    alert('Демо: заказ подготовлен, см. консоль.');
  };

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Оформлення замовлення</Typography>

        <Grid2 container spacing={3}>
          {/* Левая колонка: формы */}
          <Grid2 xs={12} md={7}>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <ToggleButtonGroup
                  value={tab}
                  exclusive
                  onChange={(_, v) => v && setTab(v)}
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="personal">Особисті дані</ToggleButton>
                  <ToggleButton value="delivery">Дані доставки</ToggleButton>
                </ToggleButtonGroup>

                {tab === 'personal' ? (
                  <Grid2 container spacing={2}>
                    <Grid2 xs={12} sm={6}>
                      <TextField fullWidth label="Імʼя" value={firstName} onChange={e=>setFirstName(e.target.value)} />
                    </Grid2>
                    <Grid2 xs={12} sm={6}>
                      <TextField fullWidth label="Прізвище" value={lastName} onChange={e=>setLastName(e.target.value)} />
                    </Grid2>
                    <Grid2 xs={12} sm={6}>
                      <TextField fullWidth type="email" label="E-mail" value={email} onChange={e=>setEmail(e.target.value)} />
                    </Grid2>
                    <Grid2 xs={12} sm={6}>
                      <TextField fullWidth type="date" label="Дата народження" InputLabelProps={{ shrink: true }} value={birthDate} onChange={e=>setBirthDate(e.target.value)} />
                    </Grid2>
                    <Grid2 xs={12} sm={6}>
                      <TextField fullWidth type="tel" label="Телефон" value={phone} onChange={e=>setPhone(e.target.value)} />
                    </Grid2>
                  </Grid2>
                ) : (
                  <Grid2 container spacing={2}>
                    <Grid2 xs={12}>
                      <Autocomplete
                        open={cityOpen}
                        onOpen={() => { setCityOpen(true); loadInitialCities(); }}
                        onClose={() => setCityOpen(false)}
                        openOnFocus
                        loading={cityLoading}
                        options={cityOptions}
                        value={selectedCity}
                        inputValue={cityInput}
                        onInputChange={(_, v) => { setCityInput(v); if (!v) setSelectedCity(null); }}
                        onChange={(_, val) => setSelectedCity(val)}
                        getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Місто (Нова Пошта)"
                            helperText={NP_KEY ? 'Почніть вводити назву міста' : '⚠️ Додайте NEXT_PUBLIC_NOVAPOSHTA_API_KEY у .env.local'}
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {cityLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid2>

                    <Grid2 xs={12}>
                      <ToggleButtonGroup
                        value={whType}
                        exclusive
                        onChange={(_, v) => v && setWhType(v)}
                        size="small"
                        sx={{ mb: 1 }}
                      >
                        <ToggleButton value="branch">Відділення</ToggleButton>
                        <ToggleButton value="postomat">Поштомат</ToggleButton>
                      </ToggleButtonGroup>

                      <Autocomplete
                        loading={whLoading}
                        options={filteredWh}
                        value={selectedWh}
                        onChange={(_, val) => setSelectedWh(val)}
                        getOptionLabel={(o) => (typeof o === 'string' ? o : o.address)}
                        disabled={!selectedCity}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={whType === 'postomat' ? 'Поштомат' : 'Відділення'}
                            helperText={!selectedCity ? 'Спочатку оберіть місто' : undefined}
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {whLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid2>

                    <Grid2 xs={12}>
                      <TextField
                        fullWidth
                        label="Адреса курʼєра (за потреби)"
                        placeholder="вул. Хрещатик, 1"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </Grid2>
                  </Grid2>
                )}

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" onClick={submit} disabled={items.length === 0}>Замовити</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid2>

          {/* Правая колонка: корзина */}
          <Grid2 xs={12} md={5}>
            <Card variant="outlined">
              <CardContent>
                {items.length === 0 ? (
                  <Typography color="text.secondary">тут будут ваши товары</Typography>
                ) : (
                  <>
                    <List disablePadding>
                      {items.map((it) => (
                        <React.Fragment key={String(it.id)}>
                          <ListItem
                            secondaryAction={
                              <IconButton edge="end" aria-label="remove" onClick={() => remove(it.id)}>
                                <CloseIcon />
                              </IconButton>
                            }
                          >
                            <Box sx={{ width: 56, height: 56, mr: 1, position: 'relative', flex: '0 0 auto' }}>
                              <Image src={it.image || '/placeholder.png'} alt={it.name} fill style={{ objectFit: 'contain' }} />
                            </Box>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                  <Typography sx={{ fontWeight: 600, pr: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</Typography>
                                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, border: '1px solid', borderColor: 'divider', borderRadius: 5, px: 1 }}>
                                    <IconButton size="small" onClick={() => dec(it.id)}><RemoveIcon fontSize="small" /></IconButton>
                                    <Typography variant="body2">{it.qty}</Typography>
                                    <IconButton size="small" onClick={() => inc(it.id)}><AddIcon fontSize="small" /></IconButton>
                                  </Box>
                                </Box>
                              }
                              secondary={<Typography sx={{ fontWeight: 700 }}>{(it.price * it.qty).toLocaleString('uk-UA')} ₴</Typography>}
                            />
                          </ListItem>
                          <Divider component="li" />
                        </React.Fragment>
                      ))}
                    </List>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography color="text.secondary">Підсумок</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{total.toLocaleString('uk-UA')} ₴</Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid2>
        </Grid2>
      </Box>
      <Footer />
    </>
  );
}
