"use client";
import {useEffect} from "react";
export function RecordView({id}:{id:string}){
 useEffect(()=>{try{
 const key="axion_recently_viewed";
 const value:unknown=JSON.parse(localStorage.getItem(key)??"[]");
 const old=Array.isArray(value)?value.filter((entry):entry is string=>typeof entry==="string"):[];
 localStorage.setItem(key,JSON.stringify([id,...old.filter(item=>item!==id)].slice(0,15)));
 window.dispatchEvent(new Event("axion:recent-updated"));
 }catch{/* Local history is optional when storage is blocked. */}},[id]);
 return null;
}
