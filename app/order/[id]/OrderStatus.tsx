/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";

type Order = { id:string;code:string;tableName:string;items:Array<{id:string;name:string;price:number}>;total:number;status:string;createdAt:number };
const stages = ["new","making","ready","completed"];
const labels:Record<string,string> = {new:"已接单",making:"调制中",ready:"可以取酒",completed:"已完成",cancelled:"已取消"};

export default function OrderStatus({id}:{id:string}) {
  const [order,setOrder] = useState<Order|null>(null);
  const [error,setError] = useState("");
  useEffect(() => {
    let active=true;
    async function load(){const response=await fetch(`/api/orders?id=${encodeURIComponent(id)}`);const data=await response.json();if(!active)return;if(response.ok)setOrder(data.order);else setError(data.error||"查询失败");}
    load();const timer=window.setInterval(load,10000);return()=>{active=false;window.clearInterval(timer)};
  },[id]);
  if (error) return <main className="status-page"><a className="status-logo" href="/"><img src="/vhb-logo.png" alt="VHB"/></a><section><h1>没有找到这笔点单</h1><p>{error}</p><a className="status-home" href="/">返回酒单</a></section></main>;
  if (!order) return <main className="status-page"><a className="status-logo" href="/"><img src="/vhb-logo.png" alt="VHB"/></a><section><p>正在读取点单状态…</p></section></main>;
  const current = stages.indexOf(order.status);
  return <main className="status-page"><a className="status-logo" href="/"><img src="/vhb-logo.png" alt="VHB"/></a><section><span className="eyebrow">点单进度 · 自动更新</span><h1>取单号 {order.code}</h1><p className="status-lead">{order.status==="cancelled"?"这笔订单已取消":labels[order.status]}</p><div className="status-track">{stages.map((stage,index)=><div className={order.status!=="cancelled"&&index<=current?"active":""} key={stage}><span>{index<current?"✓":index+1}</span><b>{labels[stage]}</b></div>)}</div><div className="status-order"><header><span>{order.tableName}</span><small>{new Date(order.createdAt).toLocaleString("zh-CN")}</small></header>{order.items.map((item,index)=><p key={`${item.id}-${index}`}><span>{item.name}</span><b>¥{item.price}</b></p>)}<footer><span>合计</span><strong>¥{order.total}</strong></footer></div><small className="status-note">页面每 10 秒自动更新。主理人把状态改为“可取酒”后，这里会同步显示。</small><a className="status-home" href="/">继续看酒单</a></section></main>;
}
