/**
 * Etihad Plaza Hotel — Dining / Menu Screen
 * React Native TV App · Facilities-aligned type + slate bars · Full D-Pad Navigation
 *
 * Navigation layout:
 *   'sidebar'   – restaurant list  (UP/DOWN to move, OK to select)
 *   'tabs'      – Starters / Mains / Desserts / Drinks (LEFT/RIGHT, OK selects)
 *   'items'     – menu item list   (UP/DOWN to scroll, LEFT → back to sidebar)
 *
 * Remote key codes (Android TV):
 *   19 = UP | 20 = DOWN | 21 = LEFT | 22 = RIGHT | 23/66 = OK | 4 = BACK
 */

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Dimensions,
  DeviceEventEmitter, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';
import { AppHeader } from '../components/common/AppHeader';
import { useAppHeaderClock } from '../hooks/useAppHeaderClock';

const { width: SW, height: SH } = Dimensions.get('window');

/** Matches WelcomeScreen bottom nav / Hypermarket — venue strip & sidebar */
const BOTTOM_BAR_BG = 'rgba(40,52,62,0.88)';

/* ─── THEME (Facilities-aligned text + Etihad primary) ─────────────────────── */
const C = {
  bg: Colors.background.dark,
  surface: Colors.midnightDune[600],
  panel: Colors.midnightDune[600],
  gold: Colors.primary,
  goldLight: Colors.primaryLight,
  goldDim: Colors.overlay.gold[35],
  text: Colors.text.light,
  border: Colors.overlay.gold[15],
  borderDim: Colors.overlay.gold[8],
  focusBorder: Colors.overlay.gold[75],
  focusBg: Colors.overlay.gold[10],
  selectedBg: Colors.overlay.gold[12],
};

/* ─── SIDEBAR WIDTH ─────────────────────────────────────── */
const SIDEBAR_W = 280;
const CONTENT_W = SW - SIDEBAR_W;

/* ─── DATA ───────────────────────────────────────────────── */
const RESTAURANTS = [
  {
    id: 1, name: 'Pizza Di Rocco', emoji: '🍕',
    cuisine: 'Pizza, Pasta, Italian', floor: 'Khalifa City, Abu Dhabi',
    michelin: null, price: 'AED 180 for two',
    bgColors: ['#1A0D06', '#3C2010', '#0F0703'] as string[],
    heroImg: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
  },
  {
    id: 2, name: 'Coffee Planet', emoji: '☕',
    cuisine: 'Cafe, Coffee', floor: 'Khalifa City, Abu Dhabi',
    michelin: null, price: 'AED 95 for two',
    bgColors: ['#060E14', '#12263A', '#040810'] as string[],
    heroImg: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=80',
  },
  {
    id: 3, name: 'AL FAIR', emoji: '🥗',
    cuisine: 'Cafe, Coffee', floor: 'Khalifa City, Abu Dhabi',
    michelin: null, price: 'AED 95 for two',
    bgColors: ['#0A1410', '#182E22', '#060C0A'] as string[],
    heroImg: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
  },
  {
    id: 4, name: 'ROYAL GULF RESTAURANT', emoji: '🫕',
    cuisine: 'Gulf · Arabic', floor: 'Level 32 · Rooftop',
    michelin: '⭐⭐', price: 'AED 220–550',
    bgColors: ['#0E0D06', '#2A2610', '#080704'] as string[],
    heroImg: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80',
  },
];

type MenuItem = { name: string; desc: string; price: string; badge: string | null; img: string | null };
type MenuData = Record<string, MenuItem[]>;

const MENU: Record<string, MenuData> = {
  'Pizza Di Rocco': {
    Starters: [
      { name: 'Business Lunch',          desc: 'Any pizza of your choice + potato wedges or side salad. Dine-in Mon–Fri 12–3pm', price: 'AED 49',  badge: 'Popular', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=75' },
      { name: 'Create Your Own Pizza',  desc: 'Choice of sauce, flour & toppings. Pizzas start with base and sauce only.',   price: 'AED 38',  badge: null,     img: null },
      { name: 'Create Your Own Pasta',  desc: "Create your own pasta masterpiece! Choice of pasta and sauce.",              price: 'AED 48',  badge: null,     img: null },
      { name: 'Create Your Own Salad',  desc: 'Build your super salad with fresh ingredients and sauces.',                 price: 'AED 28',  badge: null,     img: null },
    ],
    Mains: [
      { name: 'Garlic & Herb (30ml)',       desc: 'Homemade creamy garlic and herb dip',                              price: 'AED 4',   badge: null, img: null },
      { name: 'Chipotle Mayo (30ml)',       desc: 'Spicy, tangy and delicious with almost anything! (E,G,V)',          price: 'AED 4',   badge: null, img: null },
      { name: "Rocco's Chili EVOO (30ml)",  desc: 'Homemade chili infused EVOO (G,G,V)',                              price: 'AED 5',   badge: null, img: null },
      { name: 'Sundried Tomato Marinara (30ml)', desc: 'Homemade with Italian sundried tomatoes, pine nuts & marinara (N)', price: 'AED 5', badge: null, img: null },
      { name: 'Buffalo Ranch (30ml)',       desc: 'Creamy Buffalo Ranch Dip (G,G,V)',                                 price: 'AED 4',   badge: null, img: null },
      { name: 'Smoky BBQ (30ml)',           desc: 'Smoky & sweet — delicious dipping sauce for all occasions!',       price: 'AED 3',   badge: null, img: null },
      { name: "Rocco's Basil Pesto (30ml)", desc: 'Classic basil pesto — perfect with pasta or bread (N)',            price: 'AED 5',   badge: null, img: null },
    ],
    Desserts: [
      { name: 'Pizza Lulu',                  desc: "Rocco's oven baked dough with Nutella and crushed nuts",           price: 'AED 32',  badge: "Chef's Pick", img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=75' },
      { name: 'Tiramisu',                    desc: "Homemade Tiramisu — Our Chef's special!",                         price: 'AED 26',  badge: 'Popular',    img: null },
      { name: 'Chocolate Fudge Brownie',     desc: 'Light textured, fudgy, chocolaty, super soft brownie',             price: 'AED 23',  badge: null,          img: null },
      { name: 'Banana Caramel Pudding',      desc: 'Creamy caramellised banana, custard cream, banana caramel sauce', price: 'AED 32',  badge: null,          img: null },
    ],
    Drinks: [
      { name: 'Al Ain (500ml)',          desc: 'Still water',                     price: 'AED 5',   badge: null, img: null },
      { name: 'Acqua Panna Small (250ml)', desc: 'Premium still water',           price: 'AED 10',  badge: null, img: null },
      { name: 'San Pellegrino Small (250ml)', desc: 'Sparkling mineral water',    price: 'AED 12',  badge: null, img: null },
      { name: 'Acqua Panna Large (750ml)', desc: 'Premium still water',            price: 'AED 18',  badge: null, img: null },
      { name: 'San Pellegrino Large (750ml)', desc: 'Sparkling mineral water',    price: 'AED 19',  badge: null, img: null },
      { name: 'Fresh Orange Juice',      desc: 'Freshly squeezed orange juice',    price: 'AED 19',  badge: null, img: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=75' },
      { name: 'Fresh Lemon & Mint',       desc: 'Freshly squeezed lemon with mint',price: 'AED 19',  badge: null, img: null },
      { name: 'Coca Cola',               desc: 'Classic Coca Cola',                price: 'AED 10',  badge: null, img: null },
      { name: 'Coca Cola Zero',          desc: 'Sugar-free Coca Cola',           price: 'AED 10',  badge: null, img: null },
      { name: 'Sprite',                  desc: 'Lemon-lime soft drink',            price: 'AED 10',  badge: null, img: null },
      { name: 'Sprite Zero',             desc: 'Sugar-free lemon-lime',           price: 'AED 10',  badge: null, img: null },
      { name: 'Fanta Orange',            desc: 'Orange flavoured soda',           price: 'AED 10',  badge: null, img: null },
    ],
  },
  'Coffee Planet': {
    Starters: [
      { name: 'Wagyu Beef Carpaccio',   desc: 'Paper-thin Wagyu, truffle oil, Parmesan shavings, capers, arugula',     price: 'AED 145', badge: "Chef's Pick", img: 'https://images.unsplash.com/photo-1615361200141-f45040f367be?w=400&q=75' },
      { name: 'Roasted Bone Marrow',    desc: 'Veal bone marrow, chimichurri, grilled sourdough, pickled red onion',   price: 'AED 115', badge: null,          img: null },
      { name: 'Shrimp Cocktail Tower',  desc: 'Jumbo tiger shrimp, Old Bay seasoning, house Marie Rose sauce',         price: 'AED 135', badge: 'Popular',     img: null },
    ],
    Mains: [
      { name: '45-Day Dry Aged Tomahawk',desc:'900g USDA prime, Josper-grilled, truffle bone marrow butter, frites',  price: 'AED 620', badge: 'Signature',    img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=75' },
      { name: 'Wagyu Tenderloin 250g',  desc: 'A5 Japanese Wagyu, sous vide 54°C, red wine jus, pomme purée',         price: 'AED 580', badge: 'Signature',    img: null },
      { name: 'Surf & Turf',            desc: '220g fillet, butter-poached half lobster, béarnaise, triple chips',    price: 'AED 495', badge: 'Popular',     img: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&q=75' },
      { name: 'Black Cod en Papillote', desc: 'Miso-marinated black cod, lemongrass, ginger, bok choy, dashi',        price: 'AED 285', badge: null,          img: null },
    ],
    Desserts: [
      { name: 'Valrhona Chocolate Fondant',desc:'72% dark chocolate, salted caramel core, vanilla bean ice cream',   price: 'AED 110', badge: 'Popular',     img: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&q=75' },
      { name: 'Crème Brûlée',           desc: 'Bourbon vanilla custard, caramelised sugar crust, fresh berries',      price: 'AED 85',  badge: null,          img: null },
    ],
    Drinks: [
      { name: 'Château Margaux 2018',   desc: 'Bordeaux blend — full-bodied, cedar & dark fruit, 45 min decant',      price: 'AED 2,400/btl', badge: 'Fine Wine', img: null },
      { name: 'Sommelier Pairing',      desc: 'Six glasses curated to match your full dinner progression',             price: 'AED 480 pp', badge: 'Popular',   img: null },
    ],
  },
  'Kōen': {
    Starters: [
      { name: 'Wagyu & Foie Gras Gyoza',desc: 'Pan-seared dumplings, Wagyu & foie filling, ponzu dipping sauce',     price: 'AED 145', badge: "Chef's Pick", img: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=400&q=75' },
      { name: 'Yellowtail Jalapeño',    desc: 'Hamachi sashimi, jalapeño, yuzu truffle oil, crispy garlic chips',     price: 'AED 175', badge: 'Popular',     img: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=75' },
    ],
    Mains: [
      { name: 'Omakase 18-Course',      desc: "Chef Yamamoto's full seasonal progression — sake pairing available",   price: 'AED 850', badge: 'Signature',    img: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=75' },
      { name: 'Otoro Nigiri (2pc)',     desc: 'Premium fatty tuna from Tsukiji, aged vinegared rice, Oscietra caviar',price: 'AED 280', badge: 'Signature',    img: null },
      { name: 'Wagyu Shabu-Shabu',      desc: 'A5 Wagyu thinly sliced, dashi broth, seasonal vegetables, ponzu',     price: 'AED 480', badge: "Chef's Pick", img: null },
      { name: 'Black Truffle Tonkotsu', desc: '72-hr pork broth, Périgord truffle shavings, chashu, quail egg',      price: 'AED 195', badge: 'Popular',     img: null },
    ],
    Desserts: [
      { name: 'Matcha Mille-Feuille',   desc: 'Ceremonial grade matcha cream, crispy puff pastry, red bean, gold dust',price:'AED 120', badge: 'Popular',    img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=75' },
    ],
    Drinks: [
      { name: 'Sake Pairing Flight',    desc: 'Four premium sakes curated to your meal — Junmai Daiginjo selection', price: 'AED 280', badge: 'Popular',     img: null },
      { name: 'Matcha Ceremony',        desc: 'Traditional whisked ceremonial matcha, house wagashi sweet',           price: 'AED 85',  badge: 'Ritual',      img: null },
    ],
  },
  'ROYAL GULF RESTAURANT': {
    Starters: [
      { name: 'Grilled Octopus',        desc: 'Charred octopus, chimichurri, potato confit, smoked paprika oil',      price: 'AED 155', badge: "Chef's Pick", img: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=75' },
      { name: 'Gamberi al Limone',      desc: 'Sautéed tiger prawns, garlic, white wine, lemon butter, crusty bread', price: 'AED 135', badge: 'Popular',     img: null },
    ],
    Mains: [
      { name: 'Whole Grilled Lobster',  desc: 'Atlantic lobster, cognac thermidor, gruyère gratin, saffron butter',  price: 'AED 490', badge: 'Signature',    img: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=75' },
      { name: 'Risotto al Tartufo',     desc: 'Carnaroli rice, Périgord truffle shavings, Parmigiano, aged butter',  price: 'AED 265', badge: 'Popular',     img: null },
      { name: 'Seafood Linguine',       desc: 'Clams, mussels, prawns, squid ink linguine, white wine, chili',       price: 'AED 225', badge: "Chef's Pick", img: null },
    ],
    Desserts: [
      { name: 'Tiramisu Classico',      desc: 'Espresso-soaked savoiardi, mascarpone cream, cocoa, dark rum',        price: 'AED 90',  badge: 'Popular',     img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=75' },
    ],
    Drinks: [
      { name: 'Aperol Spritz',          desc: 'Aperol, Prosecco, orange slice, soda — the perfect poolside aperitif',price: 'AED 75',  badge: 'Popular',     img: null },
      { name: 'Lebanese Arak',          desc: 'Served traditionally with water, ice and mezze platter',               price: 'AED 95',  badge: null,          img: null },
    ],
  },
  'Dusk Lounge': {
    Starters: [
      { name: 'Black Truffle Fries',    desc: 'Hand-cut frites, black truffle oil, aged Parmesan, rosemary salt, aioli',price:'AED 85', badge: 'Popular',    img: null },
      { name: 'Wagyu Mini Sliders',     desc: 'Three mini Wagyu patties, aged cheddar, caramelised onion, brioche bun',price:'AED 145', badge: "Chef's Pick",img: null },
    ],
    Mains: [
      { name: 'Wagyu Beef Burger',      desc: '200g Wagyu patty, aged cheddar, house sauce, truffle fries',           price: 'AED 185', badge: 'Popular',     img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=75' },
      { name: 'Cheese & Charcuterie',   desc: 'Five cheeses, cured meats, quince, grapes, honeycomb, crackers',       price: 'AED 195', badge: null,          img: null },
    ],
    Desserts: [
      { name: 'Churros & Chocolate',    desc: 'Crispy churros, 72% Valrhona dipping chocolate, cinnamon sugar',       price: 'AED 75',  badge: 'Popular',     img: null },
    ],
    Drinks: [
      { name: 'Arabian Nights Negroni', desc: 'Oud-smoked Campari, rose vermouth, Tanqueray, 24k gold flake',        price: 'AED 95',  badge: 'Signature',    img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=75' },
      { name: 'Desert Rose Spritz',     desc: 'Rosewater, elderflower, lime, sparkling water, fresh rose petals',    price: 'AED 65',  badge: 'Popular',     img: null },
      { name: 'Gulf Sunset Mocktail',   desc: 'Mango, passionfruit, orange, coconut water, hibiscus, crushed ice',   price: 'AED 70',  badge: null,          img: null },
    ],
  },
};

const TABS = ['Starters', 'Mains', 'Desserts', 'Drinks'] as const;
type Tab = typeof TABS[number];

const BADGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  'Signature':   { bg: Colors.overlay.gold[15],  color: Colors.primary,         border: Colors.overlay.gold[40] },
  "Chef's Pick": { bg: 'rgba(0,161,178,0.15)',  color: Colors.saadiyatBlue[300], border: 'rgba(0,161,178,0.4)' },
  'Popular':     { bg: Colors.overlay.gold[12],  color: Colors.primaryLight,     border: Colors.overlay.gold[35] },
  'New':         { bg: 'rgba(254,170,0,0.15)',   color: Colors.desertSunrise[400], border: 'rgba(254,170,0,0.4)' },
  'Fine Wine':   { bg: Colors.overlay.gold[10],   color: Colors.primaryLight,     border: Colors.overlay.gold[30] },
  'Ritual':      { bg: Colors.overlay.gold[10],   color: Colors.primary,          border: Colors.overlay.gold[30] },
};

type NavSection = 'sidebar' | 'tabs' | 'items';

export interface EtihadDiningScreenProps {
  onBack?: () => void;
  isActive?: boolean;
}

/* ─── BADGE ──────────────────────────────────────────────── */
function Badge({ label }: { label: string | null }) {
  if (!label) return null;
  const b = BADGE_STYLES[label] ?? BADGE_STYLES['Signature'];
  return (
    <View style={[s.badge, { backgroundColor: b.bg, borderColor: b.border }]}>
      <Text style={[s.badgeTxt, { color: b.color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

/* ─── GOLD RULE ──────────────────────────────────────────── */
function GoldRule() {
  return (
    <LinearGradient
      colors={['transparent', Colors.primary, Colors.primaryLight, Colors.primary, 'transparent']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={s.goldRule}
    />
  );
}

/* ─── MENU ITEM ROW ──────────────────────────────────────── */
const MenuItemRow = React.memo(function MenuItemRow({
  item, focused, isLast,
}: { item: MenuItem; focused: boolean; isLast: boolean }) {
  return (
    <View style={[s.menuItem, !isLast && s.menuItemBorder, focused && s.menuItemFocused]}>
      {item.img ? (
        <View style={s.itemImgWrap}>
          <Image source={{ uri: item.img }} style={s.itemImg} resizeMode="cover" />
          {focused && (
            <LinearGradient
              colors={[Colors.overlay.gold[20], 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
      ) : (
        <View style={[s.itemImgWrap, s.itemImgPlaceholder]}>
          <Text style={s.itemPlaceholderGlyph}>✦</Text>
        </View>
      )}

      <View style={s.itemBody}>
        <View style={s.itemNameRow}>
          <Text style={[s.itemName, focused && s.itemNameFocused]} numberOfLines={1}>
            {item.name}
          </Text>
          <Badge label={item.badge} />
        </View>
        <Text style={s.itemDesc} numberOfLines={2}>{item.desc}</Text>
      </View>

      <Text style={[s.itemPrice, focused && s.itemPriceFocused]}>{item.price}</Text>
    </View>
  );
});

/* ─── MAIN SCREEN ────────────────────────────────────────── */
export default function EtihadDiningScreen({ onBack, isActive = false }: EtihadDiningScreenProps) {
  const headerClock = useAppHeaderClock();

  /* ── state ── */
  const [navSection,  setNavSection]  = useState<NavSection>('sidebar');
  const [restIdx,     setRestIdx]     = useState(0);
  const [tabIdx,      setTabIdx]      = useState(0);
  const [itemIdx,     setItemIdx]     = useState(0);

  /* ── refs (avoid stale closures in event listener) ── */
  const navRef     = useRef<NavSection>('sidebar');
  const restRef    = useRef(0);
  const tabRef     = useRef(0);
  const itemRef    = useRef(0);
  const onBackRef  = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);

  const setNav  = useCallback((v: NavSection) => { navRef.current  = v; setNavSection(v);  }, []);
  const setRest = useCallback((v: number)      => { restRef.current = v; setRestIdx(v);     }, []);
  const setTab  = useCallback((v: number)      => { tabRef.current  = v; setTabIdx(v);      }, []);
  const setItem = useCallback((v: number)      => { itemRef.current = v; setItemIdx(v);     }, []);

  /* ── scroll refs ── */
  const sidebarScrollRef = useRef<ScrollView>(null);
  const menuScrollRef    = useRef<ScrollView>(null);

  /* ── derived ── */
  const rest     = RESTAURANTS[restIdx];
  const menuData = MENU[rest.name] ?? {};
  const activeTab = TABS[tabIdx] as Tab;
  const items     = menuData[activeTab] ?? [];

  /* ── reset item index when tab/restaurant changes ── */
  useEffect(() => { setItem(0); }, [restIdx, tabIdx]);

  /* ── auto-scroll sidebar to keep focused restaurant visible ── */
  useEffect(() => {
    sidebarScrollRef.current?.scrollTo({ y: restIdx * 110, animated: true });
  }, [restIdx]);

  /* ── auto-scroll menu list to keep focused item visible ── */
  useEffect(() => {
    if (navSection === 'items') {
      menuScrollRef.current?.scrollTo({ y: itemIdx * 120, animated: true });
    }
  }, [itemIdx, navSection]);

  /* ── reset on screen (de)activation ── */
  useEffect(() => {
    if (isActive) {
      setNav('sidebar'); setRest(0); setTab(0); setItem(0);
    }
  }, [isActive]);

  /* ── D-PAD HANDLER ── */
  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;

    const sub = DeviceEventEmitter.addListener('onKeyDown', (evt: { keyCode: number }) => {
      const kc  = evt.keyCode;
      const sec = navRef.current;

      /* BACK */
      if (kc === 4) { onBackRef.current?.(); return; }

      /* UP */
      if (kc === 19) {
        if (sec === 'sidebar') {
          setRest(Math.max(0, restRef.current - 1));
        } else if (sec === 'tabs') {
          // tabs → nothing above (stay)
        } else if (sec === 'items') {
          if (itemRef.current > 0) {
            setItem(itemRef.current - 1);
          } else {
            setNav('tabs'); // jump back to tabs when at top
          }
        }
      }

      /* DOWN */
      else if (kc === 20) {
        if (sec === 'sidebar') {
          setRest(Math.min(RESTAURANTS.length - 1, restRef.current + 1));
        } else if (sec === 'tabs') {
          setNav('items'); setItem(0);
        } else if (sec === 'items') {
          const maxIdx = (MENU[RESTAURANTS[restRef.current].name]?.[TABS[tabRef.current]] ?? []).length - 1;
          setItem(Math.min(maxIdx, itemRef.current + 1));
        }
      }

      /* LEFT */
      else if (kc === 21) {
        if (sec === 'tabs') {
          if (tabRef.current > 0) { setTab(tabRef.current - 1); }
          else { setNav('sidebar'); }
        } else if (sec === 'items') {
          setNav('tabs');
        }
      }

      /* RIGHT */
      else if (kc === 22) {
        if (sec === 'sidebar') {
          setNav('tabs');
        } else if (sec === 'tabs') {
          if (tabRef.current < TABS.length - 1) { setTab(tabRef.current + 1); }
          else { setNav('items'); setItem(0); }
        }
      }

      /* OK / SELECT */
      else if (kc === 23 || kc === 66) {
        if (sec === 'sidebar') {
          setNav('tabs'); setTab(0);
        } else if (sec === 'tabs') {
          setNav('items'); setItem(0);
        }
        // items: no action (view-only)
      }
    });

    return () => sub.remove();
  }, [isActive]);

  /* ─── RENDER ─────────────────────────────────────────── */
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <AppHeader
        date={headerClock.date}
        time={headerClock.time}
        temperature={headerClock.temperature}
        weatherCondition={headerClock.weatherCondition}
      />

      {/* ── HERO IMAGE ── */}
      <View style={s.heroWrap}>
        <Image key={rest.id} source={{ uri: rest.heroImg }} style={s.heroImg} resizeMode="cover" />
        <LinearGradient
          colors={[
            Colors.overlay.midnight[50],
            Colors.overlay.midnight[85],
            'transparent',
          ]}
          style={StyleSheet.absoluteFill}
        />
        {/* Hero overlay text */}
        <View style={s.heroOverlay}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.heroAccentLine}
          />
          <Text style={s.heroName}>{rest.name}</Text>
          <Text style={s.heroCuisine}>{rest.cuisine.toUpperCase()}</Text>
        </View>
      </View>

      {/* ── BODY: SIDEBAR + CONTENT ── */}
      <View style={s.body}>

        {/* ── SIDEBAR ── */}
        <View style={[s.sidebar, navSection === 'sidebar' && s.sidebarFocused]}>
          <View style={s.sidebarHeader}>
            <Text style={s.sidebarHeaderTxt}>VENUES</Text>
            <View style={s.sidebarHeaderLine} />
          </View>
          <ScrollView
            ref={sidebarScrollRef}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            scrollEventThrottle={16}
          >
            {RESTAURANTS.map((r, i) => {
              const active  = i === restIdx;
              const focused = navSection === 'sidebar' && i === restIdx;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => { setRest(i); setNav('tabs'); setTab(0); }}
                  activeOpacity={0.85}
                  focusable
                >
                  <View style={[
                    s.sidebarItem,
                    active  && s.sidebarItemActive,
                    focused && s.sidebarItemFocused,
                  ]}>
                    {active && (
                      <LinearGradient
                        colors={[Colors.overlay.gold[12], 'transparent']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text style={s.sidebarEmoji}>{r.emoji}</Text>
                    <View style={s.sidebarItemBody}>
                      <Text style={[s.sidebarName, (active || focused) && s.sidebarNameActive]}>
                        {r.name}
                      </Text>
                      <Text style={s.sidebarCuisine}>{r.cuisine.toUpperCase()}</Text>
                      {r.michelin && <Text style={s.sidebarMichelin}>{r.michelin}</Text>}
                    </View>
                    {focused && <View style={s.sidebarArrow}><Text style={s.sidebarArrowTxt}>›</Text></View>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Nav hint */}
          <View style={s.sidebarHint}>
            <GoldRule />
            <View style={s.hintRow}>
              <Text style={s.hintKey}>↕</Text><Text style={s.hintLabel}>Browse</Text>
              <Text style={s.hintKey}>›</Text><Text style={s.hintLabel}>Menu</Text>
            </View>
          </View>
        </View>

        {/* ── CONTENT ── */}
        <View style={s.content}>

          {/* ── MENU TABS ── */}
          <View style={[s.tabBar, navSection === 'tabs' && s.tabBarFocused]}>
            {TABS.map((tab, i) => {
              const active  = i === tabIdx;
              const focused = navSection === 'tabs' && i === tabIdx;
              const count   = (menuData[tab] ?? []).length;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => { setTab(i); setNav('items'); setItem(0); }}
                  activeOpacity={0.8}
                  focusable
                  style={[s.tabBtn, focused && s.tabBtnFocused]}
                >
                  <Text style={[s.tabLabel, (active || focused) && s.tabLabelActive]}>
                    {tab.toUpperCase()}
                  </Text>
                  <Text style={[s.tabCount, (active || focused) && { color: C.gold }]}>
                    {count} items
                  </Text>
                  {active && (
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryLight]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.tabLine}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── ITEM LIST ── */}
          <ScrollView
            ref={menuScrollRef}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            scrollEventThrottle={16}
            style={s.itemsList}
          >
            {items.map((item, i) => (
              <MenuItemRow
                key={item.name}
                item={item}
                focused={navSection === 'items' && i === itemIdx}
                isLast={i === items.length - 1}
              />
            ))}

            {/* Allergen note */}
            <View style={s.allergenBox}>
              <Text style={s.allergenIcon}>ℹ</Text>
              <Text style={s.allergenTxt}>
                Please inform your server of any allergies or dietary requirements.
                Our culinary team is happy to adapt any dish for you.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>

    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  /* GOLD RULE */
  goldRule: { height: 1 },

  /* HERO */
  heroWrap: { height: SH * 0.33, position: 'relative', overflow: 'hidden' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroAccentLine: { width: 28, height: 2, borderRadius: 1 },
  heroName: {
    fontFamily: FontFamily.book,
    fontSize: 24,
    color: C.text,
    letterSpacing: 0.4,
  },
  heroCuisine: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
    color: C.text,
  },

  /* BODY */
  body: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  /* SIDEBAR */
  sidebar: {
    width: SIDEBAR_W,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    backgroundColor: BOTTOM_BAR_BG,
    flexDirection: 'column',
  },
  sidebarFocused: {
    borderRightColor: 'rgba(255,255,255,0.14)',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sidebarHeaderTxt: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: C.text,
  },
  sidebarHeaderLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 14,
    position: 'relative',
  },
  sidebarItemActive: {
    borderLeftColor: C.gold,
  },
  sidebarItemFocused: {
    borderLeftColor: C.gold,
    backgroundColor: C.focusBg,
  },
  sidebarEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  sidebarItemBody: { flex: 1 },
  sidebarName: {
    fontFamily: FontFamily.book,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  sidebarNameActive: { fontFamily: FontFamily.text, color: C.text },
  sidebarCuisine: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
    color: C.text,
  },
  sidebarMichelin: { fontSize: 11, marginTop: 4 },
  sidebarArrow: {
    width: 22,
    height: 22,
    backgroundColor: C.gold,
    borderRadius: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarArrowTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 14,
    color: Colors.button.primaryText,
    textAlign: 'center',
    includeFontPadding: false,
    /* EtihadAltis › sits slightly high in the em-box; nudge down for optical center */
    ...(Platform.OS === 'android' ? { marginTop: 2 } : {}),
  },
  sidebarHint: { paddingTop: 2, paddingBottom: 14 },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
  },
  hintKey: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: C.gold,
    backgroundColor: Colors.overlay.gold[12],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.overlay.gold[35],
  },
  hintLabel: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: C.text,
    marginRight: 8,
  },

  /* CONTENT */
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
  },

  /* TABS */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: BOTTOM_BAR_BG,
  },
  tabBarFocused: { borderBottomColor: C.focusBorder },
  tabBtn: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    position: 'relative',
  },
  tabBtnFocused: { backgroundColor: C.focusBg },
  tabLabel: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 2,
  },
  tabLabelActive: { fontFamily: FontFamily.text, color: C.text },
  tabCount: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    color: C.text,
  },
  tabLine: {
    position: 'absolute',
    bottom: -1, left: 20, right: 20,
    height: 2,
  },

  /* SECTION LABEL */
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  sectionLabelLine: { width: 24, height: 1, backgroundColor: C.gold, opacity: 0.6 },
  sectionLabelTxt: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: C.text,
  },
  sectionLabelLineLong: { flex: 1, height: 1, backgroundColor: C.borderDim },

  /* ITEMS LIST */
  itemsList: { flex: 1, paddingHorizontal: 32 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 20,
    borderRadius: 3,
    paddingHorizontal: 8,
    marginVertical: 1,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.borderDim },
  menuItemFocused: {
    backgroundColor: Colors.overlay.gold[6],
    borderWidth: 1,
    borderColor: Colors.overlay.gold[35],
    borderRadius: 3,
  },
  itemImgWrap: {
    width: 100,
    height: 72,
    borderRadius: 3,
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemImgPlaceholder: {
    backgroundColor: Colors.overlay.gold[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderGlyph: {
    fontFamily: FontFamily.book,
    fontSize: 28,
    color: C.text,
  },
  itemImg: { width: '100%', height: '100%' },
  itemBody: { flex: 1 },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 7,
  },
  itemName: {
    fontFamily: FontFamily.book,
    fontSize: 13,
    lineHeight: 18,
    color: C.text,
    letterSpacing: 0.2,
  },
  itemNameFocused: { fontFamily: FontFamily.text, color: C.text },
  itemDesc: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    color: C.text,
  },
  itemPrice: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: C.gold,
    letterSpacing: 0.3,
    minWidth: 110,
    textAlign: 'right',
  },
  itemPriceFocused: { color: C.goldLight },

  /* BADGE */
  badge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 7.5,
    letterSpacing: 1.2,
  },

  /* ALLERGEN */
  allergenBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    marginTop: 20,
    marginBottom: 28,
    backgroundColor: Colors.overlay.gold[5],
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 2,
    padding: 14,
  },
  allergenIcon: { fontSize: 12, color: C.text, marginTop: 1 },
  allergenTxt: {
    fontFamily: FontFamily.book,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: C.text,
    letterSpacing: 0.2,
  },
});


