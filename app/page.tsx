/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useMemo, useState } from "react";

type Cocktail = {
  id:string; name:string; englishName:string; bar:string; city:string; story:string; ingredients:string[];
  recipe:string[]; taste:string; strength:string; minutes:number; image:string; price:number; rank?:number;
};
type CartItem = { drink:Cocktail; quantity:number };
type OrderReceipt = { id:string; code:string; total:number; status:string };
type OrderHistory = OrderReceipt & { tableName:string; items:Array<{id:string;name:string;price:number}>; createdAt:number };

const statusText:Record<string,string> = {new:"已接单",making:"调制中",ready:"可以取酒",completed:"已完成",cancelled:"已取消"};
const baseOptions = ["全部基酒","金酒","威士忌","朗姆","伏特加","龙舌兰","白兰地"];
const tasteOptions = ["全部风味","清爽","酸甜","果香","苦甜","气泡","醇厚","奶香"];
const strengthOptions = ["全部酒精度","轻盈","中等","偏浓"];

function matchesBase(drink:Cocktail,base:string){
  if(base==="全部基酒") return true;
  const ingredients=drink.ingredients.join(" ");
  if(base==="白兰地") return /白兰地|干邑/.test(ingredients);
  return ingredients.includes(base);
}

export default function Home() {
  const [menu,setMenu] = useState<Cocktail[]>([]);
  const [loading,setLoading] = useState(true);
  const [publishedAt,setPublishedAt] = useState(0);
  const [featuredIds,setFeaturedIds] = useState<string[]>([]);
  const [active,setActive] = useState<Cocktail|null>(null);
  const [cart,setCart] = useState<CartItem[]>([]);
  const [cartOpen,setCartOpen] = useState(false);
  const [guestName,setGuestName] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [receipt,setReceipt] = useState<OrderReceipt|null>(null);
  const [historyOpen,setHistoryOpen] = useState(false);
  const [historyLoading,setHistoryLoading] = useState(false);
  const [orderHistory,setOrderHistory] = useState<OrderHistory[]>([]);
  const [favorites,setFavorites] = useState<string[]>([]);
  const [favoriteOnly,setFavoriteOnly] = useState(false);
  const [search,setSearch] = useState("");
  const [baseFilter,setBaseFilter] = useState("全部基酒");
  const [tasteFilter,setTasteFilter] = useState("全部风味");
  const [strengthFilter,setStrengthFilter] = useState("全部酒精度");

  useEffect(() => {
    fetch("/api/menu", { cache:"no-store" }).then((response) => response.json()).then((data) => {
      setMenu(data.cocktails || []); setFeaturedIds(data.featuredIds || []); setPublishedAt(data.publishedAt || 0); setLoading(false);
    }).catch(() => { setMessage("今晚酒单读取失败，请稍后刷新"); setLoading(false); });
  },[]);

  useEffect(()=>{
    try{const saved=JSON.parse(window.localStorage.getItem("vhb_favorites")||"[]");if(Array.isArray(saved))setFavorites(saved.map(String));}catch{setFavorites([]);}
  },[]);

  const count = cart.reduce((sum,item) => sum + item.quantity,0);
  const total = cart.reduce((sum,item) => sum + item.drink.price * item.quantity,0);
  const filteredMenu = useMemo(()=>menu.filter((drink)=>{
    const keyword=search.trim().toLowerCase();
    const searchable=`${drink.name} ${drink.englishName} ${drink.bar} ${drink.taste} ${drink.ingredients.join(" ")}`.toLowerCase();
    return (!keyword||searchable.includes(keyword))&&matchesBase(drink,baseFilter)&&(tasteFilter==="全部风味"||drink.taste.includes(tasteFilter))&&(strengthFilter==="全部酒精度"||drink.strength===strengthFilter)&&(!favoriteOnly||favorites.includes(drink.id));
  }),[menu,search,baseFilter,tasteFilter,strengthFilter,favoriteOnly,favorites]);
  const featuredMenu = useMemo(()=>featuredIds.map((id)=>menu.find((drink)=>drink.id===id)).filter((drink):drink is Cocktail=>Boolean(drink)).slice(0,5),[featuredIds,menu]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 5 ? "晚上好" : "今天好";
  },[]);

  function add(drink:Cocktail) {
    setCart((items) => {
      const current = items.find((item) => item.drink.id === drink.id);
      return current ? items.map((item) => item.drink.id === drink.id ? {...item,quantity:item.quantity+1}:item) : [...items,{drink,quantity:1}];
    });
    setActive(null); setMessage(`${drink.name} 已加入点单`);
    window.setTimeout(() => setMessage(""),1800);
  }

  function change(id:string,delta:number) {
    setCart((items) => items.map((item) => item.drink.id === id ? {...item,quantity:item.quantity+delta}:item).filter((item) => item.quantity > 0));
  }

  function toggleFavorite(id:string){
    setFavorites((items)=>{
      const next=items.includes(id)?items.filter((item)=>item!==id):[...items,id];
      window.localStorage.setItem("vhb_favorites",JSON.stringify(next));
      return next;
    });
  }

  function recommendDrink(){
    const pool=filteredMenu.length?filteredMenu:menu;
    if(!pool.length){setMessage("今晚暂时没有可推荐的酒");return;}
    const drink=pool[Math.floor(Math.random()*pool.length)];
    setActive(drink);setMessage(`根据你的筛选，推荐 ${drink.name}`);window.setTimeout(()=>setMessage(""),2200);
  }

  async function openHistory(){
    setHistoryOpen(true);setHistoryLoading(true);
    const response=await fetch("/api/orders",{cache:"no-store"}).catch(()=>null);
    const data=response?await response.json():{orders:[]};
    if(response?.ok)setOrderHistory(data.orders||[]);else setMessage(data.error||"订单记录读取失败");
    setHistoryLoading(false);
  }

  function reorder(order:OrderHistory){
    const quantities=new Map<string,number>();
    order.items.forEach((item)=>quantities.set(item.id,(quantities.get(item.id)||0)+1));
    const available=menu.filter((drink)=>quantities.has(drink.id)).map((drink)=>({drink,quantity:quantities.get(drink.id)||1}));
    if(!available.length){setMessage("这笔订单里的酒今晚暂未上架");return;}
    setCart(available);setHistoryOpen(false);setCartOpen(true);setMessage(`已加入 ${available.length} 款曾点酒款`);
  }

  async function submitOrder() {
    if (!cart.length || busy) return;
    setBusy(true);
    const items = cart.flatMap((item) => Array.from({length:item.quantity},() => ({id:item.drink.id})));
    const response = await fetch("/api/orders", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({tableName:guestName.trim() || "深夜客厅",items}) }).catch(() => null);
    const data = response ? await response.json() : {error:"网络连接失败"};
    if (response?.ok) { setReceipt(data.order); setCart([]); setCartOpen(false); setOrderHistory([]); }
    else setMessage(data.error || "点单失败，请重试");
    setBusy(false);
  }

  return <main className="storefront">
    <header className="store-header">
      <a className="store-brand" href="/"><img src="/vhb-logo.png" alt="VHB Vincent's Homebar"/><span><b>VHB</b><small>VINCENT’S HOMEBAR</small></span></a>
      <div className="store-actions"><a href="/login" className="user-login">微信登录</a><button className="history-button" onClick={()=>void openHistory()}>我的订单</button><button className="bag-button" onClick={() => setCartOpen(true)}><span>我的点单</span><i>{count}</i></button></div>
    </header>

    <section className="store-hero">
      <div className="store-hero-copy"><span className="eyebrow"><i/> TONIGHT AT VHB</span><p className="hello">{greeting}，欢迎回家。</p><h1>今晚想喝<br/><em>哪一杯？</em></h1><p className="hero-lead">今日材料由主理人确认，下面每一杯都可以现在点。</p><a href="#menu">看看今晚酒单 <span>↓</span></a></div>
      <div className="store-photo"><img src="https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1500&q=88" alt="暖色 Homebar 吧台"/><div className="tonight-count"><span>今晚可点</span><strong>{menu.length}<small>款</small></strong></div><div className="home-note">NOT A BAR.<br/><b>JUST OUR PLACE.</b></div></div>
    </section>

    <section className="today-menu" id="menu">
      {featuredMenu.length>0&&<section className="featured-menu"><header><span>VINCENT’S PICKS</span><h2>主理人今晚推荐</h2><p>不知道喝什么，就从这几杯开始。</p></header><div className="featured-customer-grid">{featuredMenu.map((drink,index)=><article key={drink.id}><button className="featured-photo" onClick={()=>setActive(drink)}><img src={drink.image} alt={drink.name}/><span>0{index+1}</span></button><div><button onClick={()=>setActive(drink)}><small>{drink.taste}</small><b>{drink.name}</b></button><button className={favorites.includes(drink.id)?"favorite active":"favorite"} onClick={()=>toggleFavorite(drink.id)} aria-label={`${favorites.includes(drink.id)?"取消收藏":"收藏"}${drink.name}`}>{favorites.includes(drink.id)?"♥":"♡"}</button></div></article>)}</div></section>}
      <header className="menu-heading"><div><span>TONIGHT’S MENU</span><h2>今晚酒单</h2><p>{publishedAt ? `${new Date(publishedAt).toLocaleDateString("zh-CN",{month:"long",day:"numeric"})} · 主理人已更新` : "主理人正在准备今晚酒单"}</p></div><small>点击酒款查看配方与风味</small></header>
      <div className="menu-tools"><label className="menu-search"><span>⌕</span><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="搜索酒名、风味或材料"/></label><div className="menu-filters"><select value={baseFilter} onChange={(event)=>setBaseFilter(event.target.value)} aria-label="按基酒筛选">{baseOptions.map((item)=><option key={item}>{item}</option>)}</select><select value={tasteFilter} onChange={(event)=>setTasteFilter(event.target.value)} aria-label="按风味筛选">{tasteOptions.map((item)=><option key={item}>{item}</option>)}</select><select value={strengthFilter} onChange={(event)=>setStrengthFilter(event.target.value)} aria-label="按酒精度筛选">{strengthOptions.map((item)=><option key={item}>{item}</option>)}</select><button className={favoriteOnly?"filter-favorite active":"filter-favorite"} onClick={()=>setFavoriteOnly((value)=>!value)}>♥ 只看收藏</button><button className="surprise-button" onClick={recommendDrink}>帮我选一杯 ✦</button></div><small>找到 {filteredMenu.length} / {menu.length} 款</small></div>
      {loading ? <div className="menu-empty">正在把今晚的酒摆上桌…</div> : menu.length === 0 ? <div className="menu-empty"><b>今晚酒单准备中</b><span>主理人发布后，这里会自动出现可以点的酒。</span></div> : filteredMenu.length===0?<div className="menu-empty"><b>没有找到合适的酒</b><span>换一个关键词或取消部分筛选试试。</span></div>:<div className="menu-grid">{filteredMenu.map((drink,index) => <article className="menu-card" key={drink.id}><button className="card-photo" onClick={() => setActive(drink)}><img src={drink.image} alt={drink.name}/><span>{String(index+1).padStart(2,"0")}</span>{drink.rank && <i>50 BEST #{drink.rank}</i>}</button><button className={favorites.includes(drink.id)?"card-favorite active":"card-favorite"} onClick={()=>toggleFavorite(drink.id)} aria-label={`${favorites.includes(drink.id)?"取消收藏":"收藏"}${drink.name}`}>{favorites.includes(drink.id)?"♥":"♡"}</button><div className="card-copy"><button onClick={() => setActive(drink)}><small>{drink.englishName}</small><h3>{drink.name}</h3><p>{drink.taste} · {drink.strength}</p></button><div><strong>¥{drink.price}</strong><button className="quick-add" onClick={() => add(drink)} aria-label={`点一杯${drink.name}`}>＋</button></div></div></article>)}</div>}
    </section>

    <section className="store-footer"><div><img src="/vhb-logo.png" alt="VHB"/><span><b>VHB</b><small>DRINKS · MUSIC · FRIENDS</small></span></div><p>深圳大学对面的深夜客厅。<br/>仅面向成年人 · 理性饮酒 · 喝酒不开车</p><a href="/login?mode=admin&returnTo=/admin">主理人入口</a></section>

    {active && <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setActive(null)}><article className="drink-modal"><button className="close" onClick={() => setActive(null)}>×</button><div className="drink-modal-photo"><img src={active.image} alt={active.name}/><span>{active.bar} · {active.city}</span></div><div className="drink-modal-copy"><div className="modal-heading-row"><span className="eyebrow">VHB TONIGHT</span><button className={favorites.includes(active.id)?"modal-favorite active":"modal-favorite"} onClick={()=>toggleFavorite(active.id)}>{favorites.includes(active.id)?"♥ 已收藏":"♡ 收藏"}</button></div><h2>{active.name}</h2><p className="modal-english">{active.englishName}</p><p className="modal-story">{active.story}</p><div className="drink-meta"><span>{active.taste}</span><span>{active.strength}</span><span>{active.minutes} 分钟</span></div><h4>这一杯有什么</h4><p className="ingredient-line">{active.ingredients.join(" · ")}</p><div className="modal-buy"><strong>¥{active.price}</strong><button onClick={() => add(active)}>点这一杯 <span>＋</span></button></div></div></article></div>}

    {cartOpen && <><button className="drawer-shade" onClick={() => setCartOpen(false)} aria-label="关闭点单"/><aside className="order-drawer"><button className="close" onClick={() => setCartOpen(false)}>×</button><span className="eyebrow">YOUR ORDER</span><h2>我的点单</h2>{cart.length === 0 ? <div className="cart-empty"><span>○</span><b>还没选酒</b><small>去今晚酒单里看看吧</small></div> : <><div className="cart-list">{cart.map((item) => <div className="cart-line" key={item.drink.id}><img src={item.drink.image} alt=""/><div><b>{item.drink.name}</b><small>¥{item.drink.price}</small></div><div className="quantity"><button onClick={() => change(item.drink.id,-1)}>−</button><span>{item.quantity}</span><button onClick={() => change(item.drink.id,1)}>＋</button></div></div>)}</div><label className="guest-name">怎么称呼你 / 座位<input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="例如：Vincent · 沙发 01"/></label><div className="cart-sum"><span>合计 · {count} 杯</span><strong>¥{total}</strong></div><button className="submit-order" onClick={submitOrder} disabled={busy}>{busy?"正在提交…":"确认点单"}<span>→</span></button><small className="order-note">点单后可实时查看调制进度</small></>}</aside></>}

    {historyOpen&&<><button className="drawer-shade" onClick={()=>setHistoryOpen(false)} aria-label="关闭我的订单"/><aside className="order-drawer history-drawer"><button className="close" onClick={()=>setHistoryOpen(false)}>×</button><span className="eyebrow">ORDER HISTORY</span><h2>我的订单</h2>{historyLoading?<div className="cart-empty"><b>正在读取订单…</b></div>:orderHistory.length===0?<div className="cart-empty"><span>○</span><b>还没有点单记录</b><small>完成第一笔点单后会保存在这里</small></div>:<div className="history-list">{orderHistory.map((order)=><article key={order.id}><header><div><span>#{order.code}</span><small>{new Date(order.createdAt).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</small></div><b className={`order-status ${order.status}`}>{statusText[order.status]||order.status}</b></header><div className="history-items">{order.items.map((item,index)=><span key={`${item.id}-${index}`}>{item.name}</span>)}</div><footer><strong>¥{order.total}</strong><div><button onClick={()=>reorder(order)}>再次点单</button><a href={`/order/${order.id}`}>查看进度 →</a></div></footer></article>)}</div>}</aside></>}

    {receipt && <div className="overlay"><article className="receipt-modal"><span className="receipt-check">✓</span><p>主理人已经收到</p><h2>点单成功</h2><div><span>取单号</span><strong>{receipt.code}</strong></div><a href={`/order/${receipt.id}`}>查看调制进度 <span>→</span></a><button onClick={() => setReceipt(null)}>继续看看</button></article></div>}
    {message && <div className="site-toast">{message}</div>}
  </main>;
}
