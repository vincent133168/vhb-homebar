"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Order = { id:string; code:string; tableName:string; items:Array<{id:string;name:string;price:number}>; total:number; status:string; createdAt:number };
type Drink = { id:string; name:string; englishName:string; bar:string; city:string; category:string; price:number; image:string; ingredients:string[]; recipe:string[]; taste:string; strength:string; minutes:number; story:string; rank?:number; sourceUrl?:string; measureCount?:number };
type RecipeDraft = { name:string; englishName:string; bar:string; city:string; sourceUrl:string; story:string; taste:string; strength:string; minutes:number; price:number; ingredients:string[]; measures:string[]; steps:string[] };
type MatchDrink = Drink & { image:string; ingredients:string[]; taste:string; missing:string[]; matchedCount:number; score:number; ready:boolean };
type IngredientOption = { name:string; count:number; custom:boolean };
type TodayState = { ingredients:string[]; publishedIds:string[]; featuredIds:string[]; published:MatchDrink[]; matches:MatchDrink[]; ingredientOptions:IngredientOption[]; publishedAt:number };

const statusText: Record<string,string> = { new:"新订单",making:"调制中",ready:"可取酒",completed:"已完成",cancelled:"已取消" };
const emptyToday:TodayState = {ingredients:[],publishedIds:[],featuredIds:[],published:[],matches:[],ingredientOptions:[],publishedAt:0};

function splitRecipe(drink:Drink) {
  const measureCount=drink.measureCount??((drink.category==="classic"||drink.category==="topbar")?drink.ingredients.length:0);
  return measureCount>0
    ? {measures:drink.recipe.slice(0,measureCount),steps:drink.recipe.slice(measureCount)}
    : {measures:drink.ingredients,steps:drink.recipe};
}

export default function AdminDashboard({ userName }: { userName:string }) {
  const [tab,setTab] = useState<"today"|"orders"|"menu"|"backup">("today");
  const [orders,setOrders] = useState<Order[]>([]);
  const [drinks,setDrinks] = useState<Drink[]>([]);
  const [today,setToday] = useState<TodayState>(emptyToday);
  const [ingredients,setIngredients] = useState<string[]>([]);
  const [selectedIds,setSelectedIds] = useState<string[]>([]);
  const [featuredIds,setFeaturedIds] = useState<string[]>([]);
  const [activeRecipe,setActiveRecipe] = useState<Drink|null>(null);
  const [isEditingRecipe,setIsEditingRecipe] = useState(false);
  const [customIngredient,setCustomIngredient] = useState("");
  const [search,setSearch] = useState("");
  const [busy,setBusy] = useState("");
  const [notice,setNotice] = useState("");

  async function refresh() {
    const [ordersResponse,drinksResponse,todayResponse] = await Promise.all([fetch("/api/admin/orders"),fetch("/api/admin/cocktails"),fetch("/api/admin/today-menu")]);
    if ([ordersResponse,drinksResponse,todayResponse].some((response) => response.status === 403)) { window.location.href="/login?mode=admin&returnTo=/admin"; return; }
    if (ordersResponse.ok) setOrders((await ordersResponse.json()).orders);
    if (drinksResponse.ok) setDrinks((await drinksResponse.json()).cocktails);
    if (todayResponse.ok) {
      const data = await todayResponse.json() as TodayState;
      setToday(data); setIngredients(data.ingredients); setSelectedIds(data.publishedIds); setFeaturedIds(data.featuredIds);
    }
  }

  useEffect(() => { const initial=window.setTimeout(()=>void refresh(),0); const timer=window.setInterval(async()=>{const response=await fetch("/api/admin/orders");if(response.ok)setOrders((await response.json()).orders);},15000); return()=>{window.clearTimeout(initial);window.clearInterval(timer);}; },[]);

  function flash(text:string){setNotice(text);window.setTimeout(()=>setNotice(""),2600);}
  function toggleIngredient(name:string){setIngredients((items)=>items.includes(name)?items.filter((item)=>item!==name):[...items,name]);}
  async function addIngredient(){
    const value=customIngredient.trim();
    if(!value||busy==="ingredient") return;
    setIngredients((items)=>items.includes(value)?items:[...items,value]);
    setToday((state)=>{
      const existing=state.ingredientOptions.find((item)=>item.name===value);
      return {...state,ingredientOptions:[{name:value,count:existing?.count||0,custom:true},...state.ingredientOptions.filter((item)=>item.name!==value)]};
    });
    setCustomIngredient("");
    setBusy("ingredient");
    const response=await fetch("/api/admin/today-menu",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add-ingredient",ingredient:value})});
    const data=await response.json();
    if(response.ok){setToday(data);setIngredients(data.ingredients);flash(`${value} 已加入候选材料`);}else flash(data.error||"添加材料失败");
    setBusy("");
  }

  async function deleteIngredient(name:string){
    if(!window.confirm(`确定删除候选材料“${name}”吗？`)) return;
    setBusy(`delete:${name}`);
    const response=await fetch("/api/admin/today-menu",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete-ingredient",ingredient:name})});
    const data=await response.json();
    if(response.ok){setToday(data);setIngredients(data.ingredients);flash(`${name} 已从候选区删除`);}else flash(data.error||"删除材料失败");
    setBusy("");
  }

  async function matchMenu(){
    setBusy("match");
    const response=await fetch("/api/admin/today-menu",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"match",ingredients})});
    const data=await response.json();
    if(response.ok){setToday(data);setIngredients(data.ingredients);const ready=(data.matches as MatchDrink[]).filter((item)=>item.ready).map((item)=>item.id);setSelectedIds(ready);flash(`已检查全部 ${data.matches.length} 款，${ready.length} 款现在可调`);}else flash(data.error||"匹配失败");
    setBusy("");
  }

  async function publishMenu(){
    setBusy("publish");
    const response=await fetch("/api/admin/today-menu",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"publish",selectedIds})});
    const data=await response.json();
    if(response.ok){setToday(data);setSelectedIds(data.publishedIds);setFeaturedIds(data.featuredIds);flash(`已同步 ${data.publishedIds.length} 款酒到顾客端`);}else flash(data.error||"发布失败");
    setBusy("");
  }

  function toggleFeatured(id:string){
    if(!featuredIds.includes(id)&&featuredIds.length>=5){flash("主理人推荐最多选择 5 款");return;}
    setFeaturedIds((ids)=>ids.includes(id)?ids.filter((item)=>item!==id):[...ids,id]);
  }

  async function saveFeatured(){
    setBusy("feature");
    const response=await fetch("/api/admin/today-menu",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"feature",selectedIds:featuredIds})});
    const data=await response.json();
    if(response.ok){setToday(data);setFeaturedIds(data.featuredIds);flash(`已设置 ${data.featuredIds.length} 款主理人推荐`);}else flash(data.error||"保存推荐失败");
    setBusy("");
  }

  async function updateStatus(id:string,status:string){setBusy(id);const response=await fetch("/api/admin/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});if(response.ok)setOrders((items)=>items.map((item)=>item.id===id?{...item,status}:item));setBusy("");}
  async function updatePrice(id:string,price:number){setBusy(id);const response=await fetch("/api/admin/cocktails",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,price})});if(response.ok){setDrinks((items)=>items.map((item)=>item.id===id?{...item,price}:item));flash("价格已同步到顾客端");}setBusy("");}
  function openRecipe(drink:Drink){setActiveRecipe(drink);setIsEditingRecipe(false);}
  function closeRecipe(){if(isEditingRecipe&&!window.confirm("放弃未保存的修改吗？"))return;setIsEditingRecipe(false);setActiveRecipe(null);}

  async function updateCocktail(drink:Drink,draft:RecipeDraft,image:File|null){
    setBusy(`edit-drink:${drink.id}`);
    const body=new FormData();
    body.set("id",drink.id);
    Object.entries(draft).forEach(([key,value])=>body.set(key,Array.isArray(value)?JSON.stringify(value):String(value)));
    if(image) body.set("image",image);
    const response=await fetch("/api/admin/cocktails",{method:"PATCH",body});
    const data=await response.json();
    if(response.ok){const updated=data.cocktail as Drink;setDrinks((items)=>items.map((item)=>item.id===updated.id?updated:item));setActiveRecipe(updated);setIsEditingRecipe(false);await refresh();flash(`${updated.name} 的配方已同步更新`);}else flash(data.error||"配方保存失败");
    setBusy("");
  }

  async function deleteCocktail(drink:Drink){
    if(!window.confirm(`确定永久删除“${drink.name}”吗？\n删除后将同时从今日酒单移除，且无法撤销。`)) return;
    setBusy(`delete-drink:${drink.id}`);
    const response=await fetch("/api/admin/cocktails",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:drink.id})});
    const data=await response.json();
    if(response.ok){setIsEditingRecipe(false);setActiveRecipe(null);await refresh();flash(`${drink.name} 已从配方库删除`);}else flash(data.error||"删除配方失败");
    setBusy("");
  }

  async function uploadCocktail(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy("upload");
    const form=event.currentTarget;const response=await fetch("/api/cocktails",{method:"POST",body:new FormData(form)});const data=await response.json();
    if(response.ok){form.reset();await refresh();flash(`${data.cocktail.name} 已加入配方库`);}else flash(data.error||"上传失败");setBusy("");
  }

  async function downloadBackup(){
    if(busy==="backup") return;
    setBusy("backup");
    flash("正在整理配方、订单和图片，请稍候…");
    const response=await fetch("/api/admin/backup",{cache:"no-store"}).catch(()=>null);
    if(!response){flash("备份生成失败，请检查网络后重试");setBusy("");return;}
    if(response.status===403){window.location.href="/login?mode=admin&returnTo=/admin";return;}
    if(!response.ok){const data=await response.json().catch(()=>({error:"备份生成失败"}));flash(data.error||"备份生成失败");setBusy("");return;}
    const blob=await response.blob();
    const disposition=response.headers.get("Content-Disposition")||"";
    const fileName=disposition.match(/filename="([^"]+)"/)?.[1]||`VHB-migration-backup-${new Date().toISOString().slice(0,10)}.json`;
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    flash("迁移备份已下载，请妥善保存在私人设备");
    setBusy("");
  }

  const filteredDrinks=useMemo(()=>drinks.filter((drink)=>`${drink.name} ${drink.englishName} ${drink.bar}`.toLowerCase().includes(search.toLowerCase())),[drinks,search]);
  const drinkById=useMemo(()=>new Map(drinks.map((drink)=>[drink.id,drink])),[drinks]);
  const openOrders=orders.filter((order)=>!["completed","cancelled"].includes(order.status));
  const revenue=orders.filter((order)=>order.status!=="cancelled").reduce((sum,order)=>sum+order.total,0);
  const readyMatches=today.matches.filter((item)=>item.ready);
  const oneMissingMatches=today.matches.filter((item)=>item.missing.length===1);
  const farMatches=today.matches.filter((item)=>item.missing.length>=2);
  const activeRecipeParts=activeRecipe?splitRecipe(activeRecipe):null;

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-logo" href="/"><img src="/vhb-logo.png" alt="VHB"/><span><b>VHB</b><small>管理后台</small></span></Link>
      <nav><button className={tab==="today"?"active":""} onClick={()=>setTab("today")}><span>✦</span>今日酒单<i>{today.publishedIds.length}</i></button><button className={tab==="orders"?"active":""} onClick={()=>setTab("orders")}><span>◫</span>订单管理<i>{openOrders.length}</i></button><button className={tab==="menu"?"active":""} onClick={()=>setTab("menu")}><span>◉</span>配方与价格<i>{drinks.length}</i></button><button className={tab==="backup"?"active":""} onClick={()=>setTab("backup")}><span>⇩</span>迁移备份<i>1</i></button></nav>
      <div className="admin-user"><span>V</span><p><b>{userName}</b><small>主理人</small></p><a href="/api/auth/logout">退出</a></div>
    </aside>
    <section className="admin-main">
      <header><div><span className="admin-kicker">VINCENT’S HOMEBAR</span><h1>{tab==="today"?"今晚能调什么":tab==="orders"?"今晚的订单":tab==="menu"?"配方与价格":"网站迁移备份"}</h1><p>{tab==="today"?"录入现有材料，匹配后发布到顾客点单页。":tab==="orders"?"更新状态后，顾客的订单进度会同步变化。":tab==="menu"?"新增配方或修改售价，保存后立即生效。":"将线上数据与后台上传图片完整下载到私人设备。"}</p></div><a href="/" target="_blank">打开顾客端 ↗</a></header>
      <div className="admin-stats"><article><span>顾客端已上架</span><strong>{today.publishedIds.length}</strong><small>款</small></article><article><span>待处理订单</span><strong>{openOrders.length}</strong><small>笔</small></article><article><span>今日订单金额</span><strong>¥{revenue}</strong><small>不含取消</small></article><article><span>配方数据库</span><strong>{drinks.length}</strong><small>款</small></article></div>

      {tab==="today" && <div className="today-workspace">
        <section className="admin-panel ingredient-manager"><div className="panel-title"><div><h2>01 · 上传今日材料</h2><span>新材料会置顶保存；自定义材料可随时删除</span></div><b>{ingredients.length} 种已选 · {today.ingredientOptions.length} 种候选</b></div><div className="ingredient-options">{today.ingredientOptions.map((item)=><div key={item.name} className={`ingredient-option ${ingredients.includes(item.name)?"selected":""}`}><button className="ingredient-toggle" onClick={()=>toggleIngredient(item.name)}><span>{ingredients.includes(item.name)?"✓":"＋"}</span>{item.name}<small>{item.custom?"自定义材料":`${item.count} 款使用`}</small></button>{item.custom&&<button className="ingredient-delete" disabled={busy===`delete:${item.name}`} onClick={()=>void deleteIngredient(item.name)} aria-label={`删除候选材料${item.name}`}>×</button>}</div>)}</div><div className="custom-material"><input value={customIngredient} onChange={(event)=>setCustomIngredient(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter"){event.preventDefault();void addIngredient();}}} placeholder="输入其他材料，如：桂花乌龙"/><button disabled={busy==="ingredient"} onClick={()=>void addIngredient()}>{busy==="ingredient"?"保存中":"加入"}</button><button className="match-button" disabled={busy==="match"||ingredients.length===0} onClick={matchMenu}>{busy==="match"?"正在匹配…":"匹配可调酒单 →"}</button></div></section>
        <section className="admin-panel match-manager"><div className="panel-title"><div><h2>02 · 确认可调酒单</h2><span>已检查全部 {today.matches.length} 款 · {readyMatches.length} 款材料齐全 · {oneMissingMatches.length} 款缺1项 · {farMatches.length} 款缺2项以上</span></div><button className="publish-button" disabled={busy==="publish"||selectedIds.length===0} onClick={publishMenu}>{busy==="publish"?"正在同步…":`同步 ${selectedIds.length} 款至顾客端`}</button></div>{today.matches.length===0?<div className="admin-empty">选好今日材料后，点击“匹配可调酒单”</div>:<><div className="match-subtitle"><b>现在可以调 · {readyMatches.length} 款</b><span>已自动全部选中，可取消不想上架的酒</span></div>{readyMatches.length>0?<div className="match-grid">{readyMatches.map((drink)=><button key={drink.id} className={selectedIds.includes(drink.id)?"selected":""} onClick={()=>setSelectedIds((ids)=>ids.includes(drink.id)?ids.filter((id)=>id!==drink.id):[...ids,drink.id])}><img src={drink.image} alt=""/><span><b>{drink.name}</b><small>{drink.ingredients.join(" · ")}</small></span><strong>¥{drink.price}</strong><i>{selectedIds.includes(drink.id)?"✓":"＋"}</i></button>)}</div>:<div className="match-empty">暂时没有材料齐全的酒款</div>}{oneMissingMatches.length>0&&<><div className="match-subtitle muted"><b>还缺1项 · {oneMissingMatches.length} 款</b><span>补齐这一项即可调制</span></div><div className="near-grid">{oneMissingMatches.map((drink)=><div key={drink.id}><b>{drink.name}</b><span>还缺：{drink.missing.join("、")}</span></div>)}</div></>}{farMatches.length>0&&<details className="far-matches"><summary><span><b>缺2项以上 · {farMatches.length} 款</b><small>展开查看酒单库中其余全部酒款</small></span><i>＋</i></summary><div className="near-grid">{farMatches.map((drink)=><div key={drink.id}><b>{drink.name}</b><small>已匹配 {drink.matchedCount}/{drink.ingredients.length} 项</small><span>还缺：{drink.missing.join("、")}</span></div>)}</div></details>}</>}</section>
        <section className="admin-panel featured-manager"><div className="panel-title"><div><h2>03 · 主理人推荐</h2><span>从已上架酒单中选择 3–5 款，展示在顾客端顶部</span></div><button className="publish-button" disabled={busy==="feature"||today.published.length===0} onClick={saveFeatured}>{busy==="feature"?"保存中…":`保存 ${featuredIds.length} 款推荐`}</button></div>{today.published.length===0?<div className="admin-empty">请先同步今日酒单，再设置主理人推荐</div>:<div className="featured-admin-grid">{today.published.map((drink)=><button key={drink.id} className={featuredIds.includes(drink.id)?"selected":""} onClick={()=>toggleFeatured(drink.id)}><img src={drink.image} alt=""/><span><b>{drink.name}</b><small>{drink.taste}</small></span><i>{featuredIds.includes(drink.id)?"★":"☆"}</i></button>)}</div>}</section>
      </div>}

      {tab==="orders" && <div className="admin-panel"><div className="panel-title"><div><h2>订单队列</h2><span>每 15 秒自动刷新 · 点击酒款查看配方与制作方法</span></div><button onClick={refresh}>刷新</button></div>{orders.length===0?<div className="admin-empty">今晚还没有新订单</div>:<div className="orders-table">{orders.map((order)=><article className={`order-row ${order.status}`} key={order.id}><div className="order-code"><span>{statusText[order.status]}</span><strong>#{order.code}</strong><small>{new Date(order.createdAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})} · {order.tableName}</small></div><div className="order-items">{order.items.map((item,index)=>{const drink=drinkById.get(item.id);return <button key={`${item.id}-${index}`} disabled={!drink} onClick={()=>drink&&openRecipe(drink)} aria-label={drink?`查看${item.name}配方`:`${item.name}配方不可用`}><span>{item.name}<small>¥{item.price}</small></span><i>{drink?"查看配方 →":"配方不可用"}</i></button>})}</div><strong className="order-total">¥{order.total}</strong><select aria-label="订单状态" disabled={busy===order.id} value={order.status} onChange={(event)=>updateStatus(order.id,event.target.value)}>{Object.entries(statusText).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></article>)}</div>}</div>}

      {tab==="menu" && <div className="menu-admin-stack"><details className="admin-panel upload-recipe"><summary><span><b>新增酒款与配方</b><small>支持上传图片、配方和售价</small></span><i>＋</i></summary><form onSubmit={uploadCocktail}><div className="upload-fields"><label>中文酒名<input name="name" required/></label><label>英文名<input name="englishName"/></label><label>来源酒吧<input name="bar" placeholder="例如：VHB 原创"/></label><label>城市<input name="city" placeholder="深圳"/></label><label>售价<input name="price" type="number" min="0" defaultValue="58"/></label><label>风味<input name="taste" placeholder="清爽 · 柑橘"/></label><label className="wide">材料（用顿号或逗号分隔）<textarea name="ingredients" required/></label><label className="wide">配方（每行一步）<textarea name="recipe" required/></label><label className="wide file-field">酒款图片<input name="image" type="file" accept="image/*"/></label></div><button className="upload-submit" disabled={busy==="upload"}>{busy==="upload"?"正在上传…":"加入配方库"}</button></form></details><div className="admin-panel"><div className="panel-title"><div><h2>全部配方与售价</h2><span>共 {filteredDrinks.length} 款 · 点击酒名查看完整配方</span></div><label className="admin-search">⌕<input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="搜索酒名或酒吧"/></label></div><div className="drinks-table"><div className="drink-row heading"><span>酒名</span><span>来源</span><span>类型</span><span>售价</span><span>操作</span></div>{filteredDrinks.map((drink)=><PriceRow key={drink.id} drink={drink} busy={busy===drink.id} onSave={updatePrice} onOpen={openRecipe}/>)}</div></div></div>}

      {tab==="backup" && <div className="backup-workspace">
        <section className="admin-panel backup-card"><div className="backup-icon">⇩</div><div className="backup-copy"><span className="admin-kicker">FULL MIGRATION BACKUP</span><h2>一键下载完整迁移包</h2><p>备份包含全部酒款与配方、价格、今日材料、候选材料、已发布酒单、订单、用户记录，以及通过后台上传的原始图片。</p><div className="backup-items"><span><i>✓</i><b>{drinks.length}</b> 款配方</span><span><i>✓</i><b>{orders.length}</b> 笔订单</span><span><i>✓</i>今日材料与发布状态</span><span><i>✓</i>后台上传图片原文件</span></div><button className="backup-download" disabled={busy==="backup"} onClick={()=>void downloadBackup()}>{busy==="backup"?"正在生成迁移包…":"生成并下载迁移备份"}<span>JSON ↓</span></button><small>文件中包含顾客及订单信息，请仅保存在你的私人设备或加密云盘，不要发送到群聊。</small></div></section>
        <section className="admin-panel backup-guide"><div className="panel-title"><div><h2>迁移时怎么使用</h2><span>保留这个文件，个人账号新网站建立后用于恢复</span></div></div><ol><li><i>01</i><div><b>下载并检查文件</b><span>文件名以 VHB-migration-backup 开头，建议保留两份副本。</span></div></li><li><i>02</i><div><b>复制网站源码</b><span>迁移包保存线上数据；网站页面与本地图片需要随项目文件一起复制。</span></div></li><li><i>03</i><div><b>个人账号重新发布</b><span>创建新的 Sites 网站后，再把这个迁移包导入新的数据库和图片空间。</span></div></li></ol></section>
      </div>}
    </section>
    {activeRecipe&&activeRecipeParts&&<div className="recipe-detail-overlay" role="dialog" aria-modal="true" aria-label={`${activeRecipe.name}配方详情`} onMouseDown={(event)=>event.target===event.currentTarget&&closeRecipe()}><article className={`recipe-detail-card ${isEditingRecipe?"editing":""}`}><button className="close" onClick={closeRecipe} aria-label="关闭配方详情">×</button><div className="recipe-detail-photo"><img src={activeRecipe.image} alt={activeRecipe.name}/><span>{activeRecipe.category==="classic"?"经典鸡尾酒":activeRecipe.category==="topbar"?"TOP 酒吧酒单":"VHB 原创"}</span></div>{isEditingRecipe?<RecipeEditForm key={activeRecipe.id} drink={activeRecipe} busy={busy===`edit-drink:${activeRecipe.id}`} onCancel={()=>setIsEditingRecipe(false)} onSave={(draft,image)=>void updateCocktail(activeRecipe,draft,image)}/>:<div className="recipe-detail-body"><header><span className="admin-kicker">RECIPE DETAIL</span><h2>{activeRecipe.name}</h2><p>{activeRecipe.englishName}</p></header><div className="recipe-facts"><span>{activeRecipe.bar}</span><span>{activeRecipe.city}</span><span>{activeRecipe.taste}</span><span>{activeRecipe.strength}</span><span>{activeRecipe.minutes} 分钟</span></div>{activeRecipe.story&&<p className="recipe-story">{activeRecipe.story}</p>}<div className="recipe-columns"><section><h3>配方用量</h3><ul>{activeRecipeParts.measures.map((item,index)=><li key={`${item}-${index}`}><i>{String(index+1).padStart(2,"0")}</i><span>{item}</span></li>)}</ul></section><section><h3>标准制作方式</h3><ol>{activeRecipeParts.steps.map((step,index)=><li key={`${step}-${index}`}><i>{index+1}</i><span>{step}</span></li>)}</ol></section></div><footer>{activeRecipe.sourceUrl?<a href={activeRecipe.sourceUrl} target="_blank" rel="noreferrer">查看配方来源 ↗</a>:<span>VHB 配方数据库</span>}{tab==="menu"&&<div className="recipe-admin-actions"><button className="edit-recipe" onClick={()=>setIsEditingRecipe(true)}>修改配方</button><button className="delete-recipe" disabled={busy===`delete-drink:${activeRecipe.id}`} onClick={()=>void deleteCocktail(activeRecipe)}>{busy===`delete-drink:${activeRecipe.id}`?"正在删除…":"删除该配方"}</button></div>}</footer></div>}</article></div>}
    {notice&&<div className="admin-notice">{notice}</div>}
  </main>;
}

function PriceRow({drink,busy,onSave,onOpen}:{drink:Drink;busy:boolean;onSave:(id:string,price:number)=>void;onOpen:(drink:Drink)=>void}) {
  const [price,setPrice]=useState(drink.price);
  return <div className="drink-row"><button className="drink-name-button" onClick={()=>onOpen(drink)}><b>{drink.name}</b><small>{drink.englishName}</small></button><span>{drink.bar}</span><span><i className={drink.category}>{drink.category==="classic"?"经典":drink.category==="topbar"?"TOP 酒吧":"原创"}</i></span><span className="price-input">¥<input type="number" min="0" value={price} onChange={(event)=>setPrice(Number(event.target.value))}/></span><div className="drink-actions"><button className="detail-button" onClick={()=>onOpen(drink)}>查看</button><button disabled={busy||price===drink.price} onClick={()=>onSave(drink.id,price)}>{busy?"保存中":"保存"}</button></div></div>;
}

function RecipeEditForm({drink,busy,onCancel,onSave}:{drink:Drink;busy:boolean;onCancel:()=>void;onSave:(draft:RecipeDraft,image:File|null)=>void}) {
  const parts=splitRecipe(drink);
  const [draft,setDraft]=useState({name:drink.name,englishName:drink.englishName,bar:drink.bar,city:drink.city,sourceUrl:drink.sourceUrl||"",story:drink.story,taste:drink.taste,strength:drink.strength,minutes:drink.minutes,price:drink.price});
  const [materials,setMaterials]=useState(drink.ingredients.map((ingredient,index)=>({ingredient,measure:parts.measures[index]||ingredient})));
  const [steps,setSteps]=useState(parts.steps.length?parts.steps:[""]);
  const [imageFile,setImageFile]=useState<File|null>(null);
  const [imagePreview,setImagePreview]=useState(drink.image);
  useEffect(()=>()=>{if(imagePreview.startsWith("blob:"))URL.revokeObjectURL(imagePreview);},[imagePreview]);
  function changeField(field:keyof typeof draft,value:string|number){setDraft((current)=>({...current,[field]:value}));}
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();onSave({...draft,ingredients:materials.map((item)=>item.ingredient.trim()),measures:materials.map((item)=>item.measure.trim()),steps:steps.map((step)=>step.trim())},imageFile);}
  function chooseImage(file:File|null){setImageFile(file);setImagePreview(file?URL.createObjectURL(file):drink.image);}
  return <form className="recipe-edit-form" onSubmit={submit}><header><span className="admin-kicker">EDIT RECIPE</span><h2>修改配方</h2><p>保存后将同步更新材料匹配、后台订单配方与顾客端酒单。</p></header><div className="recipe-edit-fields"><label className="wide recipe-image-field"><span>酒款图片</span><div><img src={imagePreview} alt="酒款图片预览"/><p><b>{imageFile?"已选择新图片":"当前酒款图片"}</b><small>{imageFile?`${imageFile.name} · ${(imageFile.size/1024/1024).toFixed(1)}MB`:"选择新图片后，保存时会替换原图"}</small><i>{imageFile?"重新选择图片":"更换图片"}<input type="file" accept="image/*" onChange={(event)=>chooseImage(event.target.files?.[0]||null)}/></i></p></div></label><label>中文酒名<input required value={draft.name} onChange={(event)=>changeField("name",event.target.value)}/></label><label>英文名<input value={draft.englishName} onChange={(event)=>changeField("englishName",event.target.value)}/></label><label>来源酒吧<input value={draft.bar} onChange={(event)=>changeField("bar",event.target.value)}/></label><label>城市<input value={draft.city} onChange={(event)=>changeField("city",event.target.value)}/></label><label>风味<input value={draft.taste} onChange={(event)=>changeField("taste",event.target.value)}/></label><label>酒精度描述<input value={draft.strength} onChange={(event)=>changeField("strength",event.target.value)}/></label><label>制作时间（分钟）<input required type="number" min="1" max="120" value={draft.minutes} onChange={(event)=>changeField("minutes",Number(event.target.value))}/></label><label>售价<input required type="number" min="0" max="9999" value={draft.price} onChange={(event)=>changeField("price",Number(event.target.value))}/></label><label className="wide">配方来源链接<input type="url" value={draft.sourceUrl} onChange={(event)=>changeField("sourceUrl",event.target.value)}/></label><label className="wide">酒款故事<textarea value={draft.story} onChange={(event)=>changeField("story",event.target.value)}/></label></div><section className="recipe-edit-section"><div className="recipe-edit-heading"><div><h3>材料与用量</h3><small>材料名称用于匹配今日库存；每项都要填写对应用量。</small></div><button type="button" onClick={()=>setMaterials((items)=>[...items,{ingredient:"",measure:""}])}>＋ 添加材料</button></div><div className="recipe-edit-list material-list">{materials.map((item,index)=><div key={index}><i>{String(index+1).padStart(2,"0")}</i><input aria-label={`第${index+1}项材料名称`} required placeholder="材料名称" value={item.ingredient} onChange={(event)=>setMaterials((items)=>items.map((entry,itemIndex)=>itemIndex===index?{...entry,ingredient:event.target.value}:entry))}/><input aria-label={`第${index+1}项材料用量`} required placeholder="例如：金酒 45ml" value={item.measure} onChange={(event)=>setMaterials((items)=>items.map((entry,itemIndex)=>itemIndex===index?{...entry,measure:event.target.value}:entry))}/><button type="button" aria-label={`删除第${index+1}项材料`} disabled={materials.length===1} onClick={()=>setMaterials((items)=>items.filter((_,itemIndex)=>itemIndex!==index))}>×</button></div>)}</div></section><section className="recipe-edit-section"><div className="recipe-edit-heading"><div><h3>标准制作方式</h3><small>按实际出杯顺序逐步填写，保存后订单详情会同步更新。</small></div><button type="button" onClick={()=>setSteps((items)=>[...items,""])}>＋ 添加步骤</button></div><div className="recipe-edit-list step-list">{steps.map((step,index)=><div key={index}><i>{index+1}</i><textarea aria-label={`第${index+1}个制作步骤`} required value={step} onChange={(event)=>setSteps((items)=>items.map((entry,itemIndex)=>itemIndex===index?event.target.value:entry))}/><button type="button" aria-label={`删除第${index+1}个制作步骤`} disabled={steps.length===1} onClick={()=>setSteps((items)=>items.filter((_,itemIndex)=>itemIndex!==index))}>×</button></div>)}</div></section><footer><button type="button" className="recipe-edit-cancel" disabled={busy} onClick={onCancel}>取消</button><button className="recipe-edit-save" disabled={busy}>{busy?"正在保存…":"保存并同步更新"}</button></footer></form>;
}
