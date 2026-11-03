"use client";
import {useEffect,useState} from "react";
import {type PublicListing} from "@/components/cards/ListingCard";
import {HomeListingCarousel} from "@/components/home/HomeListingCarousel";
const KEY="axion_recently_viewed";
export function RecentlyViewed({listings}:{listings:PublicListing[]}){
 const [ids,setIds]=useState<string[]>([]);
 useEffect(()=>{
  const update=()=>{try{const value:unknown=JSON.parse(localStorage.getItem(KEY)??"[]");setIds(Array.isArray(value)?value.filter((id):id is string=>typeof id==="string").slice(0,15):[]);}catch{setIds([]);}};
  queueMicrotask(update);window.addEventListener("axion:recent-updated",update);window.addEventListener("storage",update);
  return()=>{window.removeEventListener("axion:recent-updated",update);window.removeEventListener("storage",update);};
 },[]);
 const byId=new Map(listings.map(listing=>[listing.id,listing]));
 const items=ids.map(id=>byId.get(id)).filter((item):item is PublicListing=>item!==undefined);
 if(items.length===0)return null;
 return <section className="mx-auto mt-12 w-full max-w-7xl px-4 pb-10"><h2 className="mb-5 text-2xl font-bold">Недавно просмотренные</h2><HomeListingCarousel listings={items.slice(0,15)} label="Недавно просмотренные" /></section>;
}
